import { Component, Show, createEffect, createMemo, onCleanup, untrack } from 'solid-js'
import { Transition } from 'solid-transition-group'

import { atom } from '@/services/reactive'
import { changeNumberSmooth, opacityTransition } from '@/services/transition'
import { WebSocketStatus, useWebSocket } from '@/services/web-socket.context'

import s from './welcome.module.scss'

export default (() => {
  // === Hooks ===
  const ws = useWebSocket()!

  onCleanup(() => {
    if (ws.status() === WebSocketStatus.connected) ws.send('unsubscribeClicker')
  })

  // === State ===
  const active = atom(false)
  const clicks = atom(0)
  const clicksSmooth = atom(0)
  const loading = atom(true)
  const goal = 1000

  // === Memos ===
  const percentLeft = createMemo(() => Math.min(100, 100 - (clicksSmooth() / goal) * 100))

  // === Effects ===
  // WebSocket status handler
  createEffect(() => {
    if (!active()) return
    switch (ws.status()) {
      case WebSocketStatus.connecting: {
        loading(true)
        break
      }
      case WebSocketStatus.connected: {
        ws.send('subscribeClicker')
        break
      }
    }
  })

  // WebSocket event handler
  createEffect(() => {
    const [event, data] = ws.lastEvent()
    if (event === 'clicker' && data) {
      loading(false)
      clicks(Number.parseInt(data))
    }
  })

  // Animate clicks
  createEffect(() => {
    const $clicks = clicks()
    const $currentClicks = untrack(clicksSmooth)
    if ($clicks - 1 === $currentClicks) clicksSmooth($clicks)
    else
      changeNumberSmooth($currentClicks, $clicks, 1000, (n) => {
        if (untrack(clicks) !== $clicks) return
        clicksSmooth(~~n)
      })
  })

  // === Functions ===
  function clickerClick() {
    ws.send('clickerClick')
    clicks(x => x + 1)
  }

  return (
    <div class={`card ${s.welcome}`}>
      <Transition {...opacityTransition}>
        <Show
          when={ws.status() === WebSocketStatus.connected && !loading()}
          fallback={<button onClick={() => active(true)}>{location.hostname.toUpperCase()}</button>}
        >
          <button class={s.clicker} onClick={clickerClick} style={{ 'background-position-x': `${percentLeft()}%` }}>
            {clicksSmooth()}
          </button>
        </Show>
      </Transition>
    </div>
  )
}) as Component
