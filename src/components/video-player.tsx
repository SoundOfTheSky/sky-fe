/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/mouse-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */

import {
  mdiFastForward10,
  mdiFullscreen,
  mdiFullscreenExit,
  mdiLoading,
  mdiPause,
  mdiPictureInPictureBottomRight,
  mdiPlay,
  mdiRewind10,
  mdiVideoBoxOff,
} from '@mdi/js'
import {
  createEffect,
  For,
  JSX,
  Match,
  onMount,
  Show,
  splitProps,
  Switch,
} from 'solid-js'
import { Transition } from 'solid-transition-group'

import Icon from '@/components/icon'
import { atom, useGlobalEvent } from '@/services/reactive'
import { opacityTransitionImmediate } from '@/services/transition'

import Tooltip from './tooltip'

import s from './video-player.module.scss'

/**
 * await ffmpeg.load({
           coreURL: await toBlobURL(`/ffmpeg/ffmpeg-core.js`, 'text/javascript'),
           wasmURL: await toBlobURL(
             `/ffmpeg/ffmpeg-core.wasm`,
             'application/wasm',
           ),
           workerURL: await toBlobURL(
             `/ffmpeg/ffmpeg-core.worker.js`,
             'text/javascript',
           ),
         })
 */
enum VideoState {
  NO_SOURCE,
  LOADING_META,
  LOADED_META,
  CAN_PLAY,
  PLAYING,
  PAUSED,
  BUFFERING,
}

enum VideoPosition {
  DEFAULT,
  FULLSCREEN,
  PICTURE_IN_PICTURE,
}

type Options = {
  src?: string
  subtitles?: string[]
}

export default function VideoPlayer(
  properties_: Omit<JSX.HTMLAttributes<HTMLDivElement>, keyof Options> &
    Options,
) {
  // === Hooks ===
  const [properties, attributes] = splitProps(properties_, ['src', 'subtitles'])
  useGlobalEvent('keydown', onKeyDown)
  onMount(() => {
    videoElement.src = URL.createObjectURL(mediaSource)
    mediaSource.addEventListener(
      'sourceopen',
      () => {
        URL.revokeObjectURL(videoElement.src)
      },
      { once: true },
    )
  })

  // === State ===
  let videoElement: HTMLVideoElement
  let progressElement: HTMLDivElement
  let videoPreviewElement: HTMLVideoElement
  const state = atom(VideoState.NO_SOURCE)
  const paused = atom(true)
  const position = atom(VideoPosition.DEFAULT)
  // Will not update player time!
  const time = atom(0)
  const duration = atom(1)
  const buffered = atom<{ left: string; width: string }[]>()
  const subtitles = atom<string[]>([])
  const isProgressSeeking = atom(false)
  const progressMouseOver = atom(false)
  const progressMouseTime = atom(0)
  const ff = atom(0)
  const controlsShown = atom(false)
  let controlsTimeout: ReturnType<typeof setTimeout> | undefined
  const seekPreviewLoading = atom(false)
  const mediaSource = new MediaSource()

  // === Effects ===
  // Pause/play
  createEffect(() => {
    const $paused = paused()
    if (videoElement.paused === $paused) return
    if ($paused) videoElement.pause()
    else void videoElement.play()
  })
  // Fullscreen
  createEffect<VideoPosition>((lastPosition) => {
    if (lastPosition === VideoPosition.FULLSCREEN)
      void document.exitFullscreen()
    else if (lastPosition === VideoPosition.PICTURE_IN_PICTURE)
      void document.exitPictureInPicture()
    const $position = position()
    if ($position === VideoPosition.FULLSCREEN)
      void videoElement.parentElement!.requestFullscreen()
    else if ($position === VideoPosition.PICTURE_IN_PICTURE)
      void videoElement.requestPictureInPicture()
    return $position
  }, VideoPosition.DEFAULT)
  // Progress mouse time
  createEffect(() => {
    if (state() === VideoState.NO_SOURCE) return
    const $progressMouseTime = progressMouseTime()
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (videoPreviewElement.fastSeek)
      videoPreviewElement.fastSeek($progressMouseTime)
    else videoPreviewElement.currentTime = $progressMouseTime
    if (isProgressSeeking()) {
      videoElement.currentTime = $progressMouseTime
      time($progressMouseTime)
    }
  })

  // === Functions ===
  function updateBuffered() {
    const $duration = duration()
    const buffers: { left: string; width: string }[] = []
    for (let index = 0; index < videoElement.buffered.length; index++) {
      const start = videoElement.buffered.start(index)
      const end = videoElement.buffered.end(index)
      buffers.push({
        left: (start / $duration) * 100 + '%',
        width: ((end - start) / $duration) * 100 + '%',
      })
    }
    buffered(buffers)
  }

  function onProgressMove(event: MouseEvent | TouchEvent) {
    if (!progressMouseOver()) return
    const rect = progressElement.getBoundingClientRect()
    const x = 'touches' in event ? event.touches[0]!.clientX : event.clientX
    const time = ((x - rect.x) / rect.width) * videoElement.duration
    if (!Number.isNaN(time) && Number.isFinite(time)) progressMouseTime(time)
  }

  function onSeekPress(event: MouseEvent | TouchEvent) {
    isProgressSeeking(true)
    onProgressMove(event)
  }

  function onKeyDown(event: KeyboardEvent) {
    switch (event.key) {
      case 'ArrowRight': {
        seekDelta(10)
        ff(10)
        setTimeout(() => ff(0), 400)
        break
      }
      case 'ArrowLeft': {
        seekDelta(-10)
        ff(-10)
        setTimeout(() => ff(0), 400)
        break
      }
    }
  }

  function seekDelta(delta: number) {
    videoElement.currentTime += delta
    time(videoElement.currentTime)
  }

  function onDblClick(event: MouseEvent) {
    const rect = videoElement.getBoundingClientRect()
    const p = (event.clientX - rect.x) / rect.width
    if (p < 0.3) {
      ff(-10)
      seekDelta(-10)
    } else if (p > 0.7) {
      ff(10)
      seekDelta(10)
    } else
      position((x) =>
        x === VideoPosition.DEFAULT
          ? VideoPosition.FULLSCREEN
          : VideoPosition.DEFAULT,
      )
    setTimeout(() => ff(0), 400)
  }

  function onAnyInteract() {
    clearTimeout(controlsTimeout)
    controlsShown(true)
    controlsTimeout = setTimeout(() => controlsShown(false), 2000)
  }

  // function getFirstUnbuffered(time: number) {
  //   let min: number | undefined
  //   for (let index = 0; index < mediaSource.sourceBuffers.length; index++) {
  //     const ranges = mediaSource.sourceBuffers[index]!.buffered
  //     for (let index = 0; index < ranges.length; index++) {
  //       const end = ranges.end(index)
  //       if (ranges.start(index) <= time && time <= end && (!min || end < min)) {
  //         min = end
  //         break
  //       }
  //     }
  //     return time
  //   }
  //   return min ?? time
  // }

  // async function loadTime(time: number) {
  //   const size = 10
  //   const nextChunkTime = getFirstUnbuffered(time)
  //   if (nextChunkTime - time < 5) return
  //   const remuxedChunk = await this.ffmpegWorker.remuxChunk(start, len, this.loadedMediaMetadata.videoStreams[0]?.id, this.loadedMediaMetadata.audioStreams[0]?.id);
  // }

  return (
    <div
      {...attributes}
      class={[s.videoPlayer, attributes.class].filter(Boolean).join(' ')}
      onMouseMove={onAnyInteract}
      onTouchMove={onAnyInteract}
      onClick={onAnyInteract}
      classList={{
        [s.showControls!]: controlsShown(),
      }}
    >
      <video
        class={s.video}
        onClick={() => paused((x) => !x)}
        onDblClick={onDblClick}
        ref={(x) => {
          videoElement = x
          videoElement.addEventListener('leavepictureinpicture', () =>
            position(VideoPosition.DEFAULT),
          )
        }}
        aria-label='Video'
        src={properties.src}
        onProgress={updateBuffered}
        onEmptied={() => state(VideoState.NO_SOURCE)}
        onLoadStart={() => state(VideoState.LOADING_META)}
        onLoadedMetadata={() => state(VideoState.LOADED_META)}
        onCanPlay={() => state(VideoState.CAN_PLAY)}
        onPlaying={() => state(VideoState.PLAYING)}
        onPause={() => state(VideoState.PAUSED)}
        onWaiting={() => state(VideoState.BUFFERING)}
        onSeeking={() => state(VideoState.BUFFERING)}
        onTimeUpdate={() => {
          time(videoElement.currentTime)
          // void loadTime(videoElement.currentTime)
        }}
        onDurationChange={() => duration(videoElement.duration)}
      >
        <For each={subtitles()}>{(source) => <track src={source} />}</For>
      </video>
      <Transition {...opacityTransitionImmediate}>
        <Switch>
          <Match when={state() === VideoState.NO_SOURCE}>
            <Tooltip content='No video'>
              <Icon class={s.center} path={mdiVideoBoxOff} size='64' />
            </Tooltip>
          </Match>
          <Match when={ff() < 0}>
            <Icon class={s.center} path={mdiRewind10} size='64' />
          </Match>
          <Match when={ff() > 0}>
            <Icon class={s.center} path={mdiFastForward10} size='64' />
          </Match>
          <Match
            when={
              state() === VideoState.BUFFERING ||
              state() === VideoState.LOADING_META
            }
          >
            <div class={s.center}>
              <Icon class='spin' path={mdiLoading} size='64' />
            </div>
          </Match>
        </Switch>
      </Transition>

      <div class={s.controls}>
        <button onClick={() => paused((x) => !x)}>
          <Icon path={paused() ? mdiPlay : mdiPause} size='32' />
        </button>
        <div
          class={s.progressBar}
          onMouseDown={onSeekPress}
          onTouchStart={onSeekPress}
          onMouseUp={() => isProgressSeeking(false)}
          onTouchEnd={() => isProgressSeeking(false)}
          onMouseOver={() => progressMouseOver(true)}
          onMouseOut={() => progressMouseOver(false)}
          onMouseMove={onProgressMove}
          onTouchMove={onProgressMove}
          ref={(element) => (progressElement = element)}
        >
          <div
            class={s.progress}
            style={{
              width: (time() / duration()) * 100 + '%',
            }}
          />
          <For each={buffered()}>
            {(style) => <div class={s.buffered} style={style} />}
          </For>
          <span class={s.time}>
            {((time() / 60) | 0).toString().padStart(2, '0')}:
            {(time() % 60 | 0).toString().padStart(2, '0')}/
            {((duration() / 60) | 0).toString().padStart(2, '0')}:
            {(duration() % 60 | 0).toString().padStart(2, '0')}
          </span>
        </div>
        <Show
          when={position() === VideoPosition.DEFAULT}
          fallback={
            <button onClick={() => position(VideoPosition.DEFAULT)}>
              <Icon path={mdiFullscreenExit} size='32' />
            </button>
          }
        >
          <button onClick={() => position(VideoPosition.FULLSCREEN)}>
            <Icon path={mdiFullscreen} size='32' />
          </button>
          <Show when={document.pictureInPictureEnabled}>
            <button onClick={() => position(VideoPosition.PICTURE_IN_PICTURE)}>
              <Icon path={mdiPictureInPictureBottomRight} size='32' />
            </button>
          </Show>
        </Show>
        <div
          class={s.progressTooltip}
          style={{
            opacity: progressMouseOver() ? 1 : 0,
            left: `calc((100% - 192px) * ${progressMouseTime() / duration()} + 96px)`,
          }}
        >
          <video
            class={s.preview}
            ref={(x) => (videoPreviewElement = x)}
            aria-label='Preview'
            src={properties.src}
            onProgress={updateBuffered}
            onSeeking={() => seekPreviewLoading(true)}
            onSeeked={() => seekPreviewLoading(false)}
          />
          <Transition {...opacityTransitionImmediate}>
            <Show when={seekPreviewLoading()}>
              <div class={s.center + ' ' + s.previewLoading}>
                <Icon class='spin' path={mdiLoading} size='64' />
              </div>
            </Show>
          </Transition>
          <div>
            {((progressMouseTime() / 60) | 0).toString().padStart(2, '0')}:
            {(progressMouseTime() % 60 | 0).toString().padStart(2, '0')}
          </div>
        </div>
      </div>
    </div>
  )
}
