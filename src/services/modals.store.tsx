import { ImmediatePromise, Optional, UUID } from '@softsky/utils'
import {
  JSX,
  createRoot,
} from 'solid-js'

import { Atom, atom, onMounted } from './reactive'

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
onMounted

export enum Severity {
  INFO,
  SUCCESS,
  WARNING,
  ERROR,
}

export type Notification = {
  id: string
  title: JSX.Element | string
  severity?: Severity
  onClick?: () => unknown
  timeout?: number
}

export type Dialog = {
  id: string
  title: JSX.Element | string
  loading: Atom<boolean>
  closed: Atom<boolean>
  onClose?: () => Promise<{
    resolve: boolean
    data: unknown
  }>
  width?: string
  buttons: {
    title: JSX.Element | string
    severity?: Severity
    onClick: () => Promise<{
      resolve: boolean
      data: unknown
    }>
  }[]
}

export const modalsStore = createRoot(() => {
  // === State ===
  const notifications = atom<Notification[]>([])
  const dialogs = atom<Dialog[]>([])
  const dialogPromises = new WeakMap<Dialog, ImmediatePromise<unknown>>()

  // === Functions ===
  function notify(
    notification: Optional<Notification, 'id' | 'severity'>,
  ) {
    notification.id ??= UUID().toString()
    if (notification.timeout)
      setTimeout(() => {
        removeNotification(notification.id!)
      }, notification.timeout)
    notifications(n => [...n, notification as Notification])
    return notification.id
  }

  async function dialog(dialog: Omit<Optional<Dialog, 'id' | 'loading' | 'buttons'>, 'closed'>) {
    dialog.id ??= UUID().toString()
    dialog.loading = atom(false);
    (dialog as Dialog).closed = atom(false)
    dialog.onClose ??= () => Promise.resolve({
      resolve: true,
      data: false,
    })
    dialog.buttons ??= [{
      title: 'Отмена',
      severity: Severity.ERROR,
      onClick: () => Promise.resolve({
        resolve: true,
        data: false,
      }),
    }, {
      title: 'Ок',
      severity: Severity.INFO,
      onClick: () => Promise.resolve({
        resolve: true,
        data: true,
      }),
    }]
    const promise = new ImmediatePromise<unknown>()
    dialogPromises.set(dialog as Dialog, promise)
    dialogs(x => [...x, dialog as Dialog])
    return await promise
  }

  async function clickDialogButton(dialog: Dialog, index?: number) {
    const promise = dialogPromises.get(dialog)!
    try {
      dialog.loading(true)
      const data = await (index === undefined ? dialog.onClose!() : dialog.buttons[index]!.onClick())
      if (data.resolve) {
        removeDialog(dialog.id)
        promise.resolve(data.data)
      }
    }
    catch (error) {
      promise.reject(error as Error)
    }
    finally {
      dialog.loading(false)
    }
  }

  function removeNotification(id: string) {
    notifications(n => n.filter(x => x.id !== id))
  }

  function removeDialog(id: string) {
    dialogs().find(x => x.id === id)!.closed(true)
    setTimeout(() => dialogs(n => n.filter(x => x.id !== id)), 500)
  }

  return {
    notifications,
    clickDialogButton,
    dialogs,
    removeNotification,
    dialog,
    notify,
  }
})
