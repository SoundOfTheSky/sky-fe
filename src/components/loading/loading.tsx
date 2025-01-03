import { ParentComponent, Show, createEffect } from 'solid-js';

import { atom, onMounted, useInterval, useTimeout } from '@/services/reactive';

import kaomojiRaw from './kaomoji?raw';

import s from './loading.module.scss';

onMounted;

const kaomoji = kaomojiRaw.split('\n');

const Loading: ParentComponent<{ when: unknown }> = (properties) => {
  const text = atom('');
  const takingLong = atom(false);
  const mounted = atom(false);
  const setRandomKaomoji = () => text(kaomoji[~~(Math.random() * kaomoji.length)]);
  let takingLongTimeout: number;
  let kaomojiInterval: number;
  setRandomKaomoji();
  createEffect(() => {
    if (!mounted()) return;
    if (properties.when) {
      clearTimeout(takingLongTimeout);
      clearInterval(kaomojiInterval);
      takingLong(false);
    } else {
      takingLongTimeout = useTimeout(() => takingLong(true), 10_000);
      kaomojiInterval = useInterval(setRandomKaomoji, 300);
    }
  });
  return (
    <Show
      when={properties.when}
      fallback={
        <div class={s.loadingComponent} use:onMounted={() => mounted(true)}>
          <div>{text()}</div>
          <Show when={takingLong()}>
            <div>Loading is taking too long...</div>
          </Show>
        </div>
      }
    >
      {properties.children}
    </Show>
  );
};
export default Loading;
