import {
  JSX,
  Show,
  createEffect,
  createMemo,
  onCleanup,
  splitProps,
} from 'solid-js'
import { bind as wkBind, unbind as wkUnbind } from 'wanakana'

import { Atom, atom } from '@/services/reactive'

import s from './input.module.scss'

type Options = {
  value?: Atom<string> | string
  japanese?: boolean
  onInput?: (value: string) => unknown
  success?: boolean
  error?: boolean
  badgeCustomText?: (value: number) => string | number
  multiline?: boolean
}
function Input(
  properties_: Omit<JSX.InputHTMLAttributes<HTMLInputElement>, keyof Options> &
    Options,
) {
  // === State ===
  const [properties, attributes] = splitProps(properties_, [
    'value',
    'japanese',
    'onInput',
    'success',
    'error',
    'multiline',
    'badgeCustomText',
  ])
  const element = atom<HTMLInputElement | HTMLTextAreaElement>()

  // === Effects ===
  createEffect(() => {
    const $element = element()
    if (properties.japanese) wkBind($element)
  })
  onCleanup(() => {
    const $element = element()
    if ($element && properties.japanese) wkUnbind($element)
  })

  // === Memos ===
  const value = createMemo(() => {
    if (typeof properties.value === 'function') return properties.value()
    return properties.value
  })

  // === Functions ===
  function inputHandler(event: {
    target: HTMLInputElement | HTMLTextAreaElement
  }) {
    const value = event.target.value
    if (typeof properties.value === 'function') properties.value(value)
    properties.onInput?.(value)
  }
  function calcRangeValueBadgeTranslate() {
    const $value = value()
    if (!$value) return 0
    const min = properties_.min ? Number.parseInt(properties_.min as string) : 0
    const max = properties_.max
      ? Number.parseInt(properties_.max as string)
      : 100
    return (Number.parseInt($value) - min) / (max - min)
  }

  return (
    <Show
      when={properties.multiline}
      fallback={
        <div class={s.inputWrapper}>
          <Show when={properties_.type === 'range'}>
            <div
              class={s.rangeValueBadge}
              style={{
                left: `calc(13px + ((100% - 21px) * ${calcRangeValueBadgeTranslate()}))`,
              }}
            >
              {properties.badgeCustomText
                ? properties.badgeCustomText(Number.parseInt(value()!))
                : value()}
            </div>
          </Show>
          <input
            {...(attributes as JSX.InputHTMLAttributes<HTMLInputElement>)}
            class={[
              s.input,
              properties.success && s.success,
              properties.error && s.error,
              attributes.class,
            ]
              .filter(Boolean)
              .join(' ')}
            onInput={inputHandler}
            value={value()}
            ref={(x) => element(x)}
          />
        </div>
      }
    >
      <div class={s.textareaWrap} data-value={value()}>
        <textarea
          {...(attributes as JSX.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          class={[
            s.input,
            properties.success && s.success,
            properties.error && s.error,
            attributes.class,
          ]
            .filter(Boolean)
            .join(' ')}
          onInput={inputHandler}
          value={value()}
          ref={(x) => element(x)}
        />
      </div>
    </Show>
  )
}
export default Input
