import { mdiReload } from '@mdi/js'
import * as i18n from '@solid-primitives/i18n'
import { createEffect, createResource, createRoot } from 'solid-js'
// eslint-disable-next-line import-x/no-unresolved
import { useRegisterSW } from 'virtual:pwa-register/solid'

import Icon from '@/components/icon'

import { modalsStore, Severity } from './modals.store'
import { atom, persistentAtom } from './reactive'

import type en from '../i18n/ru.json'

export type Locale = 'en' | 'jp' | 'ru'
export type Dictionary = i18n.Flatten<typeof en>

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
        title: `${t('MAIN.RELOAD_APP')}\n${(error as Error).toString()}`,
        timeout: 5000,
        severity: Severity.ERROR,
      })
    },
    onNeedRefresh() {
      modalsStore.notify({
        id: 'updateSW',
        title: (
          <div>
            <div>{t('MAIN.NEED_RELOAD')}</div>
            <button onClick={() => updateServiceWorker(true)}>
              <Icon path={mdiReload} size="24" inline />
              <b>{t('MAIN.RELOAD_APP')}</b>
            </button>
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
  const locale = persistentAtom<Locale>('locale', 'en')

  // === Resources ===
  const [dict] = createResource(async () => i18n.flatten(await import(`./${locale()}.json`)) as Dictionary)
  const t = i18n.translator(dict, i18n.resolveTemplate)

  // === Effects ===
  createEffect(() => {
    const $activeRequests = activeRequests()
    clearTimeout(loadingTimeout)
    loadingTimeout = setTimeout(() => loading($activeRequests !== 0), 500)
  })

  return {
    t,
    locale,
    activeRequests,
    loading,
    online,
  }
})
