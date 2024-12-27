import { shuffleArray } from '@softsky/utils'
import { ReactiveMap } from '@solid-primitives/map'
import { createWritableMemo } from '@solid-primitives/memo'
import { useLocation } from '@solidjs/router'
import {
  batch,
  createContext,
  createEffect,
  createMemo,
  createResource,
  getOwner,
  onCleanup,
  onMount,
  ParentComponent,
  runWithOwner,
  untrack,
  useContext,
} from 'solid-js'
import { toKana, isJapanese as wkIsJapanese } from 'wanakana'

import basicStore from '@/services/basic.store'
import { modalsStore, Severity } from '@/services/modals.store'
import {
  atom,
  atomize,
  persistentAtom,
  useInterval,
  useTimeout,
} from '@/services/reactive'
import { getDefaultRestFields } from '@/services/rest'
import syncStore from '@/services/sync.store'

import { useStudy } from '../services/study.context'
import {
  RESTStudyAnswer,
  RESTStudyUserQuestion,
  studyQuestionEndpoint,
  studySubjectEndpoint,
  studyUserQuestionEndpoint,
  studyUserSubjectEndpoint,
} from '../services/study.rest'

const { t } = basicStore

export enum SubjectStatus {
  Correct,
  CorrectAfterWrong,
  Unanswered,
  Wrong,
  Unlearned,
}

function getProvided() {
  // === Hooks ===
  const { settings, ready, lessons, reviews, update } = useStudy()!
  const location = useLocation()
  const timeInterval = useInterval(updateTime, 1000)
  const owner = getOwner()
  onMount(update)
  onCleanup(() => {
    if (subjectI() !== 0) void syncStore.sync()
  })

  // === State ===
  /** Array of all subject ids to do in this session. Order is important */
  const subjectIds = atom<number[]>([])
  /** Time then review started */
  const startTime = Date.now()
  /** Is doing lessons instead of reviews */
  const lessonsMode = createMemo(() => location.pathname.includes('/lessons'))
  /** End index of current batch of lessons. Used only in lessons mode */
  const lessonsBatchLimit = atomize(
    createWritableMemo(
      () => settings()[lessonsMode() ? 'lessons' : 'reviews'].batch,
    ),
  )
  /** Stats for each subject */
  const subjectsStats = new ReactiveMap<
    number,
    {
      title: string
      status: SubjectStatus
      time: number
      answers: string[]
      undo: boolean
    }
  >()
  /** Status of each question */
  const questionsStatuses = new ReactiveMap<number, SubjectStatus>()
  /** Index of current subject */
  const subjectI = atom(0)
  /** Index of current question in subject */
  const questionI = atom(0)
  /** User's answer */
  const answer = atom('')
  /** User's synonyms that also count as answer */
  const synonyms = atom<string[]>([])
  /** User's note to question */
  const note = atom('')
  /** Is session done */
  const done = atom(false)
  /** Estimated time in minutes till end of session */
  const eta = atom(0)
  /** String to show time paseed since start of the session */
  const timePassed = atom('-')
  /** Is shuffle enabled */
  const shuffleSubjects = persistentAtom('study-shuffle-subjects', false)
  /** Is consistent question enabled. If enabled each time you answer question, subject will change */
  const consistentQuestions = persistentAtom('study-consistent-questions', true)
  /** Is autoplay audio enabled. If enabled all <Audio> will automatically play on render */
  const autoplayAudio = persistentAtom('study-audio-autoplay', 0)
  /** State to return to if undo is pressed */
  const previousState = atom<{
    question: SubjectStatus
    subject: SubjectStatus
  }>()
  /** setTimeout for cooldown of next */
  const cooldownNext = atom<number>()
  /** setTimeout for cooldown of undo */
  const cooldownUndo = atom<number>()

  // === Memos ===
  /** Current subject id */
  const subjectId = createMemo<number | undefined>(
    () => subjectIds()[subjectI()],
  )
  /** Current subject */
  const [subject] = createResource(subjectId, id =>
    studySubjectEndpoint.get(id),
  )
  /** Current question id */
  const questionId = createMemo<number | undefined>(
    () => subject()?.data.questionIds[questionI()],
  )
  /** Current question */
  const [question] = createResource(questionId, id =>
    studyQuestionEndpoint.get(id),
  )
  /** Current subject info */
  const [subjectInfo] = createResource(subject, subject =>
    subject.data.userSubjectId
      ? studyUserSubjectEndpoint.get(subject.data.userSubjectId)
      : undefined,
  )
  /** Current question info */
  const [questionInfo, { mutate: mutateQuestionInfo }] = createResource(
    question,
    question =>
      question.data.userQuestionId
        ? studyUserQuestionEndpoint.get(question.data.userQuestionId)
        : undefined,
  )

  /** Current subject stats */
  const subjectStats = createMemo(() => subjectsStats.get(subjectId() ?? 0))
  /** Subject question statuses array. Also this memo populates questionsStatuses as new question appear */
  const currentSubjectQuestionsStatuses = createMemo<SubjectStatus[]>(() => {
    return (
      subject()?.data.questionIds.map((id) => {
        let s = questionsStatuses.get(id)
        if (s === undefined) {
          s = lessonsMode() ? SubjectStatus.Unlearned : SubjectStatus.Unanswered
          questionsStatuses.set(id, s)
        }
        return s
      }) ?? []
    )
  })
  /** Current question status */
  const questionStatus = createMemo<SubjectStatus | undefined>(
    () => currentSubjectQuestionsStatuses()[questionI()],
  )
  /** Is answers to question in japanese */
  const isJapanese = createMemo(() =>
    question() ? wkIsJapanese(question()!.data.answers[0]) : false,
  )
  /** Some stats of session */
  const stats = createMemo(() => {
    const amount = subjectIds().length
    let correct = 0
    let passed = 0
    let answered = 0
    for (const { status } of subjectsStats.values()) {
      switch (status) {
        case SubjectStatus.Correct: {
          correct++
        }
        // eslint-disable-next-line no-fallthrough
        case SubjectStatus.CorrectAfterWrong: {
          passed++
        }
        // eslint-disable-next-line no-fallthrough
        case SubjectStatus.Wrong: {
          answered++
        }
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
    }
  })
  /** Is something loading */
  const isLoading = createMemo(() => {
    const $subjectId = subjectId()
    const $subject = subject()
    const $question = question()
    const $subjectInfo = subjectInfo()
    const $questionInfo = questionInfo() // May be undefined
    return (
      !ready()
      || !$subject
      || !$question
      || !$subjectInfo
      || questionInfo.loading
      || $subject.data.id !== $subjectId
      || $question.data.subjectId !== $subjectId
      || (!!$questionInfo && $questionInfo.data.questionId !== $question.data.id)
    )
  })
  /** Is current question answered */
  const questionAnswered = createMemo(
    () =>
      !!previousState() || subjectStats()?.status === SubjectStatus.Unlearned,
  )
  /** Hint under question */
  const hint = createMemo(() => {
    const $questionStatus = questionStatus()
    const $previousState = previousState()
    const $answer = answer().toLowerCase().trim()
    const $question = question()

    if (question.loading || !$question || $questionStatus === undefined)
      return ''
    const answers = getAnswers()
    const alt = $question.data.alternateAnswers?.[$answer]
    if (!answers.includes($answer) && alt) return alt
    if (
      (!$previousState && $questionStatus !== SubjectStatus.Unlearned)
      || (answers.length === 1 && answers[0] === 'correct')
    )
      return ''
    return getAnswers(true).join(', ')
  })
  // === Effects ===
  // Set page title
  createEffect(() => {
    document.title
      = (lessonsMode() ? 'Обучение | Уроки ' : 'Обучение | Повторения ')
      + stats().unpassed
  })
  // On themes ONCE
  createEffect<true | undefined>((isDone) => {
    if (isDone) return true
    if (!ready()) return
    const $lessonsMode = lessonsMode()
    let subjects = $lessonsMode ? lessons() : reviews()
    if (untrack(shuffleSubjects)) subjects = shuffleArray(subjects)
    else subjects.sort((a, b) => a - b)
    subjects = subjects.slice(
      0,
      settings()[$lessonsMode ? 'lessons' : 'reviews'].amount,
    )
    if (subjects.length === 0) {
      done(true)
      clearInterval(timeInterval)
    }
    const status = $lessonsMode
      ? SubjectStatus.Unlearned
      : SubjectStatus.Unanswered
    batch(() => {
      subjectIds(subjects)
      for (const id of subjects)
        subjectsStats.set(id, {
          title: '',
          status,
          time: 0,
          undo: false,
          answers: [],
        })
    })
    return true
  })
  // On subject load save it's title to stats
  createEffect(() => {
    if (isLoading()) return
    const $subject = subject()!
    const $subjectStats = subjectStats()!
    $subjectStats.title = $subject.data.title
  })
  // On subject change, change current question
  createEffect(() => {
    subject()
    questionI(
      untrack(currentSubjectQuestionsStatuses).findIndex(
        q =>
          q === SubjectStatus.Unlearned
          || q === SubjectStatus.Unanswered
          || q === SubjectStatus.Wrong,
      ),
    )
  })
  // Question info updated
  createEffect(() => {
    if (isLoading()) return
    const $questionInfo = questionInfo()
    synonyms($questionInfo?.data.synonyms ?? [])
    note($questionInfo?.data.note ?? '')
  })

  // === Functions ===
  /** Get all answers for current question */
  function getAnswers(disableLowercase?: boolean) {
    return untrack(() => {
      const $question = question()
      if (!$question || questionInfo.loading) return []
      const $questionInfo = questionInfo()
      const answers = $question.data.choose
        ? [$question.data.answers[0]!]
        : $question.data.answers
      if ($questionInfo?.data.synonyms)
        answers.push(...$questionInfo.data.synonyms)
      if (!disableLowercase)
        for (let index = 0; index < answers.length; index++)
          answers[index] = answers[index]!.toLocaleLowerCase()
      return answers
    })
  }
  /** Clear some state on question change */
  function onQuestionChange() {
    untrack(() => {
      batch(() => {
        previousState(undefined)
        answer('')
        clearTimeout(cooldownUndo())
        cooldownUndo(undefined)
      })
    })
  }
  /** Shuffle subjects. Only shuffles lessons and reviews after current batch */
  function shuffle(enabled: boolean) {
    untrack(() => {
      const startShuffle
        = subjectI()
        + (lessonsMode() ? settings().lessons.batch : settings().reviews.batch)
      subjectIds(s => [
        ...s.slice(0, startShuffle),
        ...(enabled
          ? shuffleArray(s.slice(startShuffle))
          : s.slice(startShuffle).sort((a, b) => a - b)),
      ])
    })
  }
  /** On submit button press */
  function submit() {
    untrack(() => {
      if (isLoading()) return
      if (isJapanese()) answer(toKana)
      const $answer = answer().trim().toLowerCase()
      const isUnlearned = subjectStats()?.status === SubjectStatus.Unlearned
      if (!$answer && !isUnlearned) return
      if (previousState() || isUnlearned) nextQuestion()
      else commitAnswer($answer)
    })
  }
  /** Update current question status. Also updates subject status if needed. Saves previous state */
  function updateQuestionStatus(newQuestionStatus: SubjectStatus) {
    untrack(() => {
      batch(() => {
        const $questionI = questionI()
        const $subjectId = subjectId()!
        const $subjectStats = subjectsStats.get($subjectId)!
        // Add new status
        const $questionStatuses = currentSubjectQuestionsStatuses().map(
          (q, index) => (index === $questionI ? newQuestionStatus : q),
        )
        previousState({
          subject: $subjectStats.status,
          question: questionStatus()!,
        })
        // When learning all questions TODO
        if (
          $questionStatuses.every(
            status => status === SubjectStatus.Unanswered,
          )
        )
          $subjectStats.status = SubjectStatus.Unanswered
        //
        else if (
          newQuestionStatus === SubjectStatus.Wrong
          || $questionStatuses.every(
            status => status !== SubjectStatus.Unanswered,
          )
        )
          $subjectStats.status = Math.max(...$questionStatuses)
        questionsStatuses.set(questionId()!, newQuestionStatus)
        subjectsStats.set($subjectId, { ...$subjectStats })
      })
    })
  }
  /** Commit answer. Doesn't send update yet, start cooldowns */
  function commitAnswer(answer: string) {
    untrack(() => {
      batch(() => {
        if (isLoading()) return
        const $question = question()!
        const answers = getAnswers()
        if (answers.includes(answer)) {
          updateQuestionStatus(
            lessonsMode() || questionStatus() === SubjectStatus.Unanswered
              ? SubjectStatus.Correct
              : SubjectStatus.CorrectAfterWrong,
          )
          subjectStats()!.answers.push(answer)
        }
        else if (!$question.data.alternateAnswers?.[answer]) {
          if (!lessonsMode()) subjectStats()!.answers.push(answer)
          updateQuestionStatus(SubjectStatus.Wrong)
          runWithOwner(owner, () => {
            cooldownUndo(useTimeout(() => cooldownUndo(undefined), 20_000))
            cooldownNext(useTimeout(() => cooldownNext(undefined), 2000))
          })
        }
      })
    })
  }
  /** Change to next question. Sends update. */
  function nextQuestion() {
    untrack(() => {
      const $questionStatus = questionStatus()
      const $consistentQuestions = consistentQuestions()
      const $subjectStats = subjectStats()!
      void sendAnswerToServer()
      if (stats().progress === 1) {
        clearInterval(timeInterval)
        done(true)
      }
      if ($subjectStats.status === SubjectStatus.Unlearned) {
        updateQuestionStatus(SubjectStatus.Unanswered)
        $subjectStats.status = subjectStats()!.status
        if (
          $subjectStats.status === SubjectStatus.Unlearned
          && $consistentQuestions
        )
          questionI(
            currentSubjectQuestionsStatuses().indexOf(SubjectStatus.Unlearned),
          )
        else nextSubject()
      }
      else if (
        $consistentQuestions
        && $subjectStats.status === SubjectStatus.Unanswered
      )
        questionI(
          currentSubjectQuestionsStatuses().indexOf(SubjectStatus.Unanswered),
        )
      else if (
        $consistentQuestions
        && $subjectStats.status === SubjectStatus.Wrong
        && $questionStatus !== SubjectStatus.Wrong
      )
        questionI(
          currentSubjectQuestionsStatuses().findIndex(
            q => q === SubjectStatus.Unanswered || q === SubjectStatus.Wrong,
          ),
        )
      else nextSubject()
      // May retry same question, so we need explicit reset
      onQuestionChange()
    })
  }
  /** Proceed to next subject. Requeues subjects if wrong */
  function nextSubject() {
    untrack(() => {
      const $subjectI = subjectI()
      const $batch = settings()[lessonsMode() ? 'lessons' : 'reviews'].batch
      const $subjectStats = subjectStats()!
      if (lessonsMode()) {
        const $subjectIds = [...subjectIds()]
        const $lessonsBatchLimit = lessonsBatchLimit()
        if (
          $subjectIds
            .slice($lessonsBatchLimit - $batch, $lessonsBatchLimit)
            .every((id) => {
              const { status } = subjectsStats.get(id)!
              return (
                status === SubjectStatus.Correct
                || status === SubjectStatus.CorrectAfterWrong
              )
            })
        ) {
          subjectI($lessonsBatchLimit)
          lessonsBatchLimit(x => x + $batch)
        }
        else if (
          $subjectStats.status === SubjectStatus.Correct
          || $subjectStats.status === SubjectStatus.CorrectAfterWrong
        )
          subjectI(x => x + 1)
        else {
          $subjectIds.splice(
            $lessonsBatchLimit - 1,
            0,
            $subjectIds.splice($subjectI, 1)[0]!,
          )
          subjectIds([...$subjectIds])
        }
      }
      else if (
        $subjectStats.status === SubjectStatus.Correct
        || $subjectStats.status === SubjectStatus.CorrectAfterWrong
      )
        subjectI(index => index + 1)
      else {
        subjectIds(($subjectIds) => {
          const ids = [...$subjectIds]
          ids.splice($subjectI + $batch - 1, 0, ids.splice($subjectI, 1)[0]!)
          return ids
        })
      }
    })
  }
  /** Undo commited, but not sent answer */
  function undo() {
    untrack(() => {
      const pState = previousState()
      if (!pState) return
      const $subjectId = subjectId()!
      const $subjectStats = subjectStats()!
      batch(() => {
        subjectsStats.set($subjectId, {
          ...$subjectStats,
          status: pState.subject,
          undo: true,
        })
        questionsStatuses.set(questionId()!, pState.question)
      })
      // We need to explicitely clear data
      onQuestionChange()
    })
  }
  /** Runs every second and updates time state */
  function updateTime() {
    untrack(() => {
      batch(() => {
        const $stats = stats()
        const $subjectStats = subjectStats()
        const time = Date.now() - startTime
        const timeLeft
          = $stats.passed === 0 ? 0 : $stats.unpassed * (time / $stats.passed)
        const minsPassed = `${Math.floor(time / 60_000)}`.padStart(2, '0')
        const secsPassed = `${Math.floor((time % 60_000) / 1000)}`.padStart(
          2,
          '0',
        )
        eta(Math.floor(timeLeft / 60_000))
        timePassed(`${minsPassed}:${secsPassed}`)
        if ($subjectStats) $subjectStats.time += 1
      })
    })
  }
  /** Send subject review update to server. May don't do anything if it thinks it shouldn't */
  async function sendAnswerToServer() {
    // eslint-disable-next-line solid/reactivity
    await untrack(async () => {
      const $subjectStats = subjectStats()!
      const $previousState = previousState()
      const $lessonsMode = lessonsMode()
      if (
        $previousState
        && ($lessonsMode
          ? // Don't update if answered wrong in lessons mode
          $subjectStats.status === SubjectStatus.Correct
          : $previousState.subject === SubjectStatus.Unanswered
            && ($subjectStats.status === SubjectStatus.Correct
              || $subjectStats.status === SubjectStatus.Wrong))
      ) {
        try {
          await new RESTStudyAnswer({
            ...getDefaultRestFields(),
            answers: $subjectStats.answers.filter(
              x =>
                x.toLowerCase() !== 'wrong' && x.toLowerCase() !== 'correct',
            ),
            took: $subjectStats.time,
            correct:
              $subjectStats.status === SubjectStatus.Correct
              // Correct after wrong is also fine in lessons mode
              || ($subjectStats.status === SubjectStatus.CorrectAfterWrong
                && $lessonsMode),
            subjectId: subjectId()!,
            themeId: subject()!.data.themeId,
          }).create()
        }
        catch {
          modalsStore.notify({
            title: t('STUDY.SESSION.CHANGES_NOT_SAVED'),
            timeout: 10_000,
            severity: Severity.ERROR,
          })
        }
      }
    })
  }
  /** Update synonyms and note */
  async function sendQuestionDataToServer() {
    try {
      if (isLoading()) return
      const $questionInfo = new RESTStudyUserQuestion(
        questionInfo()?.data ?? {
          ...getDefaultRestFields(),
          // Payload
          questionId: questionId()!,
        },
      )
      const $synonyms = synonyms()
        .map(x => x.trim())
        .filter(Boolean)
      const $note = note().trim()
      const wasEmpty = !$questionInfo.data.synonyms && !$questionInfo.data.note
      $questionInfo.data.synonyms = $synonyms.length > 0 ? $synonyms : undefined
      $questionInfo.data.note = $note.length > 0 ? $note : undefined
      if (!$questionInfo.data.synonyms && !$questionInfo.data.note) {
        mutateQuestionInfo(undefined)
        await $questionInfo.delete()
      }
      else if (wasEmpty) {
        mutateQuestionInfo($questionInfo)
        await $questionInfo.create()
      }
      else {
        mutateQuestionInfo($questionInfo)
        await $questionInfo.update()
      }
    }
    catch {
      modalsStore.notify({
        title: t('STUDY.SESSION.CHANGES_NOT_SAVED'),
        timeout: 10_000,
        severity: Severity.ERROR,
      })
    }
  }

  return {
    // === State ===
    answer,
    autoplayAudio,
    consistentQuestions,
    cooldownNext,
    cooldownUndo,
    done,
    eta,
    hint,
    note,
    previousState,
    shuffleSubjects,
    startTime,
    subjectIds,
    subjectsStats,
    synonyms,
    timePassed,

    // === Memos ===
    currentSubjectQuestionsStatuses,
    isJapanese,
    isLoading,
    question,
    questionAnswered,
    questionInfo,
    questionStatus,
    stats,
    subject,
    subjectInfo,
    subjectStats,

    // === Functions ===
    sendQuestionDataToServer,
    shuffle,
    submit,
    undo,
  }
}

const Context = createContext<ReturnType<typeof getProvided>>()
export const SessionProvider: ParentComponent = (properties) => {
  const provided = getProvided()
  return (
    <Context.Provider value={provided}>{properties.children}</Context.Provider>
  )
}
export const useSession = () => useContext(Context)
