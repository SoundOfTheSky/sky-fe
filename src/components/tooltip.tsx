import { JSX, ParentComponent, Show, children, createEffect, getOwner, onCleanup, runWithOwner } from 'solid-js';
import { Transition } from 'solid-transition-group';

import { atom, onOutside, useTimeout } from '@/services/reactive';
import { opacityTransitionImmediate } from '@/services/transition';

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
  let timeout: number;
  const owner = getOwner();

  // === Effects ===
  createEffect<HTMLElement>((old) => {
    if (old) clean(old);
    const $c = c() as HTMLElement;
    $c.addEventListener('click', open);
    $c.addEventListener('mouseenter', open);
    $c.addEventListener('mouseleave', close);
    return $c;
  });

  // === Functions ===
  function open() {
    runWithOwner(owner, () => {
      timeout = useTimeout(() => {
        const $c = c() as HTMLElement;
        if (!$c) return;
        const box = $c.getBoundingClientRect();
        const top = (box.y + box.height) * 2 > window.innerHeight;
        pos({ x: box.x + box.width / 2, y: top ? box.y - 8 : box.y + box.height + 8, top });
        isOpen(true);
      }, 500);
    });
  }
  function close() {
    clearTimeout(timeout);
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
              <div class={s.tooltipContent}>{properties.content}</div>
            </Show>
          </div>
        </Show>
      </Transition>
    </>
  );
};
export default Tooltip;
