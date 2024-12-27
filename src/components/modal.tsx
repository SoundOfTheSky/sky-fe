/* eslint-disable jsx-a11y/no-static-element-interactions */
import { JSX, ParentComponent, Show, createEffect, createMemo, onMount, splitProps, untrack } from 'solid-js'

import basicStore from '@/services/basic.store'
import { atom } from '@/services/reactive'

import s from './modal.module.scss'

const { t } = basicStore

const Modal: ParentComponent<{
  forceFullscreen?: boolean
  dark?: boolean
  onClose?: () => unknown
  width?: string
  closed?: boolean
} & JSX.HTMLAttributes<HTMLDivElement>> = (properties_) => {
  // === Hooks ===
  const [properties, attributes] = splitProps(properties_, [
    'forceFullscreen',
    'dark',
    'onClose',
    'width',
    'closed',
    'children',
  ])
  onMount(() => {
    open()
  })
  // === State ===
  const offsetY = atom(window.innerHeight)
  const touchStartY = atom<number>()
  // === Effects ===
  createEffect(() => {
    if (properties.closed === true)
      close()
    else if (properties.closed === false)
      open()
  })
  // === Memos ===
  const fullscreen = createMemo(
    () => properties.forceFullscreen ?? window.innerHeight > window.innerWidth,
  )
  const maxOffset = createMemo(() =>
    fullscreen() ? window.innerHeight * 0.6 : window.innerHeight,
  )
  // === Functions ===
  function touchStart(event: TouchEvent | MouseEvent) {
    touchStartY('touches' in event ? event.touches[0]!.clientY : event.clientY)
  }
  function touchMove(event: TouchEvent | MouseEvent) {
    untrack(() => {
      const $touchStartY = touchStartY()
      if (!$touchStartY) return
      offsetY(
        Math.max(
          0,
          ('touches' in event ? event.touches[0]!.clientY : event.clientY) - $touchStartY,
        ),
      )
    })
  }
  function touchEnd() {
    untrack(() => {
      const $touchStartY = touchStartY()
      if (!$touchStartY) return
      const $offsetY = offsetY()
      if ($offsetY < 16 || $offsetY / (window.innerHeight - $touchStartY) > 0.2)
        close()
      else offsetY(0)
      touchStartY(undefined)
    })
  }
  function close() {
    untrack(() => {
      offsetY(maxOffset())
      setTimeout(properties.onClose!, 500)
    })
  }
  function open() {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        offsetY(0)
      })
    })
  }
  return (
    <div
      {...attributes}
      class={`${s.modalBackdrop} ${attributes.class ?? ''}`}
      style={{
        opacity: 1 - offsetY() / maxOffset(),
        transition: touchStartY() ? 'none' : undefined,
      }}
      onTouchMove={touchMove}
      onMouseMove={touchMove}
      onTouchEnd={touchEnd}
      onMouseUp={touchEnd}
    >
      <div
        class={s.modal}
        classList={{
          [s.fullscreen!]: fullscreen(),
          [s.dark!]: properties.dark,
        }}
        style={{
          transform: offsetY() ? `translateY(${offsetY()}px)` : undefined,
          transition: touchStartY() ? 'none' : undefined,
          width: properties.width,
        }}
      >
        <Show when={properties.onClose}>
          <button
            class={s.close}
            onTouchStart={touchStart}
            onMouseDown={touchStart}
          >
            <span>{t('COMMON.CLOSE')}</span>
          </button>
        </Show>
        {properties.children}
      </div>
    </div>
  )
}
export default Modal
