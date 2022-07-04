import { ParentComponent, createContext, createMemo, useContext } from 'solid-js';

import { SimpleRequestOptions, request } from '@/services/fetch';
import { atom, createLazyResource, persistentAtom } from '@/services/reactive';

export type Theme = {
  id: number;
  title: string;
  created: string;
  updated: string;
};
export type ThemeData = Theme & {
  lessons: number[];
  reviews: Record<string, number[]>;
};
export type Subject = {
  id: number;
  title: string;
  nextReview: number | null;
  stage: number | null;
  srsId: number;
  questionIds: number[];
};
export type SearchSubject = {
  id: number;
  title: string;
  answers: string[];
};
export type Question = {
  id: number;
  answers: string[];
  question: string;
  descriptionWordId: number;
  subjectId: number;
  alternateAnswers?: Record<string, string>;
  choose?: number;
  note?: string;
  synonyms?: string[];
};
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
export type SRS = {
  id: number;
  title: string;
  timings: number[];
  ok: number;
  created: string;
  updated: string;
};
export type Stat = {
  id: number;
  date: Date;
  correct: boolean;
  themeId: number;
};

function getProvided() {
  const studyEndpoint = '/api/study';
  const themesEndpoint = `${studyEndpoint}/themes`;
  const subjectsEndpoint = `${studyEndpoint}/subjects`;
  const questionsEndpoint = `${studyEndpoint}/questions`;
  const srsEndpoint = `${studyEndpoint}/srs`;
  const statsEndpoint = `${studyEndpoint}/stats`;

  // === STATE ===
  const settings = persistentAtom('study-settings', {
    reviews: {
      amount: 100,
      preload: 5,
      batch: 10,
    },
    lessons: {
      amount: 100,
      preload: 5,
      batch: 5,
    },
  });
  const disabledThemeIds = persistentAtom<number[]>('disabledThemeIds', []);
  const now = atom(Math.floor(Date.now() / 3_600_000));
  const outdated = atom(false);

  // === Memos ===
  const today = createMemo(() => new Date((now() - new Date().getHours()) * 3_600_000));
  const startDate = createMemo(() => {
    const d = new Date(today());
    d.setMonth(d.getMonth() - 8, 1);
    return d;
  });
  const endDate = createMemo(() => {
    const d = new Date(today());
    d.setMonth(d.getMonth() + 3, 1);
    return d;
  });

  // === API ===
  const getStats = async (start: Date, end: Date, options?: SimpleRequestOptions): Promise<Stat[]> => {
    const res = await request<string>(`${statsEndpoint}?start=${start.getTime()}&end=${end.getTime()}`, options);
    return res.split('\n').map((line) => {
      const [date, id, correct, themeId] = line.split(',') as [string, string, string, string];
      return {
        id: +id,
        date: new Date(+date),
        correct: correct === '1',
        themeId: +themeId,
      };
    });
  };
  const addTheme = async (id: number) =>
    request(`${themesEndpoint}/${id}`, {
      method: 'POST',
    });
  const removeTheme = async (id: number) =>
    request(`${themesEndpoint}/${id}`, {
      method: 'DELETE',
    });
  const getSubject = async (id: number, options?: SimpleRequestOptions) =>
    request<Subject>(`${subjectsEndpoint}/${id}`, options);
  const getQuestion = async (id: number, options?: SimpleRequestOptions) =>
    request<Question>(`${questionsEndpoint}/${id}`, options);
  const updateQuestion = async (
    id: number,
    body: {
      note?: string;
      synonyms?: string[];
    },
  ) =>
    request(`${questionsEndpoint}/${id}`, {
      method: 'PATCH',
      body,
    });
  const submitAnswer = async (id: number, correct: boolean) =>
    request(`${subjectsEndpoint}/${id}/${correct ? 'correct' : 'wrong'}`, {
      method: 'POST',
    });
  const getImmersionKitExamples = async (word: string, options?: SimpleRequestOptions) =>
    request<ImmersionKitResponse>(
      `https://api.immersionkit.com/look_up_dictionary?keyword=${word}&sort=shortness&category=anime`,
      options,
    );
  const getSRS = async (id: number, options?: SimpleRequestOptions) => request<SRS>(`${srsEndpoint}/${id}`, options);
  const getAllSRS = async (options?: SimpleRequestOptions) => request<SRS[]>(`${srsEndpoint}`, options);
  const searchSubjects = async (themeIds: number[], query: string, options?: SimpleRequestOptions) =>
    request<SearchSubject[]>(`${subjectsEndpoint}/${query}?themeIds=${themeIds.join(',')}`, options);
  const getAllSubjects = async (themeIds: number[], page = 1, options?: SimpleRequestOptions) =>
    request<SearchSubject[]>(`${subjectsEndpoint}?themeIds=${themeIds.join(',')}&page=${page}`, options);

  // === API Recources ===
  const [allThemes, { refetch: refetchAllThemes }] = createLazyResource(() => request<Theme[]>(themesEndpoint));
  const [themesData, { refetch: refetchThemesData }] = createLazyResource(() =>
    request<ThemeData[]>(themesEndpoint + '/my'),
  );
  const [stats, { refetch: refetchStats }] = createLazyResource(
    () => [startDate(), endDate()],
    ([a, b]) => getStats(a, b),
  );

  // === Memos ===
  const turnedOnThemes = createMemo(
    () => themesData()?.filter((theme) => !disabledThemeIds().includes(theme.id)) ?? [],
  );
  const availableLessons = createMemo(() => turnedOnThemes().flatMap((theme) => theme.lessons));
  const availableReviews = createMemo(() =>
    turnedOnThemes().flatMap((theme) =>
      Object.entries(theme.reviews)
        .filter(([time]) => Number.parseInt(time) <= now())
        .flatMap(([, ids]) => ids),
    ),
  );

  // === Functions ===
  function updateAllIfOutdated() {
    const newNow = Math.floor(Date.now() / 3_600_000);
    if (now() === newNow) {
      if (!outdated()) return;
      void refetchThemesData();
      void refetchStats();
    } else now(newNow);
  }

  return {
    outdated,
    stats,
    refetchStats,
    startDate,
    endDate,
    today,
    updateAllIfOutdated,
    allThemes,
    refetchAllThemes,
    themesData,
    refetchThemesData,
    addTheme,
    removeTheme,
    getSubject,
    getQuestion,
    updateQuestion,
    submitAnswer,
    getImmersionKitExamples,
    getSRS,
    getAllSRS,
    searchSubjects,
    getAllSubjects,
    getStats,
    settings,
    now,
    disabledThemeIds,
    turnedOnThemes,
    availableLessons,
    availableReviews,
  };
}

const Context = createContext<ReturnType<typeof getProvided>>();
export const StudyProvider: ParentComponent = (props) => (
  <Context.Provider value={getProvided()}>{props.children}</Context.Provider>
);
export const useStudy = () => useContext(Context);
