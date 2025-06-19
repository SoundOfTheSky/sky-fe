/* eslint-disable unicorn/prefer-add-event-listener */

import { encode, decode } from 'cbor-x'

import {
  WebSocketMessageClient,
  WebSocketMessageRequest,
  WebSocketMessageServer,
  WebSocketMessageSubscribe,
  WebSocketMessageType,
} from '@/sky-shared/web-socket'

export enum WebSocketStatus {
  closed,
  connecting,
  connected,
}

export class WebSocketClient {
  private ws!: WebSocket
  private pending = new Map<number, (message: WebSocketMessageServer) => void>()
  private lastMessageId = 0

  public status = WebSocketStatus.closed

  public constructor(private url: string) {
    void this.connect()
  }

  public connect(): Promise<void> {
    this.status = WebSocketStatus.connecting
    this.close()
    this.ws = new WebSocket(this.url)
    return new Promise((resolve, reject) => {
      this.ws.addEventListener('open', () => {
        this.status = WebSocketStatus.connected
        resolve()
      })
      this.ws.onerror = (event) => {
        reject(
          new Error(
            (event.target as EventTarget & { error?: { message: string } })
              .error?.message ?? 'Unknown error',
          ),
        )
      }
      this.ws.onmessage = (event) => {
        this.handleMessage(event)
      }
      this.ws.onclose = () => {
        setTimeout(() => this.connect(), 10_000)
      }
    })
  }

  public close() {
    this.ws.close()
    this.pending.clear()
  }

  public send(data: WebSocketMessageClient): void {
    this.ws.send(encode(data) as Uint8Array)
  }

  public request<T = any>(url: string, value: any): Promise<T> {
    const id = ++this.lastMessageId
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, (message) => {
        if (message.type === WebSocketMessageType.ERROR) reject(message.value)
        else resolve(message.value as T)
        this.pending.delete(id)
        if (this.pending.size === 0) this.close()
      })
      const data: WebSocketMessageRequest = {
        id,
        type: WebSocketMessageType.REQUEST,
        url,
      }
      if (value !== undefined) data.value = value
      this.send(data)
    })
  }

  public async *subscribe<T = any>(
    url: string,
    value?: any,
  ): AsyncGenerator<T, void, unknown> {
    const id = ++this.lastMessageId
    const queue: T[] = []
    let resolve: (() => void) | null = null
    let done = false

    this.pending.set(id, (message) => {
      if (message.type === WebSocketMessageType.ERROR) throw message.value
      if (message.type === WebSocketMessageType.SUBSCRIBE_VALUE) {
        queue.push(message.value as T)
        if (message.done) done = true
        if (resolve) {
          resolve()
          resolve = null
        }
      }
    })

    const data: WebSocketMessageSubscribe = {
      id,
      type: WebSocketMessageType.SUBSCRIBE,
      url,
    }
    if (value !== undefined) data.value = value
    this.send(data)
    try {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      while (!done || queue.length > 0) {
        if (queue.length === 0)
          await new Promise<void>((_resolve) => (resolve = _resolve))
        while (queue.length > 0) yield queue.shift()!
      }
    } finally {
      this.pending.delete(id)
      if (this.pending.size === 0) this.close()
    }
  }

  private handleMessage(event: MessageEvent) {
    const message = decode(event.data as Uint8Array) as WebSocketMessageServer
    this.pending.get(message.id)?.(message)
  }
}
