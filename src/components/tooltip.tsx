import { atom, onOutside } from '@/services/reactive';
import { JSX, ParentComponent, Show, children, createEffect, onCleanup } from 'solid-js';

import s from './tooltip.module.scss';
import { Transition } from 'solid-transition-group';
import { opacityTransitionImmediate } from '@/services/transition';

onOutside;

const Tooltip: ParentComponent<{ content: JSX.Element | string | number }> = (properties) => {
  // === Hooks ===
  onCleanup(() => {
    clean(c() as HTMLElement);
  });
  // === State ===
  const isOpen = atom(false);
  const c = children(() => properties.children);
  const pos = atom([0, 0]);

  // === Effects ===
  createEffect<HTMLElement>((old) => {
    if (old) clean(old);
    const c$ = c() as HTMLElement;
    c$.addEventListener('click', open);
    c$.addEventListener('mouseenter', open);
    c$.addEventListener('mouseleave', close);
    const box = c$.getBoundingClientRect();
    pos([box.x + box.width / 2, box.y - 8]);
    return c$;
  });
  // === Functions ===
  function open() {
    setTimeout(() => {
      isOpen(true);
    });
  }
  function close() {
    isOpen(false);
  }
  function clean(item: HTMLElement) {
    item.removeEventListener('click', open);
    item.removeEventListener('mouseenter', open);
    item.removeEventListener('mouseleave', close);
  }

  return (
    <>
      {c()}
      <Transition {...opacityTransitionImmediate}>
        <Show when={isOpen()}>
          <div
            class={s.tooltip}
            style={{
              left: pos()[0] + 'px',
              top: pos()[1] + 'px',
            }}
            use:onOutside={['click', close]}
          >
            <Show when={typeof properties.content === 'string'} fallback={properties.content}>
              <div class='tooltip-content'>{properties.content}</div>
            </Show>
          </div>
        </Show>
      </Transition>
    </>
  );
};
export default Tooltip;
