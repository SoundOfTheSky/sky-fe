import { SEC_MS } from '@softsky/utils'
import { createWritableMemo } from '@solid-primitives/memo'
import { createEffect, createMemo, createRoot, untrack } from 'solid-js'
import { createStore } from 'solid-js/store'

import { modalsStore } from '@/services/modals.store'

import basicStore from '../../services/basic.store'
import { atom, atomize, useInterval } from '../../services/reactive'

export type Stage = {
  title: string
  time: number
  color: string
}

const { t } = basicStore
const { notify } = modalsStore

const work = {
  title: t('TIMER.STAGE_WORK')!,
  time: 25,
  color: '#3d63ff', // main
}
const shortBreak = {
  title: t('TIMER.STAGE_SHORT_BREAK')!,
  time: 10,
  color: '#33a769', // warning
}
const longBreak = {
  title: t('TIMER.STAGE_LONG_BREAK')!,
  time: 30,
  color: '#ffbc00', // success
}

export default createRoot(() => {
  // === Hooks ===
  useInterval(intervalSecHandler, SEC_MS)

  // === State ===
  const started = atom(false)
  const stageIndex = atom(0)
  const [stages, setStages] = createStore<Stage[]>(
    JSON.parse(
      localStorage.getItem('timer') ??
        JSON.stringify([
          { ...work },
          { ...shortBreak },
          { ...work },
          { ...shortBreak },
          { ...work },
          { ...shortBreak },
          { ...work },
          { ...longBreak },
        ]),
    ) as Stage[],
  )

  // === Memos ===
  const stage = createMemo(() => stages[stageIndex()]!)
  const timeLeft = atomize(createWritableMemo(() => stage().time * 60))
  const timerText = createMemo(
    () =>
      `${((timeLeft() / 60) | 0).toString().padStart(2, '0')}:${(timeLeft() % 60).toString().padStart(2, '0')}`,
  )

  // === Effects ===
  // Save data to localstorage
  createEffect(() => {
    localStorage.setItem('timer', JSON.stringify(stages))
  })

  // === Functions ===
  function intervalSecHandler() {
    untrack(() => {
      if (!started()) return
      const $timeLeft = timeLeft((x) => x - 1)
      if ($timeLeft === 0) {
        const audio = document.createElement('audio')
        audio.src = '/death.mp3'
        void audio.play()
        // eslint-disable-next-line solid/reactivity
        stageIndex((x) => (x === stages.length - 1 ? 0 : x + 1))
        notify({
          title: t('TIMER.STAGE_NOTIFICATION', { stage: stage().title })!,
          timeout: 10_000,
        })
      }
    })
  }
  function setDefaultSettings() {
    setStages([
      { ...work },
      { ...shortBreak },
      { ...work },
      { ...shortBreak },
      { ...work },
      { ...shortBreak },
      { ...work },
      { ...longBreak },
    ])
  }

  return {
    // === State ===
    started,
    timeLeft,
    stageIndex,
    stages,
    setStages,

    // === Memos ===
    stage,
    timerText,

    // === Functions ===
    setDefaultSettings,
  }
})
