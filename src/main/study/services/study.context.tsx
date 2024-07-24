import { Type } from '@sinclair/typebox';
import { TypeCompiler } from '@sinclair/typebox/compiler';
import { ParentComponent, createContext, createEffect, createMemo, untrack, useContext } from 'solid-js';

import authStore from '@/services/auth.store';
import basicStore from '@/services/basic.store';
import { db, updateDBEntity } from '@/services/db';
import { CommonRequestOptions, request, RequestError } from '@/services/fetch';
import { atom, persistentAtom } from '@/services/reactive';
import { DAY_MS, findAllStringBetween } from '@/services/utils';

export type Theme = {
  id: number;
  title: string;
  created: string;
  updated: string;
  lessons?: number[];
  reviews?: Record<string, number[]>;
};
export type ActiveTheme = Omit<Theme, 'lessons' | 'reviews'> & {
  lessons: number[];
  reviews: Record<string, number[]>;
};
export type Subject = {
  id: number;
  title: string;
  nextReview: number | null;
  stage: number | null;
  srsId: number;
  themeId: number;
  questionIds: number[];
  updated: string;
  created: string;
};
export type SearchSubject = {
  id: number;
  title: string;
  answers: string;
  alternate_answers: string;
  stage?: number;
  next_review?: number;
  note?: string;
  synonyms?: string;
};
export type Question = {
  id: number;
  answers: string[];
  question: string;
  description: string;
  subjectId: number;
  alternateAnswers?: Record<string, string>;
  choose?: boolean;
  note?: string;
  synonyms?: string[];
  updated: string;
  created: string;
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
  created: number;
  themeId: number;
  subjectId: number;
  correct: boolean;
  answers: string[];
  took: number;
};
type OfflineTaskUpdateQuestion = {
  id: number;
  body: {
    note?: string;
    synonyms?: string[];
  };
};
type OfflineTaskAnswer = {
  id: number;
  answers: string[];
  took: number;
  correct: boolean;
};

const QuestionUpdateT = TypeCompiler.Compile(
  Type.Object({
    note: Type.Optional(
      Type.String({
        minLength: 0,
        maxLength: 4096,
      }),
    ),
    synonyms: Type.Optional(
      Type.Array(
        Type.String({
          minLength: 1,
          maxLength: 64,
        }),
        {
          minItems: 0,
          maxItems: 9,
        },
      ),
    ),
  }),
);
const AnswerT = TypeCompiler.Compile(
  Type.Object({
    created: Type.Number({
      minimum: 0,
      maximum: Number.MAX_SAFE_INTEGER,
    }),
    answers: Type.Array(
      Type.String({
        minLength: 1,
        maxLength: 64,
      }),
      {
        minItems: 1,
        maxItems: 9,
      },
    ),
    took: Type.Number({
      minimum: 0,
      maximum: Number.MAX_SAFE_INTEGER,
    }),
    correct: Type.Boolean(),
  }),
);

function getProvided() {
  const studyEndpoint = '/api/study';
  const themesEndpoint = `${studyEndpoint}/themes`;
  const subjectsEndpoint = `${studyEndpoint}/subjects`;
  const questionsEndpoint = `${studyEndpoint}/questions`;
  const statsEndpoint = `${studyEndpoint}/stats`;

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
  const now = atom(Math.floor(Date.now() / 3_600_000));
  const outdated = atom(true);
  const cachingProgress = atom(0);
  const themes = atom<Theme[]>();
  const srsMap = [
    {
      id: 1,
      ok: 5,
      timings: [4, 8, 23, 47, 167, 335, 719, 2879], // 9 levels
      title: 'Default',
    },
    {
      id: 2,
      ok: 5,
      timings: [2, 4, 8, 23, 47, 167, 335, 719, 2879], // 10 levels
      title: 'Fast unlock',
    },
    {
      id: 3,
      ok: 5,
      timings: [1, 2, 4, 8, 23, 47, 167, 335, 719, 2879], // 11 levels
      title: 'Hyper unlock',
    },
  ];
  const statsGraph = atom<number[]>([]);

  // === Memos ===
  const today = createMemo(() => new Date((now() - new Date().getHours()) * 3_600_000));
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

  // === API ===
  async function getThemes(options?: CommonRequestOptions & { ignoreDB?: boolean }) {
    const dbSubject = options?.ignoreDB ? undefined : ((await db.get('keyval', 'themes')) as Promise<Theme[]>);
    if (dbSubject) return dbSubject;
    const item = await request<Theme[]>(themesEndpoint, options);
    void db.put('keyval', item, 'themes');
    return item;
  }
  async function getSubject(id: number, options?: CommonRequestOptions & { ignoreDB?: boolean }) {
    const dbSubject = options?.ignoreDB ? undefined : await db.get('studySubjects', id);
    if (dbSubject) return dbSubject;
    const subject = await request<Subject>(`${subjectsEndpoint}/${id}`, options);
    void db.put('studySubjects', subject);
    return subject;
  }
  async function getQuestion(id: number, options?: CommonRequestOptions & { ignoreDB?: boolean }) {
    const dbSubject = options?.ignoreDB ? undefined : await db.get('studyQuestions', id);
    if (dbSubject) return dbSubject;
    const question = await request<Question>(`${questionsEndpoint}/${id}`, options);
    void db.put('studyQuestions', question);
    return question;
  }
  async function updateStats(options?: CommonRequestOptions) {
    statsGraph([]);
    try {
      const lastUpdate = ((await db.get('keyval', 'lastUpdate_studyStats')) as number) ?? 0;
      const stats = await request<Stat[]>(`${statsEndpoint}?start=${lastUpdate}`, options);
      if (stats.length > 0) {
        let maxUpdated = lastUpdate;
        for (const stat of stats) {
          await db.put('studyStats', stat);
          if (maxUpdated < stat.created) maxUpdated = stat.created;
        }
        await db.put('keyval', maxUpdated, 'lastUpdate_studyStats');
      }
    } catch {}
    const themesMap = new Map((untrack(themes) ?? []).filter((x) => x.lessons).map((x) => [x.id, x]));
    const disabledThemeIds = new Set(untrack(settings).disabledThemeIds);
    const startTime = untrack(startDate).getTime() / 1000;
    // 52 weeks ahead
    const maxTime = startTime + 31449600;
    const data = Array(Math.ceil((maxTime - startTime) / 86400)).fill(0);
    for await (const stat of db.transaction('studyStats', 'readwrite').store) {
      if (!themesMap.has(stat.value.themeId)) await stat.delete();
      else if (startTime <= stat.value.created && !disabledThemeIds.has(stat.value.themeId))
        data[Math.floor((stat.value.created - startTime) / 86400)]++;
    }
    statsGraph(data);
  }
  async function addTheme(id: number) {
    await request(`${themesEndpoint}/${id}`, {
      method: 'POST',
    });
    outdated(true);
    await update();
  }
  async function removeTheme(id: number) {
    settings((x) => ({ ...x, disabledThemeIds: x.disabledThemeIds.filter((x) => x !== id) }));
    await request(`${themesEndpoint}/${id}`, {
      method: 'DELETE',
    });
    outdated(true);
    await update();
  }
  async function updateQuestion(
    id: number,
    body: {
      note?: string;
      synonyms?: string[];
    },
  ) {
    if (!QuestionUpdateT.Check(body)) throw [...QuestionUpdateT.Errors(body)];
    try {
      if (!untrack(basicStore.online)) throw new Error();
      await request(`${questionsEndpoint}/${id}`, {
        method: 'PUT',
        body,
      });
    } catch (e) {
      if (e instanceof RequestError && e.code !== 0) throw e;
      await db.add(
        'offlineTasksQueue',
        {
          id,
          body,
        } satisfies OfflineTaskUpdateQuestion,
        `study_update_question_${Date.now()}`,
      );
    }
    const question = await db.get('studyQuestions', id);
    if (question) {
      question.note = body.note;
      question.synonyms = body.synonyms;
      await db.put('studyQuestions', question);
    }
    outdated(true);
  }
  // eslint-disable-next-line sonarjs/cognitive-complexity
  async function submitAnswer(id: number, answers: string[], took: number, correct: boolean) {
    const now = Date.now();
    const body = {
      created: now,
      answers,
      took,
      correct,
    };
    if (!AnswerT.Check(body)) throw [...AnswerT.Errors(body)];
    // Don't update last_updated in this function!!!
    try {
      if (!untrack(basicStore.online)) throw new Error();
      await request(`${subjectsEndpoint}/${id}/answer`, {
        method: 'POST',
        body,
      });
    } catch (e) {
      if (e instanceof RequestError && e.code !== 0) throw e;
      await db.add(
        'offlineTasksQueue',
        {
          id,
          answers,
          took,
          correct,
        } satisfies OfflineTaskAnswer,
        `study_answer_${Date.now()}`,
      );
    }
    const subject = await db.get('studySubjects', id);
    if (subject) {
      const SRS = srsMap[subject.srsId - 1];
      subject.stage = Math.max(1, Math.min(SRS.timings.length + 1, (subject.stage ?? 0) + (correct ? 1 : -2)));
      subject.nextReview =
        subject.stage >= SRS.timings.length ? null : ~~(now / 3_600_000) + SRS.timings[subject.stage - 1];
      await db.put('studySubjects', subject);
      const themes = (await db.get('keyval', 'themes')) as Theme[];
      const theme = themes.find((t) => t.id === subject.themeId)!;
      theme.lessons = theme.lessons!.filter((x) => x !== subject.id);
      for (const hour in theme.reviews) {
        theme.reviews[hour] = theme.reviews[hour].filter((x) => x !== subject.id);
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        if (theme.reviews[hour].length === 0) delete theme.reviews[hour];
      }
      if (!theme.reviews![subject.nextReview!]) theme.reviews![subject.nextReview!] = [];
      theme.reviews![subject.nextReview!].push(subject.id);
      await db.put('keyval', themes, 'themes');
      await db.put('studyStats', {
        created: Math.floor(now / 1000),
        answers,
        took,
        correct,
        subjectId: id,
        themeId: subject?.themeId,
      });
    }
    outdated(true);
  }
  async function getImmersionKitExamples(word: string, options?: CommonRequestOptions) {
    return request<ImmersionKitResponse>(
      `https://api.immersionkit.com/look_up_dictionary?keyword=${word}&sort=shortness&category=anime`,
      options,
    );
  }
  async function searchSubjects(themes: number[], query?: string, page?: number, options?: CommonRequestOptions) {
    let url = subjectsEndpoint;
    if (query) url += '/' + query;
    url += '?themes=' + themes.join(',');
    if (page) url += '&page=' + page;
    return request<SearchSubject[]>(url, options);
  }
  // === Memos ===
  const turnedOnThemes = createMemo<ActiveTheme[]>(
    () =>
      (themes()?.filter(
        (theme) => theme.lessons && theme.reviews && !settings().disabledThemeIds.includes(theme.id),
      ) as ActiveTheme[]) ?? [],
  );
  const availableLessons = createMemo(() => turnedOnThemes().flatMap((theme) => theme.lessons));
  const availableReviews = createMemo(() =>
    turnedOnThemes().flatMap((theme) =>
      Object.entries(theme.reviews)
        .filter(([time]) => Number.parseInt(time) <= now())
        .flatMap(([, ids]) => ids),
    ),
  );
  const offlineUnavailable = createMemo(() => themes() && cachingProgress() === 0);
  const ready = createMemo(() => themes() && (basicStore.online() || cachingProgress() === 1));

  // === Functions ===
  let updateCount = 0;
  // eslint-disable-next-line sonarjs/cognitive-complexity
  async function update() {
    console.log('UPDATE!');
    let lastUpdateTime = Date.now();
    const curUpdateCount = ++updateCount;
    cachingProgress(0.01);
    const $online = untrack(basicStore.online);
    try {
      if ($online) {
        const keys = await db.getAllKeys('offlineTasksQueue', IDBKeyRange.bound('study_a', 'study_z'));
        for (const key of keys) {
          if (!untrack(basicStore.online) || curUpdateCount !== updateCount) return;
          const req = await db.get('offlineTasksQueue', key);
          if (key.startsWith('study_update_question_')) {
            const data = req as OfflineTaskUpdateQuestion;
            await updateQuestion(data.id, data.body);
          } else if (key.startsWith('study_answer_')) {
            const data = req as OfflineTaskAnswer;
            await submitAnswer(data.id, data.answers, data.took, data.correct);
          } else throw new Error('Unknown study offline task key');
          await db.delete('offlineTasksQueue', key);
        }
        if (keys.length)
          basicStore.notify({
            title: 'Study answers and edits saved!',
            timeout: 10000,
          });
      }
      // If online always update Themes cause they are small
      const $themes = await getThemes({
        ignoreDB: $online,
      });
      themes($themes);
      // Outdated is used in means of need to update
      outdated(false);
      void updateStats();
      // Building required subjects
      const requiredSubjects = new Set<number>();
      for (const theme of $themes) {
        if (!theme.lessons || !theme.reviews) continue;
        for (const id of theme.lessons) requiredSubjects.add(id);
        for (const ids of Object.values(theme.reviews)) for (const id of ids) requiredSubjects.add(id);
      }
      cachingProgress(0.1);
      // Building required questions
      const requiredQuestions = new Set<number>();
      let i = 0;
      for await (const [subject] of updateDBEntity('/api/study/subjects', 'studySubjects', requiredSubjects)) {
        if (curUpdateCount !== updateCount) return;
        for (const id of subject.questionIds) requiredQuestions.add(id);
        i++;
        const t = Date.now();
        if (lastUpdateTime + 200 < t) {
          lastUpdateTime = t;
          cachingProgress((i / requiredSubjects.size) * 0.4 + 0.1);
        }
      }
      requiredSubjects.clear();
      i = 0;
      // eslint-disable-next-line sonarjs/no-unused-collection
      const assets = new Set<string>();
      for await (const [question] of updateDBEntity('/api/study/questions', 'studyQuestions', requiredQuestions)) {
        if (curUpdateCount !== updateCount) return;
        for (const path of findAllStringBetween(question.description + question.question, '"/static/', '"'))
          assets.add(path);
        i++;
        const t = Date.now();
        if (lastUpdateTime + 200 < t) {
          lastUpdateTime = t;
          cachingProgress((i / requiredQuestions.size) * 0.5 + 0.5);
        }
      }
      i = 0;
      // let isStaticNotLoaded = false;
      // for (const path of assets) {
      //   if (curUpdateCount !== updateCount) return;
      //   await fetch('/static/' + path, { cache: 'force-cache' })
      //     .then((x) => x.arrayBuffer())
      //     .catch(() => {
      //       isStaticNotLoaded = true;
      //     });
      //   i++;
      //   const t = Date.now();
      //   if (lastUpdateTime + 200 < t) {
      //     lastUpdateTime = t;
      //     cachingProgress((i / requiredQuestions.size) * 0.3 + 0.7);
      //   }
      // }
      // if (isStaticNotLoaded)
      //   basicStore.notify({
      //     title: 'Some images or audio may not be available offline.',
      //     timeout: 10000,
      //     type: NotificationType.Info,
      //   });
      cachingProgress(1);
      requiredQuestions.clear();
    } catch (e) {
      cachingProgress(0);
      console.error(e);
    }
  }
  /** Put this into createEffect to subsribe to updates */
  function updateSubsribtion() {
    const $me = authStore.me();
    if (
      authStore.ready() &&
      $me &&
      ($me.permissions.includes('admin') || $me.permissions.includes('study')) &&
      outdated()
    ) {
      void update();
      return true;
    }
    return false;
  }

  // === Effects ===
  // Outdate on becoming online from offline
  createEffect<boolean>((prev) => {
    const $online = basicStore.online();
    if (prev === false && $online) outdated(true);
    return $online;
  });

  return {
    updateSubsribtion,
    update,
    outdated,
    startDate,
    today,
    statsGraph,
    themes,
    addTheme,
    removeTheme,
    getSubject,
    getQuestion,
    updateQuestion,
    submitAnswer,
    getImmersionKitExamples,
    searchSubjects,
    settings,
    now,
    turnedOnThemes,
    availableLessons,
    availableReviews,
    offlineUnavailable,
    ready,
    srsMap,
    activity,
    cachingProgress,
  };
}

const Context = createContext<ReturnType<typeof getProvided>>();
export const StudyProvider: ParentComponent = (props) => (
  <Context.Provider value={getProvided()}>{props.children}</Context.Provider>
);
export const useStudy = () => useContext(Context);
