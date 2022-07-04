import BasicStore, { NotificationType } from '@/services/basic.store';
import * as broadcastChannel from '@/services/broadcast-channel';
import { wait } from '@/services/utils';

export enum WebSocketStatus {
  closed,
  connecting,
  connected,
}
let socket: WebSocket | undefined;
export let status = WebSocketStatus.closed;
export let proxyMode = false;
let proxyHeartbeat = true;
type WebSocketMessageHandler = (data?: string) => unknown;
const eventListenerMap = new Map<string, WebSocketMessageHandler[]>();

const myPriority = Math.floor((Date.now() + Math.random()) * 1_000_000);
// Needed to determine new proxy if there is multiple tabs
let priorityAnswers: number[] = [];
broadcastChannel.on('webSocketPriority', (priority) => {
  if (priority) priorityAnswers.push(Number.parseInt(priority));
});
// Search for proxy/answer if this tab is proxy
broadcastChannel.on('queryWebSocket', () => {
  if (status !== WebSocketStatus.closed && !proxyMode) broadcastChannel.send('openWebSocket');
});
broadcastChannel.on('openWebSocket', () => {
  proxyMode = true;
  if (socket) {
    console.log('[WS] Another tab have opened connection. ITS BAD!');
    socket.close();
  }
  proxyHeartbeat = true;
});
// Send/get data from WS with proxy
broadcastChannel.on('webSocketSend', (packet) => {
  if (!socket || proxyMode || !packet) return;
  console.log('[WS] Asked to send', packet);
  socket.send(packet);
});
broadcastChannel.on('webSocketGet', (packet) => {
  if (!proxyMode || !packet) return;
  onMessage(packet);
});
// Heartbeat
setInterval(() => {
  if (!proxyMode) return;
  if (proxyHeartbeat) {
    proxyHeartbeat = false;
    broadcastChannel.send('queryWebSocket');
  } else {
    console.log(`[WS] Proxy died...`);
    proxyMode = false;
    proxyHeartbeat = true;
    status = WebSocketStatus.closed;
    void connectWebSocket();
  }
}, 1000);

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
  let payload = event;
  if (data) payload += ' ' + data;
  if (proxyMode) broadcastChannel.send('webSocketSend', payload);
  else if (socket) socket.send(payload);
}
/**
 * Find and use proxy if it exists,
 * otherwise determine new proxy or host connection.
 */
async function connectWebSocket() {
  if (status === WebSocketStatus.connected || status === WebSocketStatus.connecting || proxyMode) return;
  status = WebSocketStatus.connecting;
  console.log(`[WS] Searching for host...`);
  onMessage('connecting');
  const answer = await checkForAvailableProxy();
  // If there is proxy up and running
  if (answer === 1) {
    console.log(`[WS] Host found! Proxy mode!`);
    status = WebSocketStatus.connected;
    onMessage('connected');
    return;
    // If there will be new proxy, just retry
  } else if (answer === 2) {
    console.log(`[WS] Another tab will be a host. Retrying...`);
    await wait(1000);
    status = WebSocketStatus.closed;
    return connectWebSocket();
  }
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
  broadcastChannel.send('openWebSocket');
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
  await connectWebSocket();
}
/**
 * Parse and broadcast incoming message to listeners
 */
function onMessage(packet: string) {
  if (typeof packet !== 'string') return;
  if (!proxyMode) broadcastChannel.send('webSocketGet', packet);
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
/**
 * 0 - Someone else will become proxy soon
 *
 * 1 - Proxy exists
 *
 * 2 - This tab needs to become proxy
 */
function checkForAvailableProxy() {
  return new Promise<0 | 1 | 2>((r) => {
    const handler = () => {
      r(1);
      clearTimeout(timeout);
      broadcastChannel.off('openWebSocket', handler);
      priorityAnswers = [];
    };
    broadcastChannel.on('openWebSocket', handler);
    const timeout = setTimeout(() => {
      if (priorityAnswers.some((a) => a > myPriority)) r(2);
      else r(0);
      broadcastChannel.off('openWebSocket', handler);
      priorityAnswers = [];
    }, 200);
    broadcastChannel.send('queryWebSocket');
    broadcastChannel.send('webSocketPriority', myPriority + '');
  });
}
