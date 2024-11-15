import {
  JSX,
  ParentComponent,
  Show,
  children,
  createEffect,
  onCleanup,
} from 'solid-js'
import { Transition } from 'solid-transition-group'

import { atom, onOutside, useGlobalEvent } from '@/services/reactive'
import { opacityTransitionImmediate } from '@/services/transition'

import s from './tooltip.module.scss'

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
onOutside

const Tooltip: ParentComponent<{ content: JSX.Element | string | number }> = (
  properties,
) => {
  // === Hooks ===
  onCleanup(() => {
    clean(c() as HTMLElement)
  })
  useGlobalEvent('click', (event) => {
    const $c = c() as HTMLElement | undefined
    if (!$c || !event.target || !tooltipElement) return
    if (
      !$c.contains(event.target as HTMLElement)
      && !tooltipElement.contains(event.target as HTMLElement)
    )
      close()
  })

  // === State ===
  const isOpen = atom(false)
  const c = children(() => properties.children)
  const pos = atom({ x: 0, y: 0, top: true })
  let tooltipElement: HTMLDivElement | undefined

  // === Effects ===
  createEffect<HTMLElement>((old) => {
    if (old) clean(old)
    const $c = c() as HTMLElement
    $c.addEventListener('click', open)
    $c.addEventListener('mouseenter', open)
    $c.addEventListener('mouseleave', close)
    return $c
  })

  // === Functions ===
  function open() {
    const $c = c() as HTMLElement | undefined
    if (!$c) return
    const box = $c.getBoundingClientRect()
    const top = (box.y + box.height) * 2 > window.innerHeight
    pos({
      x: box.x + box.width / 2,
      y: top ? box.y - 8 : box.y + box.height + 8,
      top,
    })
    isOpen(true)
  }
  function close() {
    isOpen(false)
  }
  function clean(item: HTMLElement) {
    item.removeEventListener('click', open)
    item.removeEventListener('mouseenter', open)
    item.removeEventListener('mouseleave', close)
  }

  return (
    <>
      {c()}
      <Transition {...opacityTransitionImmediate}>
        <Show when={isOpen()}>
          <div
            class={s.tooltip}
            style={{
              left: pos().x + 'px',
              top: pos().y + 'px',
              transform: pos().top ? `translate(-50%, -100%)` : undefined,
            }}
            ref={tooltipElement}
          >
            <Show
              when={typeof properties.content === 'string'}
              fallback={properties.content}
            >
              <div class={s.tooltipContent}>{properties.content}</div>
            </Show>
          </div>
        </Show>
      </Transition>
    </>
  )
}
export default Tooltip
