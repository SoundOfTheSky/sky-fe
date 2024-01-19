import { JSX, ParentComponent, Show, children, createEffect, onCleanup } from 'solid-js';
import { Transition } from 'solid-transition-group';

import { opacityTransitionImmediate } from '@/services/transition';
import { atom, onOutside } from '@/services/reactive';

import s from './tooltip.module.scss';

onOutside;

const Tooltip: ParentComponent<{ content: JSX.Element | string | number }> = (properties) => {
  // === Hooks ===
  onCleanup(() => {
    clean(c() as HTMLElement);
  });
  // === State ===
  const isOpen = atom(false);
  const c = children(() => properties.children);
  const pos = atom({ x: 0, y: 0, top: true });

  // === Effects ===
  createEffect<HTMLElement>((old) => {
    if (old) clean(old);
    const c$ = c() as HTMLElement;
    c$.addEventListener('click', open);
    c$.addEventListener('mouseenter', open);
    c$.addEventListener('mouseleave', close);
    const box = c$.getBoundingClientRect();
    const top = (box.y + box.height) * 2 > window.innerHeight;
    pos({ x: box.x + box.width / 2, y: top ? box.y - 8 : box.y + box.height + 8, top });
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
              left: pos().x + 'px',
              top: pos().y + 'px',
              transform: pos().top ? `translate(-50%, -100%)` : undefined,
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
