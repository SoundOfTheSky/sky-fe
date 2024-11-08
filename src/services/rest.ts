import { TSchema } from '@sinclair/typebox';
import { TypeCheck } from '@sinclair/typebox/compiler';
import { untrack } from 'solid-js';

import { TableDefaults } from '@/sky-shared/db';
import { JSONSerializable, UUID } from 'sky-utils';

import { TypeCheckerError } from '@/sky-shared/type-checker';
import authStore from './auth.store';
import basicStore from './basic.store';
import { db, DBOptions } from './db';
import { CommonRequestOptions, request, RequestError } from './fetch';
import syncStore, { SYNC_STATUS } from './sync.store';

export type RESTBody = JSONSerializable & TableDefaults;
export type RESTItemIDBRequestOptions = CommonRequestOptions & {
  ignoreDB?: boolean;
  dbquery?: string | number | IDBKeyRange | null | undefined;
};

export class RESTEndpoint<T extends RESTBody, B extends RESTItem<T>> {
  public ignoredDTOFields = ['id', 'created', 'updated', 'user_id'];

  public constructor(
    public url: string,
    public builder: new (data: T) => B,
    public typeChecker: TypeCheck<TSchema>,
  ) {}

  public async get(id: number, options?: CommonRequestOptions) {
    return new this.builder(await request<T>(`${this.url}/${id}`, options));
  }

  public getAll(options?: CommonRequestOptions): Promise<B[]> {
    return request<T[]>(this.url, options).then((items) =>
      items.map((item) => new this.builder(item)),
    );
  }

  public async delete(id: number, options?: CommonRequestOptions) {
    await request(`${this.url}/${id}`, {
      method: 'DELETE',
      ...options,
    });
    return this;
  }
}

export class RESTEndpointIDB<
  T extends RESTBody,
  B extends RESTItemIDB<T>,
> extends RESTEndpoint<T, B> {
  public constructor(
    url: string,
    builder: new (data: T) => B,
    typeChecker: TypeCheck<TSchema>,
    public idb: keyof DBOptions,
  ) {
    super(url, builder, typeChecker);
  }

  public async get(id: number, options?: RESTItemIDBRequestOptions) {
    const dbItem =
      options?.ignoreDB || untrack(syncStore.status) !== SYNC_STATUS.SYNCHED
        ? undefined
        : ((await db.get(this.idb, id)) as T);
    if (dbItem) return new this.builder(dbItem);
    const item = await request<T>(`${this.url}/${id}`, options);
    if (!options?.ignoreDB) await db.put(this.idb, item);
    return new this.builder(item);
  }

  public async getAll(options?: RESTItemIDBRequestOptions): Promise<B[]> {
    if (
      !untrack(basicStore.online) &&
      !options?.ignoreDB &&
      untrack(syncStore.status) === SYNC_STATUS.SYNCHED
    )
      return db
        .getAll(this.idb, options?.dbquery)
        .then((items) => items.map((item) => new this.builder(item as T)));
    return request<T[]>(this.url, options).then((items) =>
      Promise.all(
        items.map(async (item) => {
          if (!options?.ignoreDB) await db.put(this.idb, item);
          return new this.builder(item);
        }),
      ),
    );
  }

  public async delete(id: number, options?: RESTItemIDBRequestOptions) {
    try {
      if (!untrack(basicStore.online)) throw new Error();
      await request(`${this.url}/${id}`, {
        method: 'DELETE',
        ...options,
      });
    } catch (e) {
      if (options?.ignoreDB || (e instanceof RequestError && e.code !== 0))
        throw e;
      await db.add('offlineTasksQueue', id, `${UUID()}_${this.idb}_delete`);
    }
    if (!options?.ignoreDB) await db.delete(this.idb, id);
    return this;
  }

  public async syncIDB(options: {
    checkIfAborted: () => void;
    onProgress: (p: number) => unknown;
    onItem?: (i: B) => unknown;
    required?: Set<number>;
  }) {
    const lastUpdateKey = `lastUpdate_${this.idb}`;
    const lastUpdate =
      ((await db.get('keyval', lastUpdateKey)) as number | undefined) ?? 0;
    const items = await request<T[]>(this.url, {
      query: {
        'updated>': lastUpdate.toString(),
      },
    });
    // If user stops midway we can continue from lastUpdateKey
    items.sort(
      (a, b) => new Date(a.updated).getTime() - new Date(b.updated).getTime(),
    );
    for (let i = 0; i < items.length; i++) {
      options.checkIfAborted();
      const item = items[i]!;
      if (options.required && !options.required.has(item.id)) continue;
      await db.put(this.idb, item);
      options.onProgress(i / items.length);
      options.onItem?.(new this.builder(item));
      // Checkpoint every 1000 items
      if (i % 1000 === 0 || i === items.length - 1)
        await db.put(
          'keyval',
          ~~(new Date(item.updated).getTime() / 1000) - 1,
          lastUpdateKey,
        );
    }
    if (items.length !== 0)
      await db.put(
        'keyval',
        ~~(new Date(items.at(-1)!.updated).getTime() / 1000),
        lastUpdateKey,
      );
    options.onProgress(1);
  }
}

export class RESTItem<T extends RESTBody> {
  protected endpoint!: RESTEndpoint<T, RESTItem<T>>;

  public get id() {
    return this.data.id;
  }

  public get updated() {
    return new Date(this.data.updated);
  }

  public get created() {
    return new Date(this.data.created);
  }

  public constructor(public data: T) {}

  public async refresh(options?: CommonRequestOptions) {
    this.data = await request<T>(
      `${this.endpoint.url}/${this.data.id}`,
      options,
    );
    return this;
  }

  public async create(options?: CommonRequestOptions) {
    if (this.data.id > 0) throw new Error('Item already exist');
    this.typeCheck();
    this.data = await request<T>(this.endpoint.url, {
      method: 'POST',
      body: this.toDTO(),
      ...options,
    });
    return this;
  }

  public async update(options?: CommonRequestOptions) {
    this.typeCheck();
    this.data = await request<T>(`${this.endpoint.url}/${this.data.id}`, {
      method: 'PUT',
      body: this.toDTO(),
      ...options,
    });
    return this;
  }

  public async delete(options?: CommonRequestOptions) {
    await this.endpoint.delete(this.data.id, options);
    return this;
  }

  public typeCheck() {
    if (!this.endpoint.typeChecker.Check(this.data))
      throw new TypeCheckerError(this.endpoint.typeChecker.Errors(this.data));
    return this;
  }

  public toDTO() {
    const dto = structuredClone(this.data) as Record<string, unknown>;
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    for (const key of this.endpoint.ignoredDTOFields) delete dto[key];
    return dto;
  }
}

export class RESTItemIDB<T extends RESTBody> extends RESTItem<T> {
  public declare endpoint: RESTEndpointIDB<T, RESTItemIDB<T>>;

  public async refresh(options?: RESTItemIDBRequestOptions) {
    this.data = await request<T>(
      `${this.endpoint.url}/${this.data.id}`,
      options,
    );
    if (!options?.ignoreDB) await db.add(this.endpoint.idb, this.data);
    return this;
  }

  public async create(options?: RESTItemIDBRequestOptions) {
    if (this.data.id > 0) throw new Error('Item already exist');
    this.typeCheck();
    try {
      if (!untrack(basicStore.online)) throw new Error();
      const origId = this.data.id;
      this.data = await request<T>(this.endpoint.url, {
        method: 'POST',
        body: this.toDTO(),
        ...options,
      });
      await db.delete(this.endpoint.idb, origId);

      // Update offline queue with new id
      for (const key of await db.getAllKeys('offlineTasksQueue')) {
        if (typeof key !== 'string') continue;
        const task = await db.get('offlineTasksQueue', key);
        if (key.endsWith(`_${this.endpoint.idb}_update`)) {
          (task as RESTBody).id = this.data.id;
          await db.put('offlineTasksQueue', this.data, key);
        } else if (key.endsWith(`_${this.endpoint.idb}_delete`))
          await db.put('offlineTasksQueue', this.data.id, key);
      }
    } catch (e) {
      if (options?.ignoreDB || (e instanceof RequestError && e.code !== 0))
        throw e;
      this.data.id = -UUID();
      await db.add(
        'offlineTasksQueue',
        this.data,
        `${UUID()}_${this.endpoint.idb}_create`,
      );
    }
    if (!options?.ignoreDB) await db.add(this.endpoint.idb, this.data);
    return this;
  }

  public async update(options?: RESTItemIDBRequestOptions) {
    this.typeCheck();
    try {
      if (!untrack(basicStore.online)) throw new Error();
      this.data = await request<T>(`${this.endpoint.url}/${this.data.id}`, {
        method: 'PUT',
        body: this.toDTO(),
        ...options,
      });
    } catch (e) {
      if (options?.ignoreDB || (e instanceof RequestError && e.code !== 0))
        throw e;
      await db.add(
        'offlineTasksQueue',
        this.data,
        `${UUID()}_${this.endpoint.idb}_update`,
      );
    }
    if (!options?.ignoreDB) await db.put(this.endpoint.idb, this.data);
    return this;
  }

  public async delete(options?: RESTItemIDBRequestOptions) {
    await this.endpoint.delete(this.data.id, options);
    return this;
  }
}

export function getDefaultRestFields() {
  return {
    id: -UUID(),
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    userId: authStore.me()?.id ?? 0,
  };
}
