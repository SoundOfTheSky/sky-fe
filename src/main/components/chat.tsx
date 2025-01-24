import { Component, For, Show, batch, createEffect, onCleanup, untrack } from 'solid-js'
import { Transition } from 'solid-transition-group'

import Input from '@/components/form/input'
import Skeleton from '@/components/loading/skeleton'
import { atom, useGlobalEvent } from '@/services/reactive'
import { opacityTransitionImmediate } from '@/services/transition'
import { WebSocketStatus, useWebSocket } from '@/services/web-socket.context'

import s from './chat.module.scss'

type ChatMessage = {
  username?: string
  avatar?: string
  time: number
  text: string
}
type Credentials = {
  username: string
  avatar?: string
}

const Chat: Component = () => {
  // === Hooks ===
  const ws = useWebSocket()!

  useGlobalEvent('keypress', (event) => {
    if (event.code === 'Enter') sendMessage()
  })

  onCleanup(() => {
    if (ws.status() === WebSocketStatus.connected) ws.send('unsubscribePublicChat')
  })

  // === State ===
  const viewAvatar = atom<string>()
  const sendingMessage = atom(false)
  const message = atom('')
  const messages = atom<ChatMessage[]>([])
  const credentials = atom<Credentials>()

  // === Effects ===
  // WebSocket status handler
  createEffect(() => {
    switch (ws.status()) {
      case WebSocketStatus.connecting: {
        credentials(undefined)
        break
      }
      case WebSocketStatus.connected: {
        messages([])
        ws.send('publicChatSubscribe')
        break
      }
    }
  })
  // WebSocket event handler
  createEffect(() => {
    const [event, data] = ws.lastEvent()
    if (!data) return
    untrack(() => {
      batch(() => {
        switch (event) {
          case 'publicChatSubscribe': {
            credentials(JSON.parse(data) as Credentials)
            break
          }
          case 'error': {
            if (data.startsWith('[PublicChat] ')) sendingMessage(false)
            break
          }
          case 'publicChat': {
            const msgs = JSON.parse(data) as ChatMessage[]
            const $credentials = credentials()
            if (msgs.some(message_ => message_.username === $credentials?.username)) {
              sendingMessage(false)
              message('')
            }
            messages(x => [...x, ...msgs])
            break
          }
        }
      })
    },
    )
  })

  // === Functions ===
  function sendMessage() {
    if (sendingMessage() || !message() || ws.status() !== WebSocketStatus.connected) return
    ws.send('publicChat', message())
    sendingMessage(true)
  }

  return (
    <div class={`card ${s.chat}`}>
      <Skeleton loading={!credentials()} offline={ws.status() === WebSocketStatus.closed}>
        <div class="card-title">CHAT</div>
        <Transition {...opacityTransitionImmediate}>
          <Show when={viewAvatar()}>
            <button class={s.avatarView} onClick={() => viewAvatar(undefined)}>
              <img alt="Avatar" src={viewAvatar()} />
            </button>
          </Show>
        </Transition>
        <div class={s.messages}>
          <div>
            <For each={messages()}>
              {message => (
                <div class={s.message}>
                  <button onClick={() => viewAvatar(message.avatar ?? '/avatar.webp')} class={s.avatar}>
                    <img alt={message.username} src={message.avatar ?? '/avatar.webp'} />
                  </button>
                  <div class={s.line}>
                    <span class={s.username}>{`<${message.username}>`}</span>
                    <span>: </span>
                    <span class={s.text}>{message.text}</span>
                  </div>
                  <span class={s.time}>{new Date(message.time).toLocaleTimeString()}</span>
                </div>
              )}
            </For>
          </div>
        </div>
        <Input value={message} placeholder="Введите сообщение" disabled={sendingMessage()} />
      </Skeleton>
    </div>
  )
}

export default Chat
