import { createMemo, For, JSX, Show, splitProps } from 'solid-js';

import { atom, Atom } from '@/services/reactive';

import Icon from '../icon';
import Tooltip from '../tooltip';

import s from './select-line.module.scss';

type Options<T> = {
  buttons: {
    value: T;
    tooltip?: string;
    title?: string;
    icon?: string;
    selectorColor?: string;
  }[];
  onChange?: (value: T) => unknown;
  value?: Atom<T>;
  store?: Record<string, T>;
  key?: string;
};
export type Properties<T> = Omit<
  JSX.HTMLAttributes<HTMLDivElement>,
  keyof Options<T>
> &
  Options<T>;

function SelectLine<T extends string | number | boolean>(
  properties: Properties<T>,
) {
  // === Hooks ===
  const [props, attributes] = splitProps(properties, [
    'onChange',
    'value',
    'store',
    'key',
    'buttons',
  ]);

  // === State ===
  const hovering = atom(false);
  const hoverI = atom(0);

  // === Memos ===
  const value = createMemo(() =>
    props.key && props.store ? props.store[props.key] : props.value?.(),
  );
  const valueI = createMemo(() => {
    const $value = value();
    return properties.buttons.findIndex((b) => b.value === $value);
  });
  const currentOptions = createMemo(() => props.buttons[valueI()]);

  // === Functions ===
  function handler(value: T) {
    if (props.value) {
      props.value(value as never);
      props.onChange?.(value);
    } else if (props.key && props.store) {
      props.store[props.key] = value;
      props.onChange?.(value);
    }
  }
  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      {...attributes}
      class={`${s.selectLine} ${attributes.class ?? ''}`}
      onMouseEnter={() => hovering(true)}
      onMouseLeave={() => hovering(false)}
    >
      <div
        class={s.hoverer}
        style={{
          transform: `translateX(${hoverI() * 100}%)`,
          width: `${100 / props.buttons.length}%`,
          opacity: hovering() ? 1 : 0,
        }}
      />
      <div
        class={s.selector}
        style={{
          transform: `translateX(${valueI() * 100}%)`,
          width: `${100 / props.buttons.length}%`,
          opacity: valueI() !== -1 ? 1 : 0,
          'background-color': currentOptions()?.selectorColor,
        }}
      />
      <For each={props.buttons}>
        {(button, i) => (
          <Tooltip content={button.tooltip ?? ''}>
            <button
              onClick={() => {
                handler(button.value);
              }}
              onMouseEnter={() => hoverI(i())}
            >
              <Show when={button.title}>{button.title!}</Show>
              <Show when={button.icon}>
                <Icon path={button.icon!} size='32' />
              </Show>
            </button>
          </Tooltip>
        )}
      </For>
    </div>
  );
}
export default SelectLine;
