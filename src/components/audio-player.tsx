import { mdiClose, mdiPause, mdiPlay, mdiSkipNext, mdiSkipPrevious } from '@mdi/js';
import { Component, Show, batch, createEffect } from 'solid-js';
import { Transition } from 'solid-transition-group';

import AudioStore from '@/services/audio.store';
import { atom, useInterval } from '@/services/reactive';
import { slideDownTransition } from '@/services/transition';

import Button from './form/button';
import Icon from './icon';

import s from './audio-player.module.scss';

const AudioPlayer: Component = () => {
  const { current, maxTime, playing, queue, time, currentI } = AudioStore;
  // === State ===
  const audioElement = atom<HTMLAudioElement>();
  let updateProgressInterval: number | undefined;

  // === Effects ===
  // Change time
  createEffect(() => {
    const $time = time();
    const $audio = audioElement();
    if ($audio && $time !== $audio.currentTime) $audio.currentTime = $time;
  });
  // Play/pause
  createEffect(() => {
    const $playing = playing();
    const $audio = audioElement();
    if (!$audio) return;
    if ($playing) {
      if (!updateProgressInterval) updateProgressInterval = useInterval(() => time($audio.currentTime), 50);
      if ($audio.paused) void $audio.play();
    } else {
      if (updateProgressInterval) {
        clearInterval(updateProgressInterval);
        updateProgressInterval = undefined;
      }
      if (!$audio.paused) $audio.pause();
    }
  });
  // Change
  createEffect(() => {
    const $current = current();
    const $audio = audioElement();
    if (!$audio || !$current || $current.src === $audio.src) return;
    $audio.src = $current.src;
  });

  // === Functions ===
  function onCanPlay() {
    maxTime(audioElement()?.duration ?? 0);
  }
  function onProgressClick(event: MouseEvent) {
    const element = event.currentTarget as HTMLDivElement;
    time(((event.clientX - element.offsetLeft) / element.clientWidth) * maxTime());
  }
  function onEnded() {
    batch(() => {
      time(0);
      const $currentI = currentI();
      if ($currentI < queue().length - 1) changeTrack(1);
    });
  }
  function formatTime(time: number) {
    const min = Math.floor(time / 60)
      .toString()
      .padStart(2, '0');
    const sec = Math.floor(time % 60)
      .toString()
      .padStart(2, '0');
    return `${min}:${sec}`;
  }
  function changeTrack(delta: number) {
    playing(false);
    batch(() => {
      time(0);
      currentI((x) => x + delta);
      playing(true);
    });
  }

  return (
    <Transition {...slideDownTransition}>
      <Show when={queue().length > 0}>
        <div class={s.audioPlayer}>
          <audio
            ref={(el) => audioElement(el)}
            class={s.audio}
            onPlay={() => playing(true)}
            onPause={() => playing(false)}
            onCanPlay={onCanPlay}
            onEnded={onEnded}
          />
          <Button disabled={currentI() < 1} onClick={() => changeTrack(-1)}>
            <Icon path={mdiSkipPrevious} size='32' />
          </Button>
          <Button onClick={() => playing((x) => !x)}>
            <Icon path={playing() ? mdiPause : mdiPlay} size='32' />
          </Button>
          <Button disabled={currentI() >= queue().length - 1} onClick={() => changeTrack(1)}>
            <Icon path={mdiSkipNext} size='32' />
          </Button>
          {
            // eslint-disable-next-line prettier/prettier, jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
          }<div class={s.progress} onClick={onProgressClick}>
            <div>
              {formatTime(time())} {queue().length === 1 ? '' : `${currentI() + 1} of ${queue().length}`}
            </div>
            <div>{formatTime(maxTime())}</div>
            <div
              class={s.line}
              style={{
                transform: `scaleX(${time() / maxTime()})`,
              }}
            />
          </div>
          <Button onClick={() => queue([])}>
            <Icon path={mdiClose} size='32' />
          </Button>
        </div>
      </Show>
    </Transition>
  );
};
export default AudioPlayer;
