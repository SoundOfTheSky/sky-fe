/* eslint-disable unicorn/prefer-add-event-listener */
import {
  DatabaseConnector,
  DefaultSchema,
  QueryKeys,
  QuerySuffix,
} from '@/sky-shared/database'

// === Types ===
type FilterFunctionResult = -1 | 0 | 1

type FilterFunction = (x: Record<string, any>) => boolean

const modifierToFilterFunctionResults: Record<
  QuerySuffix,
  FilterFunctionResult
> = {
  '=': 0,
  '<': -1,
  '>': 1,
}

//

// === Functions ===
function createFilterFunction(
  field: string,
  value: any,
  result: FilterFunctionResult,
): FilterFunction {
  return (x: Record<string, any>) => indexedDB.cmp(x[field], value) === result
}

function openDB() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('Sky', 1)
    request.onerror = (event) => {
      const error = parseDBError(event)
      console.error('[DB] Error:', error)
      reject(error)
    }
    request.onblocked = () => {
      console.error('[DB] Blocked')
      reject(new Error('[DB] Blocked'))
    }
    request.onupgradeneeded = () => {
      const DB = request.result
      for (const name of ['users']) {
        const store = DB.createObjectStore(name, { keyPath: '_id' })
        store.createIndex('updated', 'updated')
        store.createIndex('username', 'username')
      }
      resolve(DB)
    }
    request.onsuccess = () => {
      resolve(request.result)
    }
  })
}

export const DB = openDB()

export function parseDBError(event: Event) {
  return new Error(
    (event.target as EventTarget & { error?: { message: string } }).error
      ?.message ?? 'Unknown error',
  )
}

export class IndexedDatabaseConnector<T extends DefaultSchema>
  implements DatabaseConnector<T>
{
  public constructor(
    public name: string,
    protected indexes: Record<string, string[] | string> = {},
  ) {}

  public async get(_id: string): Promise<T | undefined> {
    return DB.then(
      (database) =>
        new Promise((resolve, reject) => {
          const request = database
            .transaction([this.name], 'readonly')
            .objectStore(this.name)
            .get(_id)
          request.onsuccess = (event) => {
            resolve(
              (event.target as EventTarget & { result: T | undefined }).result,
            )
          }
          request.onerror = (event) => {
            const error = parseDBError(event)
            console.error('[DB] Error:', error)
            reject(error)
          }
        }),
    )
  }

  public async create(data: T): Promise<void> {
    console.log(`[IDB] Create`, data)
    return DB.then(
      (database) =>
        new Promise((resolve, reject) => {
          const request = database
            .transaction([this.name], 'readwrite')
            .objectStore(this.name)
            .put(data)
          request.onsuccess = () => {
            resolve()
          }
          request.onerror = (event) => {
            const error = parseDBError(event)
            console.error('[DB] Error:', error)
            reject(error)
          }
        }),
    )
  }

  public async createMany(data: T[]): Promise<void> {
    for (let index = 0; index < data.length; index++)
      await this.create(data[index]!)
  }

  public async delete(_id: string): Promise<void> {
    return DB.then(
      (database) =>
        new Promise((resolve, reject) => {
          const request = database
            .transaction([this.name], 'readwrite')
            .objectStore(this.name)
            .delete(_id)
          request.onsuccess = () => {
            resolve()
          }
          request.onerror = (event) => {
            const error = parseDBError(event)
            console.error('[DB] Error:', error)
            reject(error)
          }
        }),
    )
  }

  public async deleteMany(query: QueryKeys<T>): Promise<void> {
    const items = await this.getAll(query)
    for (let index = 0; index < items.length; index++)
      await this.delete(items[index]!._id)
  }

  public async *cursor(query: QueryKeys<T>): AsyncGenerator<T> {
    const database = await DB
    const store = database
      .transaction([this.name], 'readwrite')
      .objectStore(this.name)
    const index = this.findBestIndexForQuery(query)
    const { filterFunctions, keyRange } = this.buildFilter(query, index)
    const request = (index ? store.index(index) : store).openCursor(keyRange)
    const cursorPromise = (): Promise<T | null> =>
      new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = (
            event.target as IDBRequest<IDBCursorWithValue | undefined>
          ).result
          if (cursor) {
            resolve(cursor.value as T)
            cursor.continue()
          } else resolve(null)
        }
        request.onerror = (event) => {
          const error = parseDBError(event)
          console.error('[DB] Error:', error)
          reject(error)
        }
      })
    while (true) {
      const value = await cursorPromise()
      if (!value) break
      if (filterFunctions.every((x) => x(value))) yield value
    }
  }

  public async getAll(query: QueryKeys<T>): Promise<T[]> {
    return DB.then(
      (database) =>
        new Promise((resolve, reject) => {
          const store = database
            .transaction([this.name], 'readonly')
            .objectStore(this.name)
          const index = this.findBestIndexForQuery(query)
          console.log(`[IDB] getAll`, query, index)
          const { filterFunctions, keyRange } = this.buildFilter(query, index)
          const request = (index ? store.index(index) : store).getAll(keyRange)
          request.onsuccess = (event) => {
            resolve(
              (event.target as IDBRequest<T[]>).result.filter((value) =>
                filterFunctions.every((function_) => function_(value)),
              ),
            )
          }
          request.onerror = (event) => {
            const error = parseDBError(event)
            console.error('[DB] Error:', error)
            reject(error)
          }
        }),
    )
  }

  public async update(_id: string, fields: Partial<T>): Promise<void> {
    console.log(`[IDB] Update`, _id, fields)
    const item = await this.get(_id)
    if (!item) throw new Error('NOT FOUND')
    return DB.then(
      (database) =>
        new Promise((resolve, reject) => {
          const request = database
            .transaction([this.name], 'readwrite')
            .objectStore(this.name)
            .put({ ...item, ...fields })
          request.onsuccess = () => {
            resolve()
          }
          request.onerror = (event) => {
            const error = parseDBError(event)
            console.error('[DB] Error:', error)
            reject(error)
          }
        }),
    )
  }

  public async updateMany(
    query: QueryKeys<T>,
    fields: Partial<T>,
  ): Promise<void> {
    const items = await this.getAll(query)
    const database = await DB
    for (let index = 0; index < items.length; index++) {
      const item = items[index]!
      await new Promise<void>((resolve, reject) => {
        const request = database
          .transaction([this.name], 'readwrite')
          .objectStore(this.name)
          .put({ ...item, ...fields })
        request.onsuccess = () => {
          resolve()
        }
        request.onerror = (event) => {
          const error = parseDBError(event)
          console.error('[DB] Error:', error)
          reject(error)
        }
      })
    }
  }

  private buildFilter(query: QueryKeys<T>, index?: string) {
    const filterFunctions: FilterFunction[] = []
    if (index) {
      const types = new Set()
      for (const key in query) types.add(key.at(-1)!)
      const indexPositions = this.indexes[index]!
      const isArray = typeof indexPositions !== 'string'
      const upper = new Array(isArray ? indexPositions.length : 1)
      const lower = new Array(isArray ? indexPositions.length : 1)
      for (const key in query) {
        const value = query[key]
        const field = key.slice(0, -1)
        const modifier = key.at(-1)! as QuerySuffix
        const index = isArray
          ? indexPositions.indexOf(field)
          : indexPositions === field
            ? 0
            : -1
        if (index === -1) {
          console.log(
            `[IDB] Using simple filter for "${field}". Consider using index.`,
          )
          filterFunctions.push(
            createFilterFunction(
              field,
              value,
              modifierToFilterFunctionResults[modifier],
            ),
          )
        } else if (modifier === '=') {
          upper[index] = value
          lower[index] = value
        } else if (modifier === '<') upper[index] = value
        else lower[index] = value
      }
      if (types.has('<') && !types.has('>'))
        return {
          filterFunctions,
          keyRange: IDBKeyRange.upperBound(upper, true),
        }
      else if (types.has('>') && !types.has('<'))
        return {
          filterFunctions,
          keyRange: IDBKeyRange.lowerBound(lower, true),
        }
      else if (types.has('=') && types.size === 1)
        return {
          filterFunctions,
          keyRange: IDBKeyRange.only(lower),
        }
      return {
        filterFunctions,
        keyRange: IDBKeyRange.bound(lower, upper, true, true),
      }
    }
    for (const key in query) {
      const field = key.slice(0, -1)
      console.log(
        `[IDB] Using simple filter for "${field}". Consider using index.`,
      )
      filterFunctions.push(
        createFilterFunction(
          field,
          query[key],
          modifierToFilterFunctionResults[key.at(-1)! as QuerySuffix],
        ),
      )
    }
    return { filterFunctions }
  }

  private findBestIndexForQuery(query: QueryKeys<T>) {
    const queryFields = new Set(
      Object.keys(query).map((key) => key.slice(0, -1)),
    )
    let bestIndex: string | undefined
    let bestScore = -1
    index: for (const name in this.indexes) {
      const paths = this.indexes[name]!
      const indexFields = Array.isArray(paths) ? paths : [paths]
      let score = 0
      for (const field of indexFields) {
        // We cannot use index if one the field isn't used
        if (!queryFields.has(field)) continue index
        score++
      }
      if (score > bestScore) {
        bestScore = score
        bestIndex = name
      }
    }
    return bestIndex
  }
}
