import { ParentComponent, untrack, Show, onMount } from 'solid-js';

import { atom } from '@/services/reactive';

import s from './dialog.module.scss';

const Dialog: ParentComponent<{ forceFullscreen?: boolean; dark?: boolean; onClose?: () => unknown }> = (
  properties,
) => {
  // === Hooks ===
  onMount(() => {
    setTimeout(() => {
      hidePercent(0);
    }, 0);
  });
  // === State ===
  const hidePercent = atom(100);
  const moving = atom(false);

  // === Functions ===
  function touchStart() {
    moving(true);
  }
  function touchMove(e: TouchEvent) {
    untrack(() => {
      if (!moving()) return;
      hidePercent(Math.max(0, ((e.touches[0].clientY - 16) / window.innerHeight) * 100));
    });
  }
  function touchEnd() {
    untrack(() => {
      if (!moving()) return;
      if (hidePercent() > 20) close();
      else hidePercent(0);
      moving(false);
    });
  }
  function close() {
    untrack(() => {
      hidePercent(100);
      setTimeout(properties.onClose!, 200);
    });
  }
  return (
    <div
      class={s.dialogBackdrop}
      style={{
        opacity: 1 - hidePercent() / 100,
        transition: moving() ? 'none' : undefined,
      }}
    >
      <div
        class={s.dialog}
        classList={{
          [s.fullscreen]: properties.forceFullscreen ?? window.innerHeight > window.innerWidth,
          [s.dark]: properties.dark,
        }}
        style={{
          transform: `translateY(${hidePercent()}%)`,
          transition: moving() ? 'none' : undefined,
        }}
        onTouchMove={touchMove}
        onTouchEnd={touchEnd}
      >
        <Show when={properties.onClose}>
          <button class={s.close} onTouchStart={touchStart} onClick={close}>
            <span>Hide</span>
          </button>
        </Show>
        {properties.children}
      </div>
    </div>
  );
};
export default Dialog;
