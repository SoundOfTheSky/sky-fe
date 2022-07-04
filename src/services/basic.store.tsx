import { createRoot, JSX, createUniqueId, createEffect } from 'solid-js';
import { useRegisterSW } from 'virtual:pwa-register/solid';
import { mdiReload } from '@mdi/js';

import Icon from '@/components/icon';
import { SimpleRequestOptions, request } from './fetch';
import { atom, atomize, useTimeout } from './reactive';

export enum NotificationType {
  Info,
  Success,
  Warning,
  Error,
}
export type Notification = {
  id: string;
  title: JSX.Element | string;
  type: NotificationType;
  onClick?: () => unknown;
  timeout?: number;
};

export default createRoot(() => {
  // === API ===
  const getWord = async (id: number, options?: SimpleRequestOptions) => request<string>(`/api/words/${id}`, options);

  // === State ===
  const online = atom(true);
  const notifications = atom<Notification[]>([]);
  const activeRequests = atom(0);
  const defferedIsRequesting = atom(false);
  let defferedIsRequestingTimeout: number;

  // === Other ===
  window.addEventListener('online', () => online(true));
  window.addEventListener('offline', () => online(false));
  const { needRefresh, offlineReady, updateServiceWorker } = useRegisterSW({
    immediate: true,
    onRegisteredSW(swScriptUrl, registration) {
      if (registration)
        setInterval(async () => {
          if (registration.installing || !navigator.onLine) return;
          const resp = await fetch(swScriptUrl, {
            cache: 'no-store',
            headers: {
              cache: 'no-store',
              'cache-control': 'no-cache',
            },
          });
          if (resp.status === 200) await registration.update();
        }, 3_600_000);
    },
    onRegisterError(error) {
      console.error('[SW] Register error', error);
      notify({
        title: `Couldn\'t register application...\n${(error as Error).toString()}`,
        timeout: 5000,
        type: NotificationType.Error,
      });
    },
  });

  // === Functions ===
  function notify(notification: Omit<Notification, 'id' | 'type'> & { id?: string; type?: NotificationType }) {
    if (notification.id === undefined) notification.id = createUniqueId();
    if (notification.type === undefined) notification.type = NotificationType.Info;
    if (notification.timeout)
      useTimeout(notification.timeout, () => notifications((n) => n.filter((x) => x !== notification)));
    notifications((n) => [...n, notification as Notification]);
    return notification.id;
  }

  function removeNotification(id: string) {
    notifications((n) => n.filter((x) => x.id !== id));
  }
  // === Effects ===
  // On online/offline
  createEffect((last) => {
    const $online = online();
    if (last !== undefined) {
      if (online())
        notify({
          title: 'You are back online',
          timeout: 5000,
          type: NotificationType.Success,
        });
      else
        notify({
          title: 'You are now offline',
          timeout: 5000,
          type: NotificationType.Error,
        });
    }
    return $online;
  });
  // On application installed
  createEffect(() => {
    if (offlineReady[0]())
      notify({
        title: 'Application can now be used offline!',
        timeout: 5000,
      });
  });
  // On update installed
  createEffect(() => {
    if (needRefresh[0]())
      notify({
        id: 'updateSW',
        title: (
          <div>
            <div>Please refresh application for update to install!</div>
            <button onClick={() => updateServiceWorker(true)}>
              <Icon path={mdiReload} size='24' inline />
              <b>Reload application</b>
            </button>
          </div>
        ),
        timeout: 30_000,
      });
  });
  // Deffered is requesting
  createEffect(() => {
    clearTimeout(defferedIsRequestingTimeout);
    if (activeRequests() > 0) defferedIsRequesting(true);
    else defferedIsRequestingTimeout = useTimeout(200, () => defferedIsRequesting(false));
  });

  return {
    getWord,
    updateServiceWorker,
    needRefresh: atomize(needRefresh),
    offlineReady: atomize(offlineReady),
    notify,
    notifications,
    removeNotification,
    activeRequests,
    defferedIsRequesting,
  };
});
