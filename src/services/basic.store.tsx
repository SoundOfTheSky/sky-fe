import { mdiReload } from '@mdi/js'
import { createEffect, createRoot, createUniqueId, JSX } from 'solid-js'
// eslint-disable-next-line import-x/no-unresolved
import { useRegisterSW } from 'virtual:pwa-register/solid'

import Button from '@/components/form/button'
import Icon from '@/components/icon'

import { atom } from './reactive'

export enum NotificationType {
  Info,
  Success,
  Warning,
  Error,
}
export type Notification = {
  id: string
  title: JSX.Element | string
  type: NotificationType
  onClick?: () => unknown
  timeout?: number
}
export type Word = {
  created: string
  updated: string
  id: number
  word: string
}

export default createRoot(() => {
  // === Hooks ===
  globalThis.addEventListener('online', () => online(true))
  globalThis.addEventListener('offline', () => online(false))
  const { updateServiceWorker } = useRegisterSW({
    immediate: true,
    onRegisteredSW(swScriptUrl, registration) {
      if (registration)
        setInterval(async () => {
          if (registration.installing || !navigator.onLine) return
          const resp = await fetch(swScriptUrl, {
            cache: 'no-store',
            headers: {
              'cache': 'no-store',
              'cache-control': 'no-cache',
            },
          })
          if (resp.status === 200) await registration.update()
        }, 3_600_000)
    },
    onRegisterError(error) {
      console.error('[SW] Register error', error)
      notify({
        title: `Не удалось зарегистрировать приложение...\n${(error as Error).toString()}`,
        timeout: 5000,
        type: NotificationType.Error,
      })
    },
    onNeedRefresh() {
      notify({
        id: 'updateSW',
        title: (
          <div>
            <div>Please refresh application for update to install!</div>
            <Button onClick={() => updateServiceWorker(true)}>
              <Icon path={mdiReload} size="24" inline />
              <b>Reload application</b>
            </Button>
          </div>
        ),
        timeout: 30_000,
      })
    },
  })

  // === State ===
  const online = atom(true)
  const notifications = atom<Notification[]>([])
  const activeRequests = atom(0)
  const loading = atom(false)
  let loadingTimeout: number

  // === Effects ===
  createEffect(() => {
    const $activeRequests = activeRequests()
    clearTimeout(loadingTimeout)
    loadingTimeout = setTimeout(() => loading(!!$activeRequests), 500)
  })

  // === Functions ===
  function notify(
    notification: Omit<Notification, 'id' | 'type'> & {
      id?: string
      type?: NotificationType
    },
  ) {
    if (notification.id === undefined) notification.id = createUniqueId()
    if (notification.type === undefined)
      notification.type = NotificationType.Info
    if (notification.timeout)
      setTimeout(
        () => notifications(n => n.filter(x => x !== notification)),
        notification.timeout,
      )
    notifications(n => [...n, notification as Notification])
    return notification.id
  }

  function removeNotification(id: string) {
    notifications(n => n.filter(x => x.id !== id))
  }

  return {
    notify,
    notifications,
    removeNotification,
    activeRequests,
    loading,
    online,
  }
})
