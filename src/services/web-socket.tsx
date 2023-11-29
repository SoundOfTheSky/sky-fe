import BasicStore, { NotificationType } from '@/services/basic.store';
import { wait } from './utils';

export enum WebSocketStatus {
  closed,
  connecting,
  connected,
}
let socket: WebSocket | undefined;
export let status = WebSocketStatus.closed;
type WebSocketMessageHandler = (data?: string) => unknown;
const eventListenerMap = new Map<string, WebSocketMessageHandler[]>();

// === Functions ===
export function on(event: string, callback: WebSocketMessageHandler) {
  let listeners = eventListenerMap.get(event);
  if (!listeners) {
    listeners = [];
    eventListenerMap.set(event, listeners);
  }
  if (!listeners.includes(callback)) listeners.push(callback);
  if (!socket) void connectWebSocket();
}
export function off(event: string, callback: WebSocketMessageHandler) {
  const listeners = eventListenerMap.get(event);
  if (!listeners) return;
  const i = listeners.indexOf(callback);
  if (i !== -1) listeners.splice(i, 1);
  if (listeners.length === 0) eventListenerMap.delete(event);
  if (eventListenerMap.size === 0) closeWebSocket();
}
export function send(event: string, data?: string) {
  if (!socket || status !== WebSocketStatus.connected) throw new Error('[WS] Socket not open');
  let payload = event;
  if (data) payload += ' ' + data;
  socket.send(payload);
}
function connectWebSocket() {
  if (status === WebSocketStatus.connected || status === WebSocketStatus.connecting) return;
  status = WebSocketStatus.connecting;
  onMessage('connecting');
  console.log(`[WS] Connecting...`);
  socket = new WebSocket(`wss://${location.hostname}/ws`);
  socket.addEventListener('open', () => {
    console.log('[WS] Connected!');
    status = WebSocketStatus.connected;
    onMessage('connected');
  });
  socket.addEventListener('error', () => socket?.close());
  socket.addEventListener('message', (p: MessageEvent<string>) => onMessage(p.data));
  socket.addEventListener('close', onClose);
}
/**
 * On web socket close try to reconnect.
 */
async function onClose() {
  socket = undefined;
  if (status === WebSocketStatus.closed) {
    onMessage('close');
    return;
  }
  status = WebSocketStatus.closed;
  await wait(2000);
  connectWebSocket();
}
/**
 * Parse and broadcast incoming message to listeners
 */
function onMessage(packet: string) {
  if (typeof packet !== 'string') return;
  let splitter = packet.indexOf(' ');
  if (splitter === -1) splitter = packet.length;
  const event = packet.slice(0, splitter);
  const data = packet.slice(splitter + 1);
  if (event === 'error')
    BasicStore.notify({
      title: data ?? 'Uknown error',
      timeout: 5000,
      type: NotificationType.Error,
    });
  const listeners = eventListenerMap.get(event);
  if (listeners) for (const listener of listeners) listener(data);
}
function closeWebSocket() {
  status = WebSocketStatus.closed;
  socket?.close();
}
