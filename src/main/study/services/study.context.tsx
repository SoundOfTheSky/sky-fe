import { DAY_MS, HOUR_MS, MIN_MS, retry, wait } from '@softsky/utils'
import {
  ParentComponent,
  createContext,
  createMemo,
  useContext,
} from 'solid-js'

import basicStore from '@/services/basic.store'
import { database } from '@/services/database'
import { CommonRequestOptions, handleError, request } from '@/services/fetch'
import { atom, persistentAtom, useInterval } from '@/services/reactive'
import syncStore, { SYNC_STATUS } from '@/services/sync.store'
import { StudyEnabledTheme, StudyTheme } from '@/sky-shared/study'

import { getThemes } from './study.rest'

export type ImmersionKitResponse = {
  data: {
    examples: {
      deck_name: string
      image_url: string
      sentence: string
      sentence_with_furigana: string
      sound_url: string
      translation: string
    }[]
  }[]
}
export async function getImmersionKitExamples(
  word: string,
  options?: CommonRequestOptions,
) {
  await wait(20_000)
  return request<ImmersionKitResponse>(
    `https://api.immersionkit.com/look_up_dictionary?keyword=${word}&sort=shortness&category=anime`,
    options,
  )
}

function getProvided() {
  // === Hooks ===
  useInterval(() => now(~~(Date.now() / HOUR_MS)), MIN_MS)

  // === STATE ===
  const settings = persistentAtom('study-settings', {
    reviews: {
      amount: 100,
      batch: 10,
    },
    lessons: {
      amount: 100,
      batch: 5,
    },
    disabledThemeIds: [] as number[],
  })
  const now = atom(~~(Date.now() / HOUR_MS))
  const themes = atom<StudyTheme[]>()
  const statsGraph = atom<number[]>([])

  // === Memos ===
  const turnedOnThemes = createMemo<StudyEnabledTheme[]>(
    () =>
      (themes()?.filter(
        theme =>
          'lessons' in theme && !settings().disabledThemeIds.includes(theme.id),
      ) as StudyEnabledTheme[] | undefined) ?? [],
  )
  const lessons = createMemo(() =>
    turnedOnThemes().flatMap(theme => theme.lessons),
  )
  const reviews = createMemo(() =>
    turnedOnThemes().flatMap(theme =>
      Object.entries(theme.reviews)
        .filter(([time]) => Number.parseInt(time) <= now())
        .flatMap(([, ids]) => ids),
    ),
  )
  const offlineUnavailable = createMemo(
    () => themes() && syncStore.status() === SYNC_STATUS.ERRORED,
  )
  const ready = createMemo(
    () =>
      themes()
      && (basicStore.online() || syncStore.status() === SYNC_STATUS.SYNCHED),
  )
  const today = createMemo(
    () => new Date((now() - new Date().getHours()) * HOUR_MS),
  )
  const startDate = createMemo(() => {
    const $today = today()
    // 44 weeks back
    return new Date($today.getTime() - $today.getDay() * DAY_MS - 26_611_200_000)
  })
  const activity = createMemo(() => {
    let score = 0
    let streak = 0
    const $statsGraph = statsGraph()
    const maxI = (today().getTime() - startDate().getTime()) / DAY_MS
    for (let index = 0; index <= maxI; index++) {
      score = Math.floor(score / 4) + $statsGraph[index]!
      if (score >= 25) streak++
      else if (index !== maxI) streak = 0
    }
    return [score, streak] as const
  })

  // === Functions ===
  async function updateStats() {
    statsGraph([])
    const disabledThemeIds = new Set(settings().disabledThemeIds)
    const startTime = ~~(startDate().getTime() / 1000)
    // 52 weeks ahead
    const data = Array.from({ length: Math.ceil((startTime + 31_449_600 - startTime) / 86_400) }).fill(0) as number[]
    for await (const { value } of database.transaction('studyAnswers', 'readwrite')
      .store) {
      const time = ~~(new Date(value.created).getTime() / 1000)
      if (!disabledThemeIds.has(value.themeId) && startTime <= time)
        data[~~((time - startTime) / 86_400)]!++
    }
    statsGraph(data)
  }

  async function update() {
    try {
      themes()
      themes(await retry(() => getThemes(), 6, 5000))
    }
    catch (error) {
      handleError(error)
      throw error
    }
  }

  return {
    // === State ===
    settings,
    now,
    themes,
    statsGraph,
    // === Functions ===
    update,
    updateStats,
    // === Memos ===
    turnedOnThemes,
    lessons,
    reviews,
    offlineUnavailable,
    ready,
    today,
    startDate,
    activity,
  }
}

const Context = createContext<ReturnType<typeof getProvided>>()
export const StudyProvider: ParentComponent = properties => (
  <Context.Provider value={getProvided()}>{properties.children}</Context.Provider>
)
export const useStudy = () => useContext(Context)
