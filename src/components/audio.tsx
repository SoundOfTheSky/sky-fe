import { mdiPause, mdiPlay } from '@mdi/js';
import { Component, batch, createEffect, createMemo, onCleanup, untrack } from 'solid-js';

import AudioStore from '@/services/audio.store';
import { request } from '@/services/fetch';
import { atom, onMounted } from '@/services/reactive';

import Button from './form/button';
import Icon from './icon';

onMounted;

const Audio: Component<{ src: string; title: string; autoplay?: boolean }> = (properties) => {
  // === Hooks ===
  const { playing, current, queue, currentI } = AudioStore;
  onCleanup(cleanup);

  // === State ===
  const loading = atom(false);
  const src = atom<string>();

  // === Memos ===
  const playingCurrent = createMemo(() => src() && current()?.src === src() && playing());

  // === Functions ===
  function mounted() {
    if (properties.autoplay) void play(true);
  }
  async function play(auto?: boolean) {
    if (playingCurrent()) {
      playing(false);
      return;
    }
    if (!src()) {
      loading(true);
      src(URL.createObjectURL(await request(properties.src)));
      loading(false);
    }
    const $queue = queue();
    batch(() => {
      const $playing = playing();
      const $src = src()!;
      let i = $queue.findIndex((x) => x.src === $src);
      if (i === -1) {
        i = $queue.length;
        queue([
          ...$queue,
          {
            src: $src,
            title: properties.title,
          },
        ]);
      }
      if (!auto || !$playing) currentI(i);
      if (!$playing) playing(true);
    });
  }
  function cleanup() {
    untrack(() =>
      batch(() => {
        const $src = src();
        if ($src && current()?.src === $src) {
          playing(false);
          currentI(0);
        }
        queue((x) => x.filter((track) => track.src !== $src));
        src(undefined);
      }),
    );
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

  return (
    <Button onClick={() => play()} disabled={loading()} use:onMounted={mounted}>
      <Icon path={playingCurrent() ? mdiPause : mdiPlay} inline size='24' />
      {properties.title}
    </Button>
  );
};
export default Audio;
