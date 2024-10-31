import { Component, JSX, Show, splitProps } from 'solid-js';

import { Atom } from '@/services/reactive';

import s from './toggle.module.scss';

type Options = {
  onChange?: (value: boolean) => unknown;
  value?: Atom<boolean>;
  store?: Record<string, boolean>;
  key?: string;
  label?: string;
};
export type Properties = Omit<
  JSX.HTMLAttributes<HTMLButtonElement>,
  keyof Options
> &
  Options;

const Toggle: Component<Properties> = (properties) => {
  const [props, attributes] = splitProps(properties, [
    'value',
    'label',
    'onChange',
    'store',
    'key',
  ]);
  function handler() {
    if (props.value) {
      const value = props.value((x) => !x);
      props.onChange?.(value);
    } else if (props.key && props.store) {
      props.store[props.key] = !props.store[props.key];
      props.onChange?.(props.store[props.key]!);
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
          [s.enabled!]: props.value ? props.value() : props.store![props.key!],
        }}
      >
        <div class={s.circle} />
      </div>
      <Show when={props.label}>
        <span class={s.label}>{props.label}</span>
      </Show>
    </button>
  );
};
export default Toggle;
