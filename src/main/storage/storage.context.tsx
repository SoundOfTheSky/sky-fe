import { ParentComponent, createContext, useContext } from 'solid-js'

import { atom } from '@/services/reactive'

function getProvided() {
  // === Hooks ===

  // === State ===
  const stats = atom('')
  // === Memos ===

  // === Functions ===

  return {
    // === State ===
    stats,
    // === Memos ===

    // === Functions ===
  }
}

const StorageContext = createContext<ReturnType<typeof getProvided>>()
export const StorageProvider: ParentComponent = (properties) => (
  <StorageContext.Provider value={getProvided()}>
    {properties.children}
  </StorageContext.Provider>
)
export const useStorage = () => useContext(StorageContext)
