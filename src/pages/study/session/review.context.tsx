import {
  batch,
  createContext,
  createEffect,
  createMemo,
  createResource,
  ParentComponent,
  untrack,
  useContext,
} from 'solid-js';
import { isJapanese as wkIsJapanese, toKana } from 'wanakana';
import { createWritableMemo } from '@solid-primitives/memo';
import { ReactiveMap } from '@solid-primitives/map';
import { useLocation } from '@solidjs/router';

import basicStore, { NotificationType } from '@/services/basic.store';
import { atom, atomize, persistentAtom, useInterval, useTimeout } from '@/services/reactive';
import { CacheContext, handleError, request } from '@/services/fetch';
import { shuffleArray } from '@/services/utils';
import { Question, useStudy } from '../services/study.context';

export enum StatusCode {
  Unanswered,
  Correct,
  CorrectAfterWrong,
  Wrong,
  Unlearned,
}

function getProvided() {
  // === Hooks ===
  const {
    outdated,
    updateAllIfOutdated,
    themesData,
    availableReviews,
    getSubject,
    getQuestion,
    availableLessons,
    getSRS,
    updateQuestion,
    settings,
    submitAnswer,
  } = useStudy()!;
  const location = useLocation();
  const { getWord, notify } = basicStore;
  const timeInterval = useInterval(1000, updateTime);
  updateAllIfOutdated();

  // === State ===
  /** Cache for all requests happening in this scope */
  const cache = new Map();
  /** Time then review started */
  const startTime = Date.now();
  /** Is currently preloading */
  let isPreloading = false;
  /** Subject ids to preload */
  const toPreload = new Set<number>();
  /** Preloaded subject ids */
  const preloaded = new Set<number>();

  /** Is doing lessons instead of reviews*/
  const lessonsMode = createMemo(() => location.pathname.includes('/lessons'));
  /** End index of current batch of lessons. Used only in lessons mode */
  const lessonsBatchLimit = atomize(createWritableMemo(() => settings()[lessonsMode() ? 'lessons' : 'reviews'].batch));
  /** Array of all subject ids to do in this session. Order is important */
  const subjectIds = atom<number[]>([]);
  /** Stats for each subject */
  const subjectsStats = new ReactiveMap<
    number,
    {
      title: string;
      status: StatusCode;
      time: number;
      undo: boolean;
    }
  >();
  /** Status of each question */
  const questionsStatuses = new ReactiveMap<number, StatusCode>();
  /** Index of current subject */
  const subjectI = atom(0);
  /** Index of current question in subject */
  const questionI = atom(0);
  /** User's answer */
  const answer = atom('');
  /** Hint under question */
  const hint = atom('');
  /** User's synonyms that also count as answer */
  const synonyms = atom<string[]>([]);
  /** User's note to question */
  const note = atom('');
  /** Is session done */
  const done = atom(false);
  /** Estimated time in minutes till end of session */
  const eta = atom(0);
  /** String to show time paseed since start of the session */
  const timePassed = atom('-');
  /** Is shuffle enabled */
  const shuffleSubjects = persistentAtom('study-shuffle-subjects', false);
  /** Is consistent question enabled. If enabled each time you answer question, subject will change */
  const consistentQuestions = persistentAtom('study-consistent-questions', true);
  /** Is autoplay audio enabled. If enabled all <Audio> will automatically play on render */
  const autoplayAudio = persistentAtom('study-audio-autoplay', 0);
  /** State to return to if undo is pressed */
  const previousState = atom<{
    question: StatusCode;
    subject: StatusCode;
  }>();
  /** setTimeout for cooldown of next */
  const cooldownNext = atom<number>();
  /** setTimeout for cooldown of undo */
  const cooldownUndo = atom<number>();

  // === Memos ===
  /** Is theme loading */
  const isThemesLoading = createMemo(() => themesData() === undefined);
  /** Current subject id */
  const subjectId = createMemo<number | undefined>(() => subjectIds()[subjectI()]);
  /** Current subject stats */
  const subjectStats = createMemo(() => subjectsStats.get(subjectId() ?? 0));
  /** Current subject */
  const [subject] = createResource(subjectId, (id) =>
    getSubject(id, {
      useCache: cache,
    }),
  );
  /** Subject question statuses array. Also this memo populates questionsStatuses as new question appear */
  const subjectQuestionsStatuses = createMemo<StatusCode[]>(
    () =>
      subject()?.questionIds.map((id) => {
        let s = questionsStatuses.get(id);
        if (s === undefined) {
          s = lessonsMode() ? StatusCode.Unlearned : StatusCode.Unanswered;
          questionsStatuses.set(id, s);
        }
        return s;
      }) ?? [],
  );
  /** Current question status */
  const questionStatus = createMemo<StatusCode | undefined>(() => subjectQuestionsStatuses()[questionI()]);
  /** Current question id */
  const questionId = createMemo<number | undefined>(() => subject()?.questionIds[questionI()]);
  /** Current question */
  const [question] = createResource(questionId, (id) =>
    getQuestion(id, {
      useCache: cache,
    }),
  );
  /** Is answers to question in japanese */
  const isJapanese = createMemo(() => (question() ? wkIsJapanese(question()!.answers[0]) : false));
  /** Current question description */
  const [questionDescription] = createResource(
    () => question()?.descriptionWordId,
    (id) =>
      getWord(id, {
        useCache: cache,
      }),
  );
  /** Current subject SRS */
  const [srs] = createResource(
    () => subject()?.srsId,
    (id) =>
      getSRS(id, {
        useCache: cache,
      }),
  );
  /** Some stats of session */
  const stats = createMemo(() => {
    const amount = subjectIds().length;
    let correct = 0;
    let passed = 0;
    let answered = 0;
    for (const { status } of subjectsStats.values()) {
      switch (status) {
        case StatusCode.Correct:
          correct++;
        case StatusCode.CorrectAfterWrong:
          passed++;
        case StatusCode.Wrong:
          answered++;
      }
    }
    return {
      amount,
      correct,
      passed,
      answered,
      progress: passed / amount,
      unpassed: amount - passed,
      correctPercent: answered === 0 ? 1 : correct / answered,
    };
  });
  /** Is something loading */
  const isLoading = createMemo(
    () => isThemesLoading() || !subject() || subject.loading || !question() || question.loading,
  );
  /** Is current question answered */
  const questionAnswered = createMemo(() => !!previousState() || subjectStats()?.status === StatusCode.Unlearned);

  // === Effects ===
  // Set page title
  createEffect(() => {
    document.title = (lessonsMode() ? 'Sky | Lessons ' : 'Sky | Reviews ') + stats().unpassed;
  });
  // On load
  createEffect(() => {
    if (isThemesLoading()) return;
    const $lessonsMode = lessonsMode();
    let subjects = $lessonsMode ? availableLessons() : availableReviews();
    if (untrack(shuffleSubjects)) subjects = shuffleArray(subjects);
    else subjects.sort((a, b) => a - b);
    subjects = subjects.slice(0, settings()[$lessonsMode ? 'lessons' : 'reviews'].amount);
    if (subjects.length === 0) {
      done(true);
      clearInterval(timeInterval);
    }
    const status = $lessonsMode ? StatusCode.Unlearned : StatusCode.Unanswered;
    batch(() => {
      subjectIds(subjects);
      for (const id of subjects) subjectsStats.set(id, { title: '', status, time: 0, undo: false });
    });
  });
  // On subject load save it's title to stats
  createEffect(() => {
    const $subject = subject();
    const $subjectStats = subjectStats();
    if (!$subject || !$subjectStats) return;
    $subjectStats.title = $subject.title;
  });
  // Preload on subjectI change
  createEffect(() => {
    const $subjectI = subjectI();
    const preloadAmount = settings()[lessonsMode() ? 'lessons' : 'reviews'].preload;
    if (preloadAmount) void preload(subjectIds().slice($subjectI, $subjectI + preloadAmount));
  });
  // On question change
  createEffect(onQuestionChange);
  // On subject change, change current question
  createEffect(() => {
    subject();
    questionI(
      untrack(subjectQuestionsStatuses).findIndex(
        (q) => q === StatusCode.Unlearned || q === StatusCode.Unanswered || q === StatusCode.Wrong,
      ),
    );
  });

  // === Functions ===
  /** Clear some state on question change. Also used as effect */
  function onQuestionChange() {
    const $question = question();
    if (!$question) return;
    const $subjectStats = untrack(subjectStats);
    batch(() => {
      previousState(undefined);
      answer('');
      note($question.note ?? '');
      synonyms($question.synonyms ?? []);
      hint($subjectStats?.status === StatusCode.Unlearned ? $question.answers.join(', ') : '');
      clearTimeout(untrack(cooldownUndo));
      cooldownUndo(undefined);
    });
  }
  /** Shuffle subjects. Only shuffles lessons and reviews after current batch */
  function shuffle(enabled: boolean) {
    untrack(() => {
      const startShuffle =
        untrack(subjectI) + (untrack(lessonsMode) ? settings().lessons.batch : settings().reviews.batch);
      subjectIds((s) => [
        ...s.slice(0, startShuffle),
        ...(enabled ? shuffleArray(s.slice(startShuffle)) : s.slice(startShuffle).sort((a, b) => a - b)),
      ]);
    });
  }
  /** Preload subject ids */
  async function preload(ids: number[]) {
    for (const id of ids) {
      if (preloaded.has(id)) continue;
      toPreload.add(id);
    }
    if (isPreloading) return;
    isPreloading = true;
    for (const id of toPreload) {
      const subject = await getSubject(id, {
        useCache: cache,
      });
      await getSRS(subject.srsId, {
        useCache: cache,
      });
      for (const qId of subject.questionIds) {
        const question = await getQuestion(qId, {
          useCache: cache,
        });
        const word = await getWord(question.descriptionWordId, {
          useCache: cache,
        });
        for (const [match] of word.matchAll(/"\/static\/.+?"/g)) {
          await request(match.slice(1, -1), {
            useCache: cache,
          });
        }
      }
      preloaded.add(id);
      toPreload.delete(id);
    }
    isPreloading = false;
  }
  /** On submit button press */
  function submit() {
    untrack(() => {
      const $question = question();
      if (isJapanese()) answer(toKana);
      const $answer = answer().trim().toLowerCase();
      const isUnlearned = subjectStats()?.status === StatusCode.Unlearned;
      if (!$question || (!$answer && !isUnlearned)) return;
      if (previousState() || isUnlearned) nextQuestion();
      else commitAnswer($question, $answer);
    });
  }
  /** Update current question status. Also updates subject status if needed. Saves previous state */
  function updateQuestionStatus(newQuestionStatus: StatusCode) {
    untrack(() => {
      batch(() => {
        const $questionI = questionI();
        const $subjectId = subjectId()!;
        const $subjectStats = subjectsStats.get($subjectId)!;
        const $questionStatuses = subjectQuestionsStatuses().map((q, index) =>
          index === $questionI ? newQuestionStatus : q,
        );
        previousState({
          subject: $subjectStats.status,
          question: questionStatus()!,
        });
        if ($questionStatuses.every((status) => status === StatusCode.Unanswered))
          $subjectStats.status = StatusCode.Unanswered;
        else if (
          newQuestionStatus === StatusCode.Wrong ||
          $questionStatuses.every((status) => status !== StatusCode.Unanswered)
        )
          $subjectStats.status = Math.max(...$questionStatuses);

        questionsStatuses.set(questionId()!, newQuestionStatus);
        subjectsStats.set($subjectId, { ...$subjectStats });
      });
    });
  }
  /** Commit answer. Doesn't send update yet, start cooldowns */
  function commitAnswer(q: Question, a: string) {
    untrack(() => {
      batch(() => {
        if ([...q.answers, ...(q.synonyms ?? [])].some((qa) => qa.toLowerCase() === a)) {
          updateQuestionStatus(
            lessonsMode() || questionStatus() === StatusCode.Unanswered
              ? StatusCode.Correct
              : StatusCode.CorrectAfterWrong,
          );
          hint(q.answers.join(', '));
        } else if (q.alternateAnswers && a in q.alternateAnswers) hint(q.alternateAnswers[answer()]);
        else {
          updateQuestionStatus(StatusCode.Wrong);
          hint(q.answers.join(', '));
          cooldownUndo(useTimeout(20_000, () => cooldownUndo(undefined)));
          cooldownNext(useTimeout(2000, () => cooldownNext(undefined)));
        }
      });
    });
  }
  /** Change to next question. Sends update. */
  function nextQuestion() {
    untrack(() => {
      const $questionStatus = questionStatus();
      const $consistentQuestions = consistentQuestions();
      const $subjectStats = subjectStats()!;
      void sendSubjectStatusToServer();
      if (stats().progress === 1) {
        clearInterval(timeInterval);
        done(true);
      }
      if ($subjectStats.status === StatusCode.Unlearned) {
        updateQuestionStatus(StatusCode.Unanswered);
        $subjectStats.status = subjectStats()!.status;
        if ($subjectStats.status === StatusCode.Unlearned && $consistentQuestions)
          questionI(subjectQuestionsStatuses().indexOf(StatusCode.Unlearned));
        else nextSubject();
      } else if ($consistentQuestions && $subjectStats.status === StatusCode.Unanswered)
        questionI(subjectQuestionsStatuses().indexOf(StatusCode.Unanswered));
      else if (
        $consistentQuestions &&
        $subjectStats.status === StatusCode.Wrong &&
        $questionStatus !== StatusCode.Wrong
      )
        questionI(subjectQuestionsStatuses().findIndex((q) => q === StatusCode.Unanswered || q === StatusCode.Wrong));
      else nextSubject();
      // May retry same question, so we need explicit reset
      onQuestionChange();
    });
  }
  /** Proceed to next subject. Requeues subjects if wrong */
  function nextSubject() {
    untrack(() => {
      const $subjectI = subjectI();
      const $batch = settings()[lessonsMode() ? 'lessons' : 'reviews'].batch;
      const $subjectStats = subjectStats()!;
      if (lessonsMode()) {
        const $subjectIds = [...subjectIds()];
        const $lessonsBatchLimit = lessonsBatchLimit();
        if (
          $subjectIds.slice($lessonsBatchLimit - $batch, $lessonsBatchLimit).every((id) => {
            const { status } = subjectsStats.get(id)!;
            return status === StatusCode.Correct || status === StatusCode.CorrectAfterWrong;
          })
        ) {
          subjectI($lessonsBatchLimit);
          lessonsBatchLimit((x) => x + $batch);
        } else if ($subjectStats.status === StatusCode.Correct || $subjectStats.status === StatusCode.CorrectAfterWrong)
          subjectI((x) => x + 1);
        else {
          $subjectIds.splice($lessonsBatchLimit - 1, 0, $subjectIds.splice($subjectI, 1)[0]);
          subjectIds([...$subjectIds]);
        }
      } else if ($subjectStats.status === StatusCode.Correct || $subjectStats.status === StatusCode.CorrectAfterWrong)
        subjectI((i) => i + 1);
      else
        subjectIds(($subjectIds) => {
          $subjectIds.splice($subjectI + $batch - 1, 0, $subjectIds.splice($subjectI, 1)[0]);
          return [...$subjectIds];
        });
    });
  }
  /** Undo commited, but not sent answer */
  function undo() {
    untrack(() => {
      const pState = previousState();
      if (!pState) return;
      const $subjectId = subjectId()!;
      batch(() => {
        subjectsStats.set($subjectId, {
          ...subjectsStats.get($subjectId)!,
          status: pState.subject,
          undo: true,
        });
        questionsStatuses.set(questionId()!, pState.question);
      });
      // We need to explicitely clear data
      onQuestionChange();
    });
  }
  /** Runs every second and updates time state */
  function updateTime() {
    untrack(() => {
      batch(() => {
        const $stats = stats();
        const $subjectStats = subjectStats()!;
        const time = Date.now() - startTime;
        const timeLeft = $stats.passed === 0 ? 0 : $stats.unpassed * (time / $stats.passed);
        const minsPassed = `${Math.floor(time / 60_000)}`.padStart(2, '0');
        const secsPassed = `${Math.floor((time % 60_000) / 1000)}`.padStart(2, '0');
        eta(Math.floor(timeLeft / 60_000));
        timePassed(`${minsPassed}:${secsPassed}`);
        if ($subjectStats) $subjectStats.time += 1;
      });
    });
  }
  /** Send subject review update to server. May don't do anything if it thinks it shouldn't */
  async function sendSubjectStatusToServer() {
    // eslint-disable-next-line solid/reactivity
    await untrack(async () => {
      const $subjectStats = subjectStats()!;
      const $previousState = previousState();
      const $lessonsMode = lessonsMode();
      if (
        $previousState &&
        ($lessonsMode
          ? // Don't update if answered wrong in lessons mode
            $subjectStats.status === StatusCode.Correct
          : $previousState.subject === StatusCode.Unanswered && $subjectStats.status !== StatusCode.Unanswered)
      ) {
        try {
          await submitAnswer(
            subjectId()!,
            $subjectStats.status === StatusCode.Correct ||
              // Correct after wrong is also fine in lessons mode
              ($subjectStats.status === StatusCode.CorrectAfterWrong && $lessonsMode),
          );
          // Invalidate study context
          outdated(true);
        } catch (error) {
          handleError(error);
          notify({
            title: 'Error while trying to commit your answer!',
            timeout: 10_000,
            type: NotificationType.Error,
          });
        }
      }
    });
  }
  /** Update synonyms and note */
  async function sendQuestionDataToServer() {
    const $question = question();
    if (!$question) return;
    const $synonyms = synonyms();
    const $note = note();
    $question.synonyms = $synonyms;
    $question.note = $note;
    await updateQuestion($question.id, {
      note: $note,
      synonyms: $synonyms,
    });
  }

  return {
    isThemesLoading,
    cooldownNext,
    submit,
    done,
    isLoading,
    stats,
    subjectIds,
    subjectId,
    timePassed,
    eta,
    question,
    hint,
    previousState,
    subjectStats,
    subject,
    autoplayAudio,
    currentSubjectQuestionsStatuses: subjectQuestionsStatuses,
    questionI,
    isJapanese,
    answer,
    questionStatus,
    shuffle,
    shuffleSubjects,
    consistentQuestions,
    questionAnswered,
    undo,
    cooldownUndo,
    questionDescription,
    synonyms,
    sendQuestionDataToServer,
    note,
    srs,
    cache,
    startTime,
    subjectsStats,
  };
}

const Context = createContext<ReturnType<typeof getProvided>>();
export const ReviewProvider: ParentComponent = (props) => {
  const provided = getProvided();
  return (
    <CacheContext.Provider value={provided.cache}>
      <Context.Provider value={provided}>{props.children}</Context.Provider>
    </CacheContext.Provider>
  );
};
export const useReview = () => useContext(Context);
