import { JSX, Show, createEffect, onCleanup, splitProps } from 'solid-js'
import { bind as wkBind, unbind as wkUnbind } from 'wanakana'

import { Atom, atom } from '@/services/reactive'

import s from './input.module.scss'

type Options = {
  value: Atom<string>
  japanese?: boolean
  onInput?: (value: string) => unknown
  success?: boolean
  error?: boolean
}
function Input(
  properties:
    | (Omit<
      JSX.InputHTMLAttributes<HTMLInputElement>,
        'onInput' | 'value' | 'multiline'
    > & {
      multiline?: false
    } & Options)
    | (Omit<
      JSX.TextareaHTMLAttributes<HTMLTextAreaElement>,
        'onInput' | 'value' | 'multiline'
    > & {
      multiline: true
    } & Options),
) {
  // === State ===
  const [properties_, attributes] = splitProps(properties, [
    'value',
    'multiline',
    'japanese',
    'onInput',
    'success',
    'error',
  ])
  const element = atom<HTMLInputElement | HTMLTextAreaElement>()

  // === Effects ===
  createEffect(() => {
    const $element = element()
    if (properties_.japanese) wkBind($element)
  })
  onCleanup(() => {
    const $element = element()
    if ($element && properties_.japanese) wkUnbind($element)
  })
  // === Memos ===
  // const textareaHeight = createMemo(() => {
  //   const $element = element();
  //   if (!props.multiline || !$element || !props.value()) return 36;
  //   return $element.scrollHeight;
  // });

  // === Functions ===
  function changeHandler(event: { target: HTMLInputElement }) {
    properties_.value(event.target.value)
    properties_.onInput?.(event.target.value)
  }

  return (
    <Show
      when={properties_.multiline}
      fallback={(
        <input
          {...(attributes as JSX.InputHTMLAttributes<HTMLInputElement>)}
          class={[
            s.input,
            properties_.success && s.success,
            properties_.error && s.error,
            attributes.class,
          ]
            .filter(Boolean)
            .join(' ')}
          onInput={changeHandler}
          value={properties_.value()}
          ref={x => element(x)}
        />
      )}
    >
      <div class={s.textareaWrap} data-value={properties_.value()}>
        <textarea
          {...(attributes as JSX.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          class={[
            s.input,
            properties_.success && s.success,
            properties_.error && s.error,
            attributes.class,
          ]
            .filter(Boolean)
            .join(' ')}
          onInput={x => properties_.value(x.target.value)}
          value={properties_.value()}
          ref={x => element(x)}
          // style={{ height: textareaHeight() + 'px' }}
        />
      </div>
    </Show>
  )
}
export default Input
