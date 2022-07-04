import { createMemo, createRoot } from 'solid-js';
import { atom } from './reactive';

export type Audio = {
  title: string;
  src: string;
};
export default createRoot(() => {
  // === State ===
  const playing = atom(false);
  const maxTime = atom(0);
  const time = atom(0);
  const currentI = atom(0);
  const queue = atom<Audio[]>([]);
  // === Memos ===
  const current = createMemo<Audio | undefined>(() => queue()[currentI()]);
  return {
    currentI,
    playing,
    queue,
    time,
    current,
    maxTime,
  };
});
