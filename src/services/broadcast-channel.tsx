import { modalsStore, Severity } from './modals.store'

const channel = new BroadcastChannel('softsky')
channel.addEventListener('message', onMessage)

type BroadcastChannelMessageHandler = (data?: string) => unknown
const eventListenerMap = new Map<string, BroadcastChannelMessageHandler[]>()

export function on(event: string, callback: BroadcastChannelMessageHandler) {
  let listeners = eventListenerMap.get(event)
  if (!listeners) {
    listeners = []
    eventListenerMap.set(event, listeners)
  }
  if (!listeners.includes(callback)) listeners.push(callback)
}
export function off(event: string, callback: BroadcastChannelMessageHandler) {
  const listeners = eventListenerMap.get(event)
  if (!listeners) return
  const index = listeners.indexOf(callback)
  if (index !== -1) listeners.splice(index, 1)
  if (listeners.length === 0) eventListenerMap.delete(event)
}
export function send(event: string, data?: string) {
  let payload = event
  if (data) payload += ' ' + data
  channel.postMessage(payload)
}
function onMessage(packet: MessageEvent<unknown>) {
  if (typeof packet.data !== 'string') return
  let splitter = packet.data.indexOf(' ')
  if (splitter === -1) splitter = packet.data.length
  const event = packet.data.slice(0, splitter)
  const data = packet.data.slice(splitter + 1)
  if (event === 'error')
    modalsStore.notify({
      title: data,
      timeout: 5000,
      severity: Severity.ERROR,
    })
  const listeners = eventListenerMap.get(event)
  if (listeners) for (const listener of listeners) listener(data)
}
