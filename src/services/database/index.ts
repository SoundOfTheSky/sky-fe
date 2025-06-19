/* eslint-disable unicorn/prefer-add-event-listener */
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
      }
      resolve(DB)
    }
  })
}

export function parseDBError(event: Event) {
  return new Error(
    (event.target as EventTarget & { error?: { message: string } }).error
      ?.message ?? 'Unknown error',
  )
}

export const DB = openDB()
