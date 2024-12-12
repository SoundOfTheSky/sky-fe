import {
  mdiClose,
  mdiPause,
  mdiPlay,
  mdiSkipNext,
  mdiSkipPrevious,
} from '@mdi/js'
import { formatTime } from '@softsky/utils'
import {
  Component,
  Show,
  batch,
  createEffect,
  getOwner,
  runWithOwner,
  untrack,
} from 'solid-js'

import AudioStore from '@/services/audio.store'
import { atom, useInterval, useTimeout } from '@/services/reactive'

import Icon from './icon'

import s from './audio-player.module.scss'

const AudioPlayer: Component = () => {
  // === Hooks ===
  const { current, maxTime, playing, queue, time, currentI, loading }
    = AudioStore

  // === State ===
  const audioElement = atom<HTMLAudioElement>()
  const shown = atom(false)
  let timeout: number
  let updateProgressInterval: number | undefined
  const owner = getOwner()

  // === Effects ===
  // Show/hide
  createEffect(() => {
    clearTimeout(timeout)
    if (queue().length === 0)
      timeout = useTimeout(() => {
        shown(false)
      }, 500)
    else shown(true)
  })
  // Change time
  createEffect(() => {
    const $time = time()
    const $audio = audioElement()
    if ($audio && $time !== $audio.currentTime) $audio.currentTime = $time
  })
  // Play/pause
  createEffect(() => {
    const $playing = playing()
    const $audio = audioElement()
    const $current = current()
    if (
      $audio
      && $current
      && $current.src !== $audio.src.replace(location.origin, '')
    )
      $audio.src = $current.src
    if ($playing && $audio) {
      if (!updateProgressInterval)
        updateProgressInterval = runWithOwner(owner, () =>
          useInterval(() => time($audio.currentTime), 50),
        )
      if ($audio.paused) void $audio.play()
    }
    else {
      if (updateProgressInterval) {
        clearInterval(updateProgressInterval)
        updateProgressInterval = undefined
      }
      if ($audio && !$audio.paused) $audio.pause()
    }
  })

  // === Functions ===
  function onCanPlay() {
    maxTime(audioElement()?.duration ?? 0)
  }
  function onProgressClick(event: MouseEvent) {
    const element = event.currentTarget as HTMLDivElement
    time(
      ((event.clientX - element.offsetLeft) / element.clientWidth) * maxTime(),
    )
  }
  function onEnded() {
    untrack(() => {
      batch(() => {
        time(maxTime())
        const $currentI = currentI()
        if ($currentI < queue().length - 1) {
          currentI(x => x + 1)
          playing(true)
        }
      })
    })
  }

  return (
    <>
      <audio
        ref={element => audioElement(element)}
        class={s.audio}
        onPlay={() => playing(true)}
        onPause={() => playing(false)}
        onCanPlay={onCanPlay}
        onEnded={onEnded}
        onLoad={() => loading(false)}
        aria-hidden
      />
      <Show when={shown()}>
        <div class={s.audioPlayer}>
          <button
            disabled={currentI() < 1}
            onClick={() => currentI(x => x - 1)}
          >
            <Icon path={mdiSkipPrevious} size="32" />
          </button>
          <button onClick={() => playing(x => !x)}>
            <Icon path={playing() ? mdiPause : mdiPlay} size="32" />
          </button>
          <button
            disabled={currentI() >= queue().length - 1}
            onClick={() => currentI(x => x + 1)}
          >
            <Icon path={mdiSkipNext} size="32" />
          </button>
          <div class={s.progress} onClick={onProgressClick} aria-hidden>
            <div>
              {formatTime(time() * 1000)}
              {' '}
              {queue().length === 1
                ? ''
                : `${currentI() + 1} of ${queue().length}`}
            </div>
            <div>{formatTime(maxTime() * 1000)}</div>
            <div
              class={s.line}
              style={{
                transform: `scaleX(${time() / maxTime()})`,
              }}
            />
          </div>
          <button onClick={() => queue([])}>
            <Icon path={mdiClose} size="32" />
          </button>
        </div>
      </Show>
    </>
  )
}
export default AudioPlayer
