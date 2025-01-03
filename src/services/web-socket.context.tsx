import { ParentComponent, batch, createContext, createEffect, onCleanup, untrack, useContext } from 'solid-js';

import { log } from '@/sky-utils';

import basicStore, { NotificationType } from './basic.store';
import { atom } from './reactive';

export enum WebSocketStatus {
  closed,
  connecting,
  connected,
}

function getProvided() {
  // === State ===
  const status = atom(WebSocketStatus.closed);
  const socket = atom<WebSocket>();
  const lastEvent = atom<[string, string?]>(['connecting']);

  // === Effects ===
  createEffect<WebSocket | undefined>((oldSocket) => {
    if (oldSocket) cleanupSocket(oldSocket);
    const $socket = socket();
    if (!$socket) return;
    registerSocket($socket);
    return $socket;
  });

  createEffect(() => {
    if (basicStore.online()) connect();
    else close();
  });

  // === Functions ===
  function connect() {
    untrack(() =>
      batch(() => {
        const $status = status();
        if ($status === WebSocketStatus.connected || $status === WebSocketStatus.connecting) return;
        log('[WS] connecting');
        status(WebSocketStatus.connecting);
        socket(new WebSocket(`wss://${location.hostname}/ws`));
      }),
    );
  }
  function onOpen() {
    log('[WS] open');
    status(WebSocketStatus.connected);
  }
  function onError() {
    log('[WS] error');
    basicStore.online(false);
  }
  function onMessage(message: MessageEvent<unknown>) {
    if (typeof message.data === 'string') {
      const i = message.data.indexOf(' ');
      const event: [string, string?] =
        i === -1 ? [message.data] : [message.data.slice(0, i), message.data.slice(i + 1)];
      if (event[0] === 'error')
        basicStore.notify({
          title: event[1] || 'Uknown error',
          timeout: 5000,
          type: NotificationType.Error,
        });
      lastEvent(event);
    }
  }
  function onClose() {
    socket(undefined);
    if (status() === WebSocketStatus.closed) return;
    status(WebSocketStatus.closed);
    if (!basicStore.online()) return;
    connect();
  }
  function registerSocket(socket: WebSocket) {
    socket.addEventListener('open', onOpen);
    socket.addEventListener('error', onError);
    socket.addEventListener('message', onMessage);
    socket.addEventListener('close', onClose);
  }
  function cleanupSocket(socket: WebSocket) {
    socket.removeEventListener('open', onOpen);
    socket.removeEventListener('error', onError);
    socket.removeEventListener('message', onMessage);
    socket.removeEventListener('close', onClose);
  }
  function send(event: string, data?: string) {
    untrack(() => {
      const $socket = socket();
      const $status = status();
      if (!$socket || $status !== WebSocketStatus.connected) throw new Error('[WS] Socket not open');
      let payload = event;
      if (data) payload += ' ' + data;
      $socket.send(payload);
    });
  }
  function close() {
    log('[WS] Force close');
    status(WebSocketStatus.closed);
    socket(undefined);
  }
  // === Hooks ===
  connect();
  onCleanup(close);
  return {
    status,
    socket,
    lastEvent,
    send,
    close,
  };
}

const Context = createContext<ReturnType<typeof getProvided>>();
export const WebSocketProvider: ParentComponent = (props) => (
  <Context.Provider value={getProvided()}>{props.children}</Context.Provider>
);
export const useWebSocket = () => useContext(Context);
