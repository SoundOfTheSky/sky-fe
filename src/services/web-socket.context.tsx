import { log } from '@softsky/utils'
import {
  batch,
  createContext,
  createEffect,
  onCleanup,
  ParentComponent,
  untrack,
  useContext,
} from 'solid-js'

import basicStore from './basic.store'
import { modalsStore, Severity } from './modals.store'
import { atom } from './reactive'

const { t } = basicStore
export enum WebSocketStatus {
  closed,
  connecting,
  connected,
}

function getProvided() {
  // === Hooks ===
  onCleanup(close)

  // === State ===
  const status = atom(WebSocketStatus.closed)
  const socket = atom<WebSocket>()
  const lastEvent = atom<[string, string?]>(['connecting'])

  // === Effects ===
  createEffect<WebSocket | undefined>((oldSocket) => {
    if (oldSocket) cleanupSocket(oldSocket)
    const $socket = socket()
    if (!$socket) return
    registerSocket($socket)
    return $socket
  })

  createEffect(() => {
    if (basicStore.online()) connect()
    else close()
  })

  // === Functions ===
  function connect() {
    untrack(() => {
      batch(() => {
        const $status = status()
        if (
          $status === WebSocketStatus.connected ||
          $status === WebSocketStatus.connecting
        )
          return
        log('[WS] connecting')
        status(WebSocketStatus.connecting)
        socket(new WebSocket(`wss://${location.hostname}/ws`))
      })
    })
  }
  function onOpen() {
    log('[WS] open')
    status(WebSocketStatus.connected)
    basicStore.online(true)
  }
  function onError() {
    log('[WS] error')
    basicStore.online(false)
    close()
  }
  function onMessage(message: MessageEvent<unknown>) {
    if (typeof message.data === 'string') {
      const index = message.data.indexOf(' ')
      const event: [string, string?] =
        index === -1
          ? [message.data]
          : [message.data.slice(0, index), message.data.slice(index + 1)]
      if (event[0] === 'error')
        modalsStore.notify({
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          title: event[1] || t('COMMON.UNKNOWN_ERROR'),
          timeout: 5000,
          severity: Severity.ERROR,
        })
      lastEvent(event)
    }
  }
  function onClose() {
    socket()
    if (status() === WebSocketStatus.closed) return
    status(WebSocketStatus.closed)
    if (!basicStore.online()) return
    connect()
  }
  function registerSocket(socket: WebSocket) {
    socket.addEventListener('open', onOpen)
    socket.addEventListener('error', onError)
    socket.addEventListener('message', onMessage)
    socket.addEventListener('close', onClose)
  }
  function cleanupSocket(socket: WebSocket) {
    socket.removeEventListener('open', onOpen)
    socket.removeEventListener('error', onError)
    socket.removeEventListener('message', onMessage)
    socket.removeEventListener('close', onClose)
  }
  function send(event: string, data?: string) {
    untrack(() => {
      const $socket = socket()
      const $status = status()
      if (!$socket || $status !== WebSocketStatus.connected)
        throw new Error('[WS] Socket not open')
      let payload = event
      if (data) payload += ' ' + data
      $socket.send(payload)
    })
  }
  function close() {
    log('[WS] Force close')
    status(WebSocketStatus.closed)
    socket()
  }

  return {
    status,
    socket,
    lastEvent,
    send,
    close,
  }
}

const Context = createContext<ReturnType<typeof getProvided>>()
export const WebSocketProvider: ParentComponent = (properties) => (
  <Context.Provider value={getProvided()}>
    {properties.children}
  </Context.Provider>
)
export const useWebSocket = () => useContext(Context)
