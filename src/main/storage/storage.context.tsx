import {
  Context,
  ParentComponent,
  createContext,
  useContext,
} from 'solid-js'

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

const Context = createContext<ReturnType<typeof getProvided>>()
export const StudyProvider: ParentComponent = properties => (
  <Context.Provider value={getProvided()}>{properties.children}</Context.Provider>
)
export const useStudy = () => useContext(Context)
