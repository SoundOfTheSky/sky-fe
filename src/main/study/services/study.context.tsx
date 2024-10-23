import { ParentComponent, createContext, createMemo, useContext } from 'solid-js';

import basicStore from '@/services/basic.store';
import { db } from '@/services/db';
import { CommonRequestOptions, request } from '@/services/fetch';
import { atom, persistentAtom, useInterval } from '@/services/reactive';
import syncStore, { SYNC_STATUS } from '@/services/sync.store';
import { StudyEnabledTheme, StudyTheme } from '@/sky-shared/study';
import { DAY_MS, HOUR_MS, MIN_MS } from '@/sky-utils';

import { getThemes } from './study.rest';

export type ImmersionKitResponse = {
  data: {
    examples: {
      deck_name: string;
      image_url: string;
      sentence: string;
      sentence_with_furigana: string;
      sound_url: string;
      translation: string;
    }[];
  }[];
};

function getProvided() {
  // === Hooks ===
  useInterval(() => now(~~(Date.now() / HOUR_MS)), MIN_MS);

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
  });
  const now = atom(~~(Date.now() / HOUR_MS));
  const themes = atom<StudyTheme[]>();
  const statsGraph = atom<number[]>([]);

  // === Memos ===
  const turnedOnThemes = createMemo<StudyEnabledTheme[]>(
    () =>
      (themes()?.filter(
        (theme) => 'lessons' in theme && !settings().disabledThemeIds.includes(theme.id),
      ) as StudyEnabledTheme[]) ?? [],
  );
  const lessons = createMemo(() => turnedOnThemes().flatMap((theme) => theme.lessons));
  const reviews = createMemo(() =>
    turnedOnThemes().flatMap((theme) =>
      Object.entries(theme.reviews)
        .filter(([time]) => Number.parseInt(time) <= now())
        .flatMap(([, ids]) => ids),
    ),
  );
  const offlineUnavailable = createMemo(() => themes() && syncStore.status() === SYNC_STATUS.ERRORED);
  const ready = createMemo(() => themes() && (basicStore.online() || syncStore.status() === SYNC_STATUS.SYNCHED));
  const today = createMemo(() => new Date((now() - new Date().getHours()) * HOUR_MS));
  const startDate = createMemo(() => {
    const $today = today();
    // 44 weeks back
    return new Date($today.getTime() - $today.getDay() * DAY_MS - 26611200000);
  });
  const activity = createMemo(() => {
    let score = 0;
    let streak = 0;
    const $statsGraph = statsGraph();
    const maxI = (today().getTime() - startDate().getTime()) / DAY_MS;
    for (let i = 0; i <= maxI; i++) {
      score = Math.floor(score / 4) + $statsGraph[i];
      if (score >= 25) streak++;
      else if (i !== maxI) streak = 0;
    }
    return [score, streak] as const;
  });

  // === Functions ===
  async function updateStats() {
    statsGraph([]);
    const disabledThemeIds = new Set(settings().disabledThemeIds);
    const startTime = ~~(startDate().getTime() / 1000);
    // 52 weeks ahead
    const data = Array(Math.ceil((startTime + 31449600 - startTime) / 86400)).fill(0);
    for await (const { value } of db.transaction('studyAnswers', 'readwrite').store) {
      const time = ~~(new Date(value.created).getTime() / 1000);
      if (!disabledThemeIds.has(value.themeId) && startTime <= time) data[~~((time - startTime) / 86400)]++;
    }
    statsGraph(data);
  }

  async function update() {
    themes(undefined);
    themes(await getThemes());
    const $syncStatus = syncStore.status();
    if ($syncStatus !== SYNC_STATUS.ACTIONS && $syncStatus !== SYNC_STATUS.CACHE) await syncStore.sync();
  }

  async function getImmersionKitExamples(word: string, options?: CommonRequestOptions) {
    return request<ImmersionKitResponse>(
      `https://api.immersionkit.com/look_up_dictionary?keyword=${word}&sort=shortness&category=anime`,
      options,
    );
  }

  return {
    // === State ===
    settings,
    now,
    themes,
    statsGraph,
    // === Functions ===
    getImmersionKitExamples,
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
  };
}

const Context = createContext<ReturnType<typeof getProvided>>();
export const StudyProvider: ParentComponent = (props) => (
  <Context.Provider value={getProvided()}>{props.children}</Context.Provider>
);
export const useStudy = () => useContext(Context);
