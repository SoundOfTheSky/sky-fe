import { ReactiveMap } from '@solid-primitives/map';
import { createWritableMemo } from '@solid-primitives/memo';
import { useLocation } from '@solidjs/router';
import {
  batch,
  createContext,
  createEffect,
  createMemo,
  createResource,
  getOwner,
  ParentComponent,
  runWithOwner,
  untrack,
  useContext,
} from 'solid-js';
import { isJapanese as wkIsJapanese, toKana } from 'wanakana';

import basicStore, { NotificationType } from '@/services/basic.store';
import { handleError } from '@/services/fetch';
import { atom, atomize, persistentAtom, useInterval, useTimeout } from '@/services/reactive';
import { shuffleArray } from '@/services/utils';

import { Question, useStudy } from '../services/study.context';

export enum SubjectStatus {
  Unanswered,
  Correct,
  CorrectAfterWrong,
  Wrong,
  Unlearned,
}

function getProvided() {
  // === Hooks ===
  const {
    availableReviews,
    getSubject,
    getQuestion,
    availableLessons,
    updateQuestion,
    settings,
    submitAnswer,
    ready,
    srsMap,
  } = useStudy()!;
  const location = useLocation();
  const { notify } = basicStore;
  const timeInterval = useInterval(updateTime, 1000);
  const owner = getOwner();

  // === State ===
  /** Cache for all requests happening in this scope */
  const cache = new Map();
  /** Time then review started */
  const startTime = Date.now();
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
      status: SubjectStatus;
      time: number;
      answers: string[];
      undo: boolean;
    }
  >();
  /** Status of each question */
  const questionsStatuses = new ReactiveMap<number, SubjectStatus>();
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
    question: SubjectStatus;
    subject: SubjectStatus;
  }>();
  /** setTimeout for cooldown of next */
  const cooldownNext = atom<number>();
  /** setTimeout for cooldown of undo */
  const cooldownUndo = atom<number>();

  // === Memos ===
  /** Current subject id */
  const subjectId = createMemo<number | undefined>(() => subjectIds()[subjectI()]);
  /** Current subject stats */
  const subjectStats = createMemo(() => subjectsStats.get(subjectId() ?? 0));
  /** Current subject */
  const [subject] = createResource(subjectId, (id) => getSubject(id));
  /** Subject question statuses array. Also this memo populates questionsStatuses as new question appear */
  const currentSubjectQuestionsStatuses = createMemo<SubjectStatus[]>(
    () =>
      subject()?.questionIds.map((id) => {
        let s = questionsStatuses.get(id);
        if (s === undefined) {
          s = lessonsMode() ? SubjectStatus.Unlearned : SubjectStatus.Unanswered;
          questionsStatuses.set(id, s);
        }
        return s;
      }) ?? [],
  );
  /** Current question status */
  const questionStatus = createMemo<SubjectStatus | undefined>(() => currentSubjectQuestionsStatuses()[questionI()]);
  /** Current question id */
  const questionId = createMemo<number | undefined>(() => subject()?.questionIds[questionI()]);
  /** Current question */
  const [question] = createResource(questionId, (id) => getQuestion(id));
  /** Answers for current question */
  const answers = createMemo(() => {
    const $question = question();
    if (!$question) return [];
    if ($question.choose) {
      if ($question.answers[0] === 'Correct') return [];
      return [$question.answers[0], ...($question.synonyms ?? [])];
    }
    return [...$question.answers, ...($question.synonyms ?? [])];
  });
  /** Is answers to question in japanese */
  const isJapanese = createMemo(() => (question() ? wkIsJapanese(question()!.answers[0]) : false));
  /** Current subject SRS */
  const srs = createMemo(() => (subject() ? srsMap[subject()!.srsId - 1] : undefined));
  /** Some stats of session */
  const stats = createMemo(() => {
    const amount = subjectIds().length;
    let correct = 0;
    let passed = 0;
    let answered = 0;
    for (const { status } of subjectsStats.values()) {
      switch (status) {
        case SubjectStatus.Correct:
          correct++;
        case SubjectStatus.CorrectAfterWrong:
          passed++;
        case SubjectStatus.Wrong:
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
  const isLoading = createMemo(() => !ready() || !subject() || subject.loading || !question() || question.loading);
  /** Is current question answered */
  const questionAnswered = createMemo(() => !!previousState() || subjectStats()?.status === SubjectStatus.Unlearned);

  // === Effects ===
  // Set page title
  createEffect(() => {
    document.title = (lessonsMode() ? 'Sky | Lessons ' : 'Sky | Reviews ') + stats().unpassed;
  });
  // On load
  createEffect(() => {
    if (!ready()) return;
    const $lessonsMode = lessonsMode();
    let subjects = $lessonsMode ? availableLessons() : availableReviews();
    if (untrack(shuffleSubjects)) subjects = shuffleArray(subjects);
    else subjects.sort((a, b) => a - b);
    subjects = subjects.slice(0, settings()[$lessonsMode ? 'lessons' : 'reviews'].amount);
    if (subjects.length === 0) {
      done(true);
      clearInterval(timeInterval);
    }
    const status = $lessonsMode ? SubjectStatus.Unlearned : SubjectStatus.Unanswered;
    batch(() => {
      subjectIds(subjects);
      for (const id of subjects) subjectsStats.set(id, { title: '', status, time: 0, undo: false, answers: [] });
    });
  });
  // On subject load save it's title to stats
  createEffect(() => {
    const $subject = subject();
    const $subjectStats = subjectStats();
    if (!$subject || !$subjectStats) return;
    $subjectStats.title = $subject.title;
  });
  // On question change
  createEffect(onQuestionChange);
  // On subject change, change current question
  createEffect(() => {
    subject();
    questionI(
      untrack(currentSubjectQuestionsStatuses).findIndex(
        (q) => q === SubjectStatus.Unlearned || q === SubjectStatus.Unanswered || q === SubjectStatus.Wrong,
      ),
    );
  });

  // === Functions ===
  /** Clear some state on question change. Also used as effect */
  function onQuestionChange() {
    const $question = question();
    if (!$question) return;
    untrack(() => {
      batch(() => {
        previousState(undefined);
        answer('');
        note($question.note ?? '');
        synonyms($question.synonyms ?? []);
        hint(subjectStats()?.status === SubjectStatus.Unlearned ? answers().join(', ') : '');
        clearTimeout(cooldownUndo());
        cooldownUndo(undefined);
      });
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
  /** On submit button press */
  function submit() {
    untrack(() => {
      const $question = question();
      if (isJapanese()) answer(toKana);
      const $answer = answer().trim().toLowerCase();
      const isUnlearned = subjectStats()?.status === SubjectStatus.Unlearned;
      if (!$question || (!$answer && !isUnlearned)) return;
      if (previousState() || isUnlearned) nextQuestion();
      else commitAnswer($question, $answer);
    });
  }
  /** Update current question status. Also updates subject status if needed. Saves previous state */
  function updateQuestionStatus(newQuestionStatus: SubjectStatus) {
    untrack(() => {
      batch(() => {
        const $questionI = questionI();
        const $subjectId = subjectId()!;
        const $subjectStats = subjectsStats.get($subjectId)!;
        const $questionStatuses = currentSubjectQuestionsStatuses().map((q, index) =>
          index === $questionI ? newQuestionStatus : q,
        );
        previousState({
          subject: $subjectStats.status,
          question: questionStatus()!,
        });
        if ($questionStatuses.every((status) => status === SubjectStatus.Unanswered))
          $subjectStats.status = SubjectStatus.Unanswered;
        else if (
          newQuestionStatus === SubjectStatus.Wrong ||
          $questionStatuses.every((status) => status !== SubjectStatus.Unanswered)
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
        const $answers = answers();
        if ($answers.length === 0 ? a === 'correct' : $answers.some((qa) => qa.toLowerCase() === a)) {
          updateQuestionStatus(
            lessonsMode() || questionStatus() === SubjectStatus.Unanswered
              ? SubjectStatus.Correct
              : SubjectStatus.CorrectAfterWrong,
          );
          hint($answers.join(', '));
          subjectStats()!.answers.push(a);
        } else if (q.alternateAnswers && a in q.alternateAnswers) hint(q.alternateAnswers[answer()]);
        else {
          if (!lessonsMode()) subjectStats()!.answers.push(a);
          updateQuestionStatus(SubjectStatus.Wrong);
          hint($answers.join(', '));
          runWithOwner(owner, () => {
            cooldownUndo(useTimeout(() => cooldownUndo(undefined), 20_000));
            cooldownNext(useTimeout(() => cooldownNext(undefined), 2000));
          });
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
      if ($subjectStats.status === SubjectStatus.Unlearned) {
        updateQuestionStatus(SubjectStatus.Unanswered);
        $subjectStats.status = subjectStats()!.status;
        if ($subjectStats.status === SubjectStatus.Unlearned && $consistentQuestions)
          questionI(currentSubjectQuestionsStatuses().indexOf(SubjectStatus.Unlearned));
        else nextSubject();
      } else if ($consistentQuestions && $subjectStats.status === SubjectStatus.Unanswered)
        questionI(currentSubjectQuestionsStatuses().indexOf(SubjectStatus.Unanswered));
      else if (
        $consistentQuestions &&
        $subjectStats.status === SubjectStatus.Wrong &&
        $questionStatus !== SubjectStatus.Wrong
      )
        questionI(
          currentSubjectQuestionsStatuses().findIndex(
            (q) => q === SubjectStatus.Unanswered || q === SubjectStatus.Wrong,
          ),
        );
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
            return status === SubjectStatus.Correct || status === SubjectStatus.CorrectAfterWrong;
          })
        ) {
          subjectI($lessonsBatchLimit);
          lessonsBatchLimit((x) => x + $batch);
        } else if (
          $subjectStats.status === SubjectStatus.Correct ||
          $subjectStats.status === SubjectStatus.CorrectAfterWrong
        )
          subjectI((x) => x + 1);
        else {
          $subjectIds.splice($lessonsBatchLimit - 1, 0, $subjectIds.splice($subjectI, 1)[0]);
          subjectIds([...$subjectIds]);
        }
      } else if (
        $subjectStats.status === SubjectStatus.Correct ||
        $subjectStats.status === SubjectStatus.CorrectAfterWrong
      )
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
      const $subjectStats = subjectStats()!;
      batch(() => {
        subjectsStats.set($subjectId, {
          ...$subjectStats,
          status: pState.subject,
          undo: true,
          answers: $subjectStats.answers.slice(0, -1),
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
            $subjectStats.status === SubjectStatus.Correct
          : $previousState.subject === SubjectStatus.Unanswered && $subjectStats.status !== SubjectStatus.Unanswered)
      ) {
        try {
          await submitAnswer(
            subjectId()!,
            $subjectStats.answers,
            $subjectStats.time,
            $subjectStats.status === SubjectStatus.Correct ||
              // Correct after wrong is also fine in lessons mode
              ($subjectStats.status === SubjectStatus.CorrectAfterWrong && $lessonsMode),
          );
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
    const $synonyms = synonyms()
      .map((x) => x.trim())
      .filter(Boolean);
    const $note = note().trim();
    $question.synonyms = $synonyms;
    $question.note = $note;
    await updateQuestion($question.id, {
      note: $note,
      synonyms: $synonyms,
    });
  }

  return {
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
    currentSubjectQuestionsStatuses,
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
    synonyms,
    sendQuestionDataToServer,
    note,
    srs,
    cache,
    startTime,
    subjectsStats,
    answers,
  };
}

const Context = createContext<ReturnType<typeof getProvided>>();
export const ReviewProvider: ParentComponent = (props) => {
  const provided = getProvided();
  return <Context.Provider value={provided}>{props.children}</Context.Provider>;
};
export const useReview = () => useContext(Context);
