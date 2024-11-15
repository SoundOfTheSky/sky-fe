import { Component, JSX, Show, splitProps } from 'solid-js'

import { Atom } from '@/services/reactive'

import s from './toggle.module.scss'

type Options = {
  onChange?: (value: boolean) => unknown
  value?: Atom<boolean>
  store?: Record<string, boolean>
  key?: string
  label?: string
}
export type Properties = Omit<
  JSX.HTMLAttributes<HTMLButtonElement>,
  keyof Options
> &
Options

const Toggle: Component<Properties> = (properties) => {
  const [properties_, attributes] = splitProps(properties, [
    'value',
    'label',
    'onChange',
    'store',
    'key',
  ])
  function handler() {
    if (properties_.value) {
      const value = properties_.value(x => !x)
      properties_.onChange?.(value)
    }
    else if (properties_.key && properties_.store) {
      properties_.store[properties_.key] = !properties_.store[properties_.key]
      properties_.onChange?.(properties_.store[properties_.key]!)
    }
  }
  return (
    <button
      {...attributes}
      class={`${s.toggle} ${attributes.class ?? ''}`}
      onClick={handler}
    >
      <div
        class={s.wrapper}
        classList={{
          [s.enabled!]: properties_.value ? properties_.value() : properties_.store![properties_.key!],
        }}
      >
        <div class={s.circle} />
      </div>
      <Show when={properties_.label}>
        <span class={s.label}>{properties_.label}</span>
      </Show>
    </button>
  )
}
export default Toggle
