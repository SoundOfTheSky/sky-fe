/* eslint-disable unicorn/prefer-add-event-listener */
import {
  DatabaseConnector,
  DefaultSchema,
  QueryKeys,
  QuerySuffix,
} from '@/sky-shared/database'

import { DB, parseDBError } from '.'

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

// === Functions ===
function createFilterFunction(
  field: string,
  value: any,
  result: FilterFunctionResult,
): FilterFunction {
  return (x: Record<string, any>) => indexedDB.cmp(x[field], value) === result
}

export class LocalDatabaseConnector<T extends DefaultSchema>
  implements DatabaseConnector<T>
{
  public constructor(
    public name: string,
    protected indexes: Record<string, string[] | string>,
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
    return DB.then(
      (database) =>
        new Promise((resolve, reject) => {
          const request = database
            .transaction([this.name], 'readonly')
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
            .transaction([this.name], 'readonly')
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

  public async deleteMany(query: QueryKeys<T>, index?: string): Promise<void> {
    const items = await this.getAll(query, index)
    for (let index = 0; index < items.length; index++)
      await this.delete(items[index]!._id)
  }

  public async *cursor(query: QueryKeys<T>, index?: string): AsyncGenerator<T> {
    const database = await DB
    const store = database
      .transaction([this.name], 'readwrite')
      .objectStore(this.name)
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
      if (filterFunctions.every((function_) => function_(value))) yield value
    }
  }

  public async getAll(query: QueryKeys<T>, index?: string): Promise<T[]> {
    return DB.then(
      (database) =>
        new Promise((resolve, reject) => {
          const store = database
            .transaction([this.name], 'readonly')
            .objectStore(this.name)
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
    const item = await this.get(_id)
    if (!item) throw new Error('NOT FOUND')
    return DB.then(
      (database) =>
        new Promise((resolve, reject) => {
          const request = database
            .transaction([this.name], 'readonly')
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
    index?: string,
  ): Promise<void> {
    const items = await this.getAll(query, index)
    const database = await DB
    for (let index = 0; index < items.length; index++) {
      const item = items[index]!
      await new Promise<void>((resolve, reject) => {
        const request = database
          .transaction([this.name], 'readonly')
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
    const types = new Set()
    for (const key in query) types.add(key.at(-1)!)
    const indexPositions = index ? this.indexes[index]! : '_id'
    const isNotArray = typeof indexPositions === 'string'
    const upper = new Array(isNotArray ? indexPositions.length : 1)
    const lower = new Array(isNotArray ? indexPositions.length : 1)
    const filterFunctions: FilterFunction[] = []

    // Create filters
    for (const key in query) {
      const field = key.slice(0, -1)
      const modifier = key.at(-1)! as QuerySuffix

      const index = isNotArray
        ? indexPositions === key
          ? 0
          : -1
        : indexPositions.indexOf(field)
      const value = query[key]
      // If not indexed create a simple filtering function
      if (index === -1)
        filterFunctions.push(
          createFilterFunction(
            field,
            value,
            modifierToFilterFunctionResults[modifier],
          ),
        )
      // Set bounds
      else if (modifier === '=') {
        upper[index] = value
        lower[index] = value
      } else if (modifier === '<') upper[index] = value
      else lower[index] = value
    }

    // Check what type of range can we use
    if (types.has('<') && !types.has('>'))
      return { filterFunctions, keyRange: IDBKeyRange.upperBound(upper, true) }
    else if (types.has('>') && !types.has('<'))
      return { filterFunctions, keyRange: IDBKeyRange.lowerBound(lower, true) }
    else if (types.has('=') && types.size === 1)
      return { filterFunctions, keyRange: IDBKeyRange.only(lower) }
    return {
      filterFunctions,
      keyRange: IDBKeyRange.bound(lower, upper, true, true),
    }
  }
}
