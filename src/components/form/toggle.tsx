import { Atom } from '@/services/reactive';
import { Component, JSX, Show, splitProps } from 'solid-js';

import s from './toggle.module.scss';

const Toggle: Component<
  Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'onClick' | 'onChange'> & {
    value?: Atom<boolean>;
    mutableStore?: Record<string, boolean>;
    key?: string;
    label?: string;
    onChange?: (value: boolean) => unknown;
  }
> = (properties) => {
  const [props, attributes] = splitProps(properties, ['value', 'label', 'onChange', 'mutableStore', 'key']);
  function handler() {
    if (props.value) {
      const value = props.value((x) => !x);
      props.onChange?.(value);
    } else if (props.key && props.mutableStore) {
      props.mutableStore[props.key] = !props.mutableStore[props.key];
      props.onChange?.(props.mutableStore[props.key]);
    }
  }
  return (
    <button {...attributes} class={`${s.toggle} ${attributes.class ?? ''}`} onClick={handler}>
      <div class={s.wrapper} classList={{ [s.enabled]: props.value ? props.value() : props.mutableStore![props.key!] }}>
        <div class={s.circle} />
      </div>
      <Show when={props.label}>
        <span class={s.label}>{props.label}</span>
      </Show>
    </button>
  );
};
export default Toggle;
