import { batch, createEffect, createMemo, createRoot } from 'solid-js';

import { atom } from './reactive';

export type Audio = {
  title: string;
  src: string;
};
export default createRoot(() => {
  // === State ===
  const loading = atom(false);
  const playing = atom(false);
  const maxTime = atom(0);
  const time = atom(0);
  const currentI = atom(0);
  const queue = atom<Audio[]>([]);

  // === Memos ===
  const current = createMemo<Audio | undefined>(() => queue()[currentI()]);

  // === Effects ===
  // On track change
  createEffect(() => {
    current();
    onTrackChange();
  });

  // === Function ===
  function onTrackChange() {
    batch(() => {
      time(0);
      maxTime(0);
      loading(true);
    });
  }

  return {
    currentI,
    playing,
    queue,
    time,
    current,
    maxTime,
    onTrackChange,
    loading,
  };
});
