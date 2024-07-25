/* eslint-disable jsx-a11y/no-static-element-interactions */
import { ParentComponent, untrack, Show, onMount, createMemo } from 'solid-js';

import { atom } from '@/services/reactive';

import s from './dialog.module.scss';

const Dialog: ParentComponent<{
  forceFullscreen?: boolean;
  dark?: boolean;
  onClose?: () => unknown;
  width?: string;
}> = (properties) => {
  // === Hooks ===
  onMount(() => {
    setTimeout(() => {
      offsetY(0);
    }, 0);
  });
  // === State ===
  const offsetY = atom(window.innerHeight);
  const touchStartY = atom<number>();
  // === Memos ===
  const fullscreen = createMemo(() => properties.forceFullscreen ?? window.innerHeight > window.innerWidth);
  const maxOffset = createMemo(() => (fullscreen() ? window.innerHeight * 0.6 : window.innerHeight));
  // === Functions ===
  function touchStart(e: TouchEvent | MouseEvent) {
    touchStartY('touches' in e ? e.touches[0].clientY : e.clientY);
  }
  function touchMove(e: TouchEvent | MouseEvent) {
    untrack(() => {
      const $touchStartY = touchStartY();
      if (!$touchStartY) return;
      offsetY(Math.max(0, ('touches' in e ? e.touches[0].clientY : e.clientY) - $touchStartY));
    });
  }
  function touchEnd() {
    untrack(() => {
      const $touchStartY = touchStartY();
      if (!$touchStartY) return;
      const $offsetY = offsetY();
      if ($offsetY < 16 || $offsetY / (window.innerHeight - $touchStartY) > 0.2) close();
      else offsetY(0);
      touchStartY(undefined);
    });
  }
  function close() {
    untrack(() => {
      offsetY(maxOffset());
      setTimeout(properties.onClose!, 200);
    });
  }
  return (
    <div
      class={s.dialogBackdrop}
      style={{
        opacity: 1 - offsetY() / maxOffset(),
        transition: touchStartY() ? 'none' : undefined,
      }}
      onTouchMove={touchMove}
      onMouseMove={touchMove}
      onTouchEnd={touchEnd}
      onMouseUp={touchEnd}
    >
      <div
        class={s.dialog}
        classList={{
          [s.fullscreen]: fullscreen(),
          [s.dark]: properties.dark,
        }}
        style={{
          transform: offsetY() ? `translateY(${offsetY()}px)` : undefined,
          transition: touchStartY() ? 'none' : undefined,
          width: properties.width,
        }}
      >
        <Show when={properties.onClose}>
          <button class={s.close} onTouchStart={touchStart} onMouseDown={touchStart}>
            <span>Hide</span>
          </button>
        </Show>
        {properties.children}
      </div>
    </div>
  );
};
export default Dialog;
