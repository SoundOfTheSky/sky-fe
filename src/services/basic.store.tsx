import { mdiReload } from '@mdi/js'
import { createEffect, createRoot } from 'solid-js'
// eslint-disable-next-line import-x/no-unresolved
import { useRegisterSW } from 'virtual:pwa-register/solid'

import Button from '@/components/form/button'
import Icon from '@/components/icon'

import { modalsStore, Severity } from './modals.store'
import { atom } from './reactive'

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
      modalsStore.notify({
        title: `Не удалось зарегистрировать приложение...\n${(error as Error).toString()}`,
        timeout: 5000,
        severity: Severity.ERROR,
      })
    },
    onNeedRefresh() {
      modalsStore.notify({
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
  const activeRequests = atom(0)
  const loading = atom(false)
  let loadingTimeout: number

  // === Effects ===
  createEffect(() => {
    const $activeRequests = activeRequests()
    clearTimeout(loadingTimeout)
    loadingTimeout = setTimeout(() => loading(!!$activeRequests), 500)
  })

  return {

    activeRequests,
    loading,
    online,
  }
})
