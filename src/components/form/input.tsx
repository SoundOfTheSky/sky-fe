import { JSX, Show, createEffect, onCleanup, splitProps } from 'solid-js';
import { bind as wkBind, unbind as wkUnbind } from 'wanakana';

import { Atom, atom } from '@/services/reactive';

import s from './input.module.scss';

type Options = {
  value: Atom<string>;
  japanese?: boolean;
  onInput?: (value: string) => unknown;
  success?: boolean;
  error?: boolean;
};
function Input(
  properties:
    | (Omit<
        JSX.InputHTMLAttributes<HTMLInputElement>,
        'onInput' | 'value' | 'multiline'
      > & {
        multiline?: false;
      } & Options)
    | (Omit<
        JSX.TextareaHTMLAttributes<HTMLTextAreaElement>,
        'onInput' | 'value' | 'multiline'
      > & {
        multiline: true;
      } & Options),
) {
  // === State ===
  const [props, attributes] = splitProps(properties, [
    'value',
    'multiline',
    'japanese',
    'onInput',
    'success',
    'error',
  ]);
  const element = atom<HTMLInputElement | HTMLTextAreaElement>();

  // === Effects ===
  createEffect(() => {
    const $element = element();
    if (props.japanese) wkBind($element);
  });
  onCleanup(() => {
    const $element = element();
    if ($element && props.japanese) wkUnbind($element);
  });
  // === Memos ===
  // const textareaHeight = createMemo(() => {
  //   const $element = element();
  //   if (!props.multiline || !$element || !props.value()) return 36;
  //   return $element.scrollHeight;
  // });

  // === Functions ===
  function changeHandler(e: { target: HTMLInputElement }) {
    props.value(e.target.value);
    props.onInput?.(e.target.value);
  }

  return (
    <Show
      when={props.multiline}
      fallback={
        <input
          {...(attributes as JSX.InputHTMLAttributes<HTMLInputElement>)}
          class={[
            s.input,
            props.success && s.success,
            props.error && s.error,
            attributes.class,
          ]
            .filter(Boolean)
            .join(' ')}
          onInput={changeHandler}
          value={props.value()}
          ref={(x) => element(x)}
        />
      }
    >
      <div class={s.textareaWrap} data-value={props.value()}>
        <textarea
          {...(attributes as JSX.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          class={[
            s.input,
            props.success && s.success,
            props.error && s.error,
            attributes.class,
          ]
            .filter(Boolean)
            .join(' ')}
          onInput={(x) => props.value(x.target.value)}
          value={props.value()}
          ref={(x) => element(x)}
          // style={{ height: textareaHeight() + 'px' }}
        />
      </div>
    </Show>
  );
}
export default Input;
