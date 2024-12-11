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

  async function dialog(dialog: Optional<Dialog, 'id' | 'loading'>) {
    dialog.id ??= UUID().toString()
    dialog.loading = atom(false)
    const promise = new ImmediatePromise<unknown>()
    dialogPromises.set(dialog as Dialog, promise)
    return await promise
  }

  async function clickDialogButton(dialog: Dialog, index: number) {
    const promise = dialogPromises.get(dialog)!
    try {
      const button = dialog.buttons[index]!
      dialog.loading(true)
      const data = await button.onClick()
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
    dialogs(n => n.filter(x => x.id !== id))
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
