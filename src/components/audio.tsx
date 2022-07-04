import { Component, batch, createEffect, createMemo, onCleanup, untrack } from 'solid-js';
import { mdiPause, mdiPlay } from '@mdi/js';

import AudioStore from '@/services/audio.store';
import { atom, onMounted } from '@/services/reactive';
import { request } from '@/services/fetch';
import Icon from './icon';

onMounted;

const Audio: Component<{ src: string; title: string; autoplay?: boolean }> = (properties) => {
  // === State ===
  const loading = atom(false);
  const src = atom<string>();

  // === Memos ===
  const playingCurrent = createMemo(() => src() && AudioStore.current()?.src === src());

  // === Functions ===
  function mounted() {
    if (properties.autoplay) void play(true);
  }
  async function play(auto?: boolean) {
    if (playingCurrent()) {
      AudioStore.playing(false);
      return;
    }
    if (!src()) {
      loading(true);
      src(URL.createObjectURL(await request(properties.src)));
      loading(false);
    }
    const $queue = AudioStore.queue();
    batch(() => {
      const $playing = AudioStore.playing();
      const $src = src()!;
      let i = $queue.findIndex((x) => x.src === $src);
      if (i === -1) {
        i = $queue.length;
        AudioStore.queue([
          ...$queue,
          {
            src: $src,
            title: properties.title,
          },
        ]);
      }
      if (!auto || !$playing) AudioStore.currentI(i);
      if (!$playing) AudioStore.playing(true);
    });
  }
  function cleanup() {
    const $src = untrack(src);
    batch(() => {
      if (untrack(playingCurrent)) {
        AudioStore.playing(false);
        AudioStore.currentI(0);
      }
      AudioStore.queue((x) => x.filter((track) => track.src !== $src));
      src(undefined);
    });
  }

  // === Effects ===
  // Revoke objects to prevent memory leak
  createEffect<string | undefined>((oldSrc) => {
    if (oldSrc) URL.revokeObjectURL(oldSrc);
    return src();
  });
  // On src change delete track
  createEffect((origSrc: string | undefined) => {
    if (properties.src !== origSrc) cleanup();
    return properties.src;
  });
  onCleanup(cleanup);
  return (
    <button onClick={() => play()} disabled={loading()} use:onMounted={mounted}>
      <Icon path={playingCurrent() ? mdiPause : mdiPlay} inline />
      {properties.title}
    </button>
  );
};
export default Audio;
