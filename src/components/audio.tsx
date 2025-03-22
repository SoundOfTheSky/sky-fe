import { mdiPause, mdiPlay, mdiPlaylistMinus, mdiPlaylistPlus } from '@mdi/js'
import {
  Component,
  batch,
  createEffect,
  createMemo,
  onCleanup,
  onMount,
  untrack,
} from 'solid-js'

import AudioStore from '@/services/audio.store'
import basicStore from '@/services/basic.store'
import { atom } from '@/services/reactive'

import Icon from './icon'
import Tooltip from './tooltip'

import s from './audio.module.scss'

const { t } = basicStore

const Audio: Component<{ src: string; title: string; autoplay?: boolean }> = (
  properties,
) => {
  // === Hooks ===
  const { playing, current, queue, currentI } = AudioStore
  onCleanup(cleanup)
  onMount(() => {
    if (properties.autoplay) addToQueue()
  })

  // === State ===
  const loading = atom(false)
  const source = atom<string>()

  // === Memos ===
  const isCurrent = createMemo(() => !!source() && current()?.src === source())
  const queueIndex = createMemo(() =>
    queue().findIndex((x) => x.src === source()),
  )

  // === Functions ===
  function play(addToQueue?: boolean) {
    if (isCurrent()) {
      playing((x) => !x)
      return
    }
    if (!source()) source(properties.src)
    const $queue = queue()
    batch(() => {
      const $playing = playing()
      let $queueIndex = queueIndex()
      if ($queueIndex === -1) {
        $queueIndex = 0
        const queueItem = {
          src: source()!,
          title: properties.title,
        }
        if (addToQueue) queue([...$queue, queueItem])
        else queue([queueItem])
      }
      if (!addToQueue) currentI($queueIndex)
      if (!$playing) playing(true)
    })
  }

  function addToQueue() {
    untrack(() => {
      batch(() => {
        const $source = source()!
        const $queueIndex = queueIndex()
        if ($queueIndex === -1) play(true)
        else {
          if (isCurrent()) {
            playing(false)
            currentI(0)
          }
          queue(($queue) => $queue.filter((track) => track.src !== $source))
        }
      })
    })
  }

  function cleanup() {
    untrack(() => {
      batch(() => {
        const $source = source()
        if (isCurrent()) {
          playing(false)
          currentI(0)
        }
        queue((x) => x.filter((track) => track.src !== $source))
        source(undefined)
      })
    })
  }

  // === Effects ===
  // Revoke objects to prevent memory leak
  createEffect<string | undefined>((oldSource) => {
    if (oldSource) URL.revokeObjectURL(oldSource)
    return source()
  })
  // On src change delete track
  createEffect((origSource: string | undefined) => {
    if (origSource && properties.src !== origSource) cleanup()
    return properties.src
  })

  return (
    <div class={s.audio}>
      <button
        onClick={() => {
          play()
        }}
        class={s.content}
        disabled={loading()}
      >
        <Icon path={isCurrent() && playing() ? mdiPause : mdiPlay} size='24' />
        {properties.title}
      </button>
      <Tooltip content={t('AUDIO.ADD_TO_QUEUE')}>
        <button onClick={addToQueue} disabled={loading()} class={s.add}>
          <Icon
            path={queueIndex() === -1 ? mdiPlaylistPlus : mdiPlaylistMinus}
            inline
            size='24'
          />
        </button>
      </Tooltip>
    </div>
  )
}
export default Audio
