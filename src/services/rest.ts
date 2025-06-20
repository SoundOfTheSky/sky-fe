import { TSchema } from '@sinclair/typebox'
import { TypeCheck } from '@sinclair/typebox/compiler'
import { JSONSerializable, UUID } from '@softsky/utils'
import { untrack } from 'solid-js'

import { TableDefaults } from '@/sky-shared/database'
import { TypeCheckerError } from '@/sky-shared/type-checker'

import authStore from './auth.store'
import basicStore from './basic.store'
import { database, DBOptions } from './database/local'
import { CommonRequestOptions, request, RequestError } from './fetch'

export type RESTBody = JSONSerializable & TableDefaults
export type RESTItemIDBRequestOptions = CommonRequestOptions & {
  ignoreDB?: boolean
}
// export type RESTItemIDBRequestOptionsWithQuery<T extends keyof DBOptions, INDEX extends keyof DBOptions[T]['indexes']> = RESTItemIDBRequestOptions & {
//   dbquery?: DBOptions[T]['key'] | (INDEX?{
//     index: INDEX
//     value: DBOptions[T]['indexes'][INDEX]
//   }:undefined)
// }

export type RESTItemIDBRequestOptionsWithQuery<T extends keyof DBOptions> =
  RESTItemIDBRequestOptions & {
    dbquery?:
      | { index: 'key'; value: DBOptions[T]['key'] | IDBKeyRange }
      | (DBOptions[T] extends { indexes: infer INDEXES }
          ? {
              [K in keyof INDEXES]: {
                index: K
                value: INDEXES[K] | IDBKeyRange
              }
            }[keyof INDEXES]
          : never)
  }

export class RESTEndpoint<T extends RESTBody, B extends RESTItem<T>> {
  public ignoredDTOFields = ['id', 'created', 'updated', 'user_id']

  public constructor(
    public url: string,
    public builder: new (data: T) => B,
    public typeChecker: TypeCheck<TSchema>,
  ) {}

  public async getById(id: number, options?: CommonRequestOptions) {
    return new this.builder(await request<T>(`${this.url}/${id}`, options))
  }

  public getAll(options?: CommonRequestOptions): Promise<B[]> {
    return request<T[]>(this.url, options).then((items) =>
      items.map((item) => new this.builder(item)),
    )
  }

  public async delete(id: number, options?: CommonRequestOptions) {
    await request(`${this.url}/${id}`, {
      method: 'DELETE',
      ...options,
    })
    return this
  }
}

/** Rules to create IDB endpoints:
 * 1. If ignoreDB don't queue and don't save to DB
 * 2. If `untrack(syncStore.status) !== SYNC_STATUS.SYNCHED` then don't queue DB
 * 3. Search DB, if found output without query
 * 4. Request unless third
 * 5. Save to DB unless first
 *
 * For example look at implementation of existing methods
 */
export class RESTEndpointIDB<
  T extends RESTBody,
  B extends RESTItemIDB<T, IDB>,
  IDB extends keyof DBOptions,
> extends RESTEndpoint<T, B> {
  public constructor(
    url: string,
    builder: new (data: T) => B,
    typeChecker: TypeCheck<TSchema>,
    public idb: IDB,
  ) {
    super(url, builder, typeChecker)
  }

  public async getById(id: number, options?: RESTItemIDBRequestOptions) {
    const databaseItem = options?.ignoreDB
      ? undefined
      : ((await database.get(this.idb, id)) as T)
    if (databaseItem) return new this.builder(databaseItem)
    const item = await request<T>(`${this.url}/${id}`, options)
    if (!options?.ignoreDB) await database.put(this.idb, item)
    return new this.builder(item)
  }

  public async getAll(
    options?: RESTItemIDBRequestOptionsWithQuery<IDB>,
  ): Promise<B[]> {
    if (!untrack(basicStore.online) && !options?.ignoreDB) {
      const databaseQuery =
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        options?.dbquery && options.dbquery.index !== 'key'
          ? database.getAllFromIndex(
              this.idb,
              options.dbquery.index,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
              options.dbquery.value as any,
            )
          : database.getAll(this.idb, options?.dbquery?.value)
      return databaseQuery.then((items) =>
        items.map((item) => new this.builder(item as T)),
      )
    }
    return request<T[]>(this.url, options).then((items) =>
      Promise.all(
        items.map(async (item) => {
          if (!options?.ignoreDB) await database.put(this.idb, item)
          return new this.builder(item)
        }),
      ),
    )
  }

  public async delete(id: number, options?: RESTItemIDBRequestOptions) {
    try {
      if (!untrack(basicStore.online)) throw new Error('Not online')
      await request(`${this.url}/${id}`, {
        method: 'DELETE',
        ...options,
      })
    } catch (error) {
      if (
        options?.ignoreDB ||
        (error instanceof RequestError && error.code !== 0)
      )
        throw error
      await database.add(
        'offlineTasksQueue',
        id,
        `${UUID()}_${this.idb}_delete`,
      )
    }
    if (!options?.ignoreDB) await database.delete(this.idb, id)
    return this
  }

  public async syncIDB(options: {
    checkIfAborted: () => void
    onProgress: (p: number) => unknown
    onItem?: (index: B) => unknown
    required?: Set<number>
  }) {
    const lastUpdateKey = `lastUpdate_${this.idb}`
    const lastUpdate =
      ((await database.get('keyval', lastUpdateKey)) as number | undefined) ?? 0
    const items = await request<T[]>(this.url, {
      query: {
        'updated>': lastUpdate.toString(),
      },
    })
    // If user stops midway we can continue from lastUpdateKey
    items.sort(
      (a, b) => new Date(a.updated).getTime() - new Date(b.updated).getTime(),
    )
    for (let index = 0; index < items.length; index++) {
      options.checkIfAborted()
      const item = items[index]!
      if (options.required && !options.required.has(item.id)) continue
      await database.put(this.idb, item)
      options.onProgress(index / items.length)
      options.onItem?.(new this.builder(item))
      // Checkpoint every 1000 items
      if (index % 1000 === 0 || index === items.length - 1)
        await database.put(
          'keyval',
          ~~(new Date(item.updated).getTime() / 1000) - 1,
          lastUpdateKey,
        )
    }
    if (items.length > 0)
      await database.put(
        'keyval',
        ~~(new Date(items.at(-1)!.updated).getTime() / 1000),
        lastUpdateKey,
      )
    options.onProgress(1)
  }

  public async clearIDB() {
    await database.clear(this.idb)
    await database.delete('keyval', `lastUpdate_${this.idb}`)
  }
}

export class RESTItem<T extends RESTBody> {
  protected endpoint!: RESTEndpoint<T, RESTItem<T>>

  public get id() {
    return this.data.id
  }

  public get updated() {
    return new Date(this.data.updated)
  }

  public get created() {
    return new Date(this.data.created)
  }

  public constructor(public data: T) {}

  public async refresh(options?: CommonRequestOptions) {
    this.data = await request<T>(
      `${this.endpoint.url}/${this.data.id}`,
      options,
    )
    return this
  }

  public async create(options?: CommonRequestOptions) {
    if (this.data.id > 0) throw new Error('Item already exist')
    this.typeCheck()
    this.data = await request<T>(this.endpoint.url, {
      method: 'POST',
      body: this.toDTO(),
      ...options,
    })
    return this
  }

  public async update(options?: CommonRequestOptions) {
    this.typeCheck()
    this.data = await request<T>(`${this.endpoint.url}/${this.data.id}`, {
      method: 'PUT',
      body: this.toDTO(),
      ...options,
    })
    return this
  }

  public async delete(options?: CommonRequestOptions) {
    await this.endpoint.delete(this.data.id, options)
    return this
  }

  public typeCheck() {
    if (!this.endpoint.typeChecker.Check(this.data))
      throw new TypeCheckerError(this.endpoint.typeChecker.Errors(this.data))
    return this
  }

  public toDTO() {
    const dto = structuredClone(this.data) as Record<string, unknown>
    for (const key of this.endpoint.ignoredDTOFields) delete dto[key]
    return dto
  }
}

export class RESTItemIDB<
  T extends RESTBody,
  IDB extends keyof DBOptions,
> extends RESTItem<T> {
  declare public endpoint: RESTEndpointIDB<T, RESTItemIDB<T, IDB>, IDB>

  public async refresh(options?: RESTItemIDBRequestOptions) {
    this.data = await request<T>(
      `${this.endpoint.url}/${this.data.id}`,
      options,
    )
    if (!options?.ignoreDB) await database.add(this.endpoint.idb, this.data)
    return this
  }

  public async create(options?: RESTItemIDBRequestOptions) {
    if (this.data.id > 0) throw new Error('Item already exist')
    this.typeCheck()
    try {
      if (!untrack(basicStore.online)) throw new Error('Not online')
      const origId = this.data.id
      this.data = await request<T>(this.endpoint.url, {
        method: 'POST',
        body: this.toDTO(),
        ...options,
      })
      await database.delete(this.endpoint.idb, origId)

      // Update offline queue with new id
      for (const key of await database.getAllKeys('offlineTasksQueue')) {
        if (typeof key !== 'string') continue
        const task = await database.get('offlineTasksQueue', key)
        if (key.endsWith(`_${this.endpoint.idb}_update`)) {
          ;(task as RESTBody).id = this.data.id
          await database.put('offlineTasksQueue', this.data, key)
        } else if (key.endsWith(`_${this.endpoint.idb}_delete`))
          await database.put('offlineTasksQueue', this.data.id, key)
      }
    } catch (error) {
      if (
        options?.ignoreDB ||
        (error instanceof RequestError && error.code !== 0)
      )
        throw error
      this.data.id = -UUID()
      await database.add(
        'offlineTasksQueue',
        this.data,
        `${UUID()}_${this.endpoint.idb}_create`,
      )
    }
    if (!options?.ignoreDB) await database.add(this.endpoint.idb, this.data)
    return this
  }

  public async update(options?: RESTItemIDBRequestOptions) {
    this.typeCheck()
    try {
      if (!untrack(basicStore.online)) throw new Error('Not online')
      this.data = await request<T>(`${this.endpoint.url}/${this.data.id}`, {
        method: 'PUT',
        body: this.toDTO(),
        ...options,
      })
    } catch (error) {
      if (
        options?.ignoreDB ||
        (error instanceof RequestError && error.code !== 0)
      )
        throw error
      await database.add(
        'offlineTasksQueue',
        this.data,
        `${UUID()}_${this.endpoint.idb}_update`,
      )
    }
    if (!options?.ignoreDB) await database.put(this.endpoint.idb, this.data)
    return this
  }

  public async delete(options?: RESTItemIDBRequestOptions) {
    await this.endpoint.delete(this.data.id, options)
    return this
  }
}

export function getDefaultRestFields() {
  return {
    id: -UUID(),
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    userId: authStore.me()?.id ?? 0,
  }
}
