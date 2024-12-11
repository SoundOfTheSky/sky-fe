/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { HOUR_MS, UUID } from '@softsky/utils'
import { createEffect, createRoot, untrack } from 'solid-js'

import {
  getThemes,
  studyAnswerEndpoint,
  studyQuestionEndpoint,
  studySubjectEndpoint,
  studyUserQuestionEndpoint,
  studyUserSubjectEndpoint,
} from '@/main/study/services/study.rest'

import authStore from './auth.store'
import basicStore from './basic.store'
import { database } from './database'
import { handleError, RequestError } from './fetch'
import { modalsStore, Severity } from './modals.store'
import { atom, persistentAtom, useInterval } from './reactive'

export enum SYNC_STATUS {
  IDLE,
  ACTIONS,
  CACHE,
  SYNCHED,
  ERRORED,
}
async function syncOfflineTaskQueue(options: {
  checkIfAborted: () => void
  onProgress: (p: number) => unknown
}) {
  const endpoints = [
    studySubjectEndpoint,
    studyQuestionEndpoint,
    studyAnswerEndpoint,
    studyUserSubjectEndpoint,
    studyUserQuestionEndpoint,
  ]
  const endpointsMap = new Map(endpoints.map(x => [x.idb as string, x]))
  const keys = await database.getAllKeys('offlineTasksQueue')
  for (let index = 0; index < keys.length; index++) {
    const key = keys[index]!
    options.checkIfAborted()
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const request = (await database.get('offlineTasksQueue', key)) as any
      const [, idb, action] = key.split('_') as [string, string, string]
      const endpoint = endpointsMap.get(idb)
      if (endpoint) {
        switch (action) {
          case 'create': {
            await new endpoint.builder(request).create()
            break
          }
          case 'update': {
            await new endpoint.builder(request).update()
            break
          }
          case 'delete': {
            await endpoint.delete(request as number, {
              ignoreDB: true,
            })
            break
          }
        }
      }
    }
    catch (error) {
      if (!(error instanceof RequestError) || error.code === 0) {
        handleError(error)
        throw error
      }
    }
    finally {
      await database.delete('offlineTasksQueue', key)
      options.onProgress(index / key.length)
    }
  }
}

async function deleteUserDependentStores() {
  const endpoints = [
    studyUserSubjectEndpoint,
    studyUserQuestionEndpoint,
    studyAnswerEndpoint,
  ]
  for (const endpoint of endpoints)
    await endpoint.clearIDB()
}

async function syncStudy(options: {
  checkIfAborted: () => void
  onProgress: (p: number) => unknown
}) {
  // Will cache single query
  if (!document.location.pathname.startsWith('/study')) await getThemes()
  const endpoints = [
    studySubjectEndpoint,
    studyQuestionEndpoint,
    studyUserSubjectEndpoint,
    studyUserQuestionEndpoint,
    studyAnswerEndpoint,
  ]
  let index = 0
  const onProgress = (p: number) =>
    options.onProgress((index + p) / endpoints.length)
  for (; index < endpoints.length; index++)
    await endpoints[index]!.syncIDB({
      checkIfAborted: options.checkIfAborted,
      onProgress,
    })
}

export default createRoot(() => {
  // === Hooks ===
  useInterval(sync, HOUR_MS)

  // === State ===
  const cached = persistentAtom('cached', false)
  const lastUserId = persistentAtom<number | undefined>('lastUserId')
  const progress = atom(0)
  const status = atom(SYNC_STATUS.IDLE)
  let syncId = 0

  // === Effects ===
  createEffect(() => {
    basicStore.online()
    if (!authStore.loading() && authStore.ready() && authStore.me()) void sync()
  })

  // === Functions ===
  async function askForPersistentStorageAccess() {
    if (!await navigator.storage.persisted()) {
      if (localStorage.getItem('declinedOffline') === 'true') {
        status(SYNC_STATUS.IDLE)
        return false
      }
      modalsStore.notify({
        title: 'Разрешите доступ к хранилищу, чтобы получить доступ к сайту оффлайн.',
        id: 'persistentStorage',
      })
      if (!await navigator.storage.persist()) {
        modalsStore.removeNotification('persistentStorage')
        modalsStore.notify({
          title: 'Запрещен доступ к хранилищу, доступ к сайту оффлайн невозможен.',
          timeout: 5000,
          severity: Severity.ERROR,
        })
        localStorage.setItem('declinedOffline', 'true')
        status(SYNC_STATUS.IDLE)
        return false
      }
      modalsStore.removeNotification('persistentStorage')
      localStorage.removeItem('declinedOffline')
    }
    return true
  }
  async function sync() {
    try {
      const me = untrack(authStore.me)
      if (!untrack(basicStore.online) || !me) {
        status(cached() ? SYNC_STATUS.SYNCHED : SYNC_STATUS.IDLE)
        return
      }
      if (!await askForPersistentStorageAccess()) return
      syncId = UUID()
      const currentSyncId = syncId
      const stopIfAborted = () => {
        if (currentSyncId !== syncId) throw new Error('STOP')
      }
      status(SYNC_STATUS.ACTIONS)
      if (me.id !== untrack(lastUserId)) {
        await deleteUserDependentStores()
        lastUserId(me.id)
      }
      await syncOfflineTaskQueue({
        checkIfAborted: stopIfAborted,
        onProgress: progress,
      })
      status(SYNC_STATUS.CACHE)
      progress(0)
      await syncStudy({
        checkIfAborted: stopIfAborted,
        onProgress: progress,
      })
      cached(true)
      status(SYNC_STATUS.SYNCHED)
    }
    catch (error) {
      if (!(error instanceof Error) || error.message !== 'STOP') {
        status(SYNC_STATUS.ERRORED)
        console.error(error)
      }
    }
  }

  return {
    progress,
    status,
    sync,
    cached,
  }
})
