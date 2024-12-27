import { useParams } from '@solidjs/router'
import {
  batch,
  Component,
  createEffect,
  createMemo,
  createResource,
  For,
  Match,
  Show,
  Switch,
} from 'solid-js'

import Input from '@/components/form/input'
import Tags from '@/components/form/tags'
import Skeleton from '@/components/loading/skeleton'
import basicStore from '@/services/basic.store'
import { modalsStore, Severity } from '@/services/modals.store'
import { atom, resizeTextToFit } from '@/services/reactive'
import { getDefaultRestFields } from '@/services/rest'
import { srs } from '@/sky-shared/study'

import Tabs from '../components/tabs'
import parseHTML from '../services/parse-html'
import { useStudy } from '../services/study.context'
import {
  RESTStudyUserQuestion,
  studyQuestionEndpoint,
  studySubjectEndpoint,
  studyUserQuestionEndpoint,
  studyUserSubjectEndpoint,
} from '../services/study.rest'

import s from './subject.module.scss'

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
resizeTextToFit
const { t } = basicStore

const Subject: Component<{ id?: number }> = (properties) => {
  // === Stores ===
  const { offlineUnavailable } = useStudy()!
  const parameters = useParams<{ id: string }>()

  // === State ===
  const questionI = atom(0)
  const synonyms = atom<string[]>([])
  const note = atom('')

  // === Memos ===
  const subjectId = createMemo(() => properties.id ?? +parameters.id)
  const [subject] = createResource(subjectId, id =>
    studySubjectEndpoint.get(id),
  )
  const questionId = createMemo<number | undefined>(
    () => subject()?.data.questionIds[questionI()],
  )
  const [question] = createResource(questionId, id =>
    studyQuestionEndpoint.get(id),
  )
  const [subjectInfo] = createResource(subject, subject =>
    subject.data.userSubjectId
      ? studyUserSubjectEndpoint.get(subject.data.userSubjectId)
      : undefined,
  )
  const [questionInfo, { mutate: mutateQuestionInfo }] = createResource(
    question,
    question =>
      question.data.userQuestionId
        ? studyUserQuestionEndpoint.get(question.data.userQuestionId)
        : undefined,
  )
  const isLoading = createMemo(
    () =>
      !subject() || !question() || subjectInfo.loading || questionInfo.loading,
  )
  /** Current subject progress percent. From 0 to 1 untill unlock, from 1 to 2 utill burned */
  const progressSpinnerOptions = createMemo(() => {
    const $subjectStage = subjectInfo()?.data.stage ?? 0
    if ($subjectStage > 5)
      return {
        color: '#3d63ff',
        bgColor: '#6785fd',
        progress: ($subjectStage - 5) / (srs.length + 1 - 5),
      }
    return {
      color: '#6785fd',
      bgColor: '#192039',
      progress: $subjectStage / 5,
    }
  })

  // === Effects ===
  createEffect(() => {
    const $questionInfo = questionInfo()
    if (!$questionInfo) return
    batch(() => {
      synonyms($questionInfo.data.synonyms ?? [])
      note($questionInfo.data.note ?? '')
    })
  })

  createEffect(() => {
    const $subject = subject()
    document.title = $subject
      ? `Sky | ${$subject.data.title}`
      : `Sky | Loading...`
  })

  // === Functions ===
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

  return (
    <div class={s.subjectComponent}>
      <div class={`card ${s.question}`}>
        <div
          class={s.stage}
          style={{
            background: `linear-gradient(to right, ${progressSpinnerOptions().bgColor} 50%, ${
              progressSpinnerOptions().color
            } 50%)`,
          }}
        >
          <div
            class={s.progressBar}
            style={{
              'background-color':
                progressSpinnerOptions().progress > 0.5
                  ? progressSpinnerOptions().color
                  : progressSpinnerOptions().bgColor,
              'transform': `rotate(${
                progressSpinnerOptions().progress > 0.5
                  ? (progressSpinnerOptions().progress - 0.5) * 360
                  : (1 - progressSpinnerOptions().progress) * -360
              }deg)`,
            }}
          />
          <span>{subjectInfo()?.data.stage ?? 0}</span>
        </div>
        <div class={s.titleWrapper}>
          <Skeleton loading={isLoading()} offline={offlineUnavailable()}>
            <div
              class={s.title}
              use:resizeTextToFit={[48, question(), isLoading()]}
            >
              <Show
                when={
                  !question()!.data.question.includes(subject()!.data.title)
                  && !question()!.data.answers.includes(subject()!.data.title)
                }
              >
                <div>
                  <b>{parseHTML(subject()!.data.title)}</b>
                </div>
              </Show>
              <div>{parseHTML(question()!.data.question)}</div>
              <Switch>
                <Match when={!question()!.data.choose}>
                  <div>{question()!.data.answers.join(', ')}</div>
                </Match>
                <Match
                  when={
                    question()!.data.answers[0]!.toLowerCase() !== 'correct'
                  }
                >
                  <div>{question()!.data.answers[0]}</div>
                </Match>
              </Switch>
            </div>
          </Skeleton>
        </div>
        <div class={s.story}>
          <For each={subject()?.data.questionIds}>
            {(_, index) => (
              <button
                onClick={() => questionI(index())}
                aria-label={t('STUDY.SESSION.SELECT_QUESTION')}
                classList={{
                  [s.storyItem!]: true,
                  [s.current!]: index() === questionI(),
                }}
              />
            )}
          </For>
        </div>
      </div>
      <div class={`card ${s.description}`}>
        <Skeleton loading={isLoading()}>
          <Tabs>
            {parseHTML(question()!.data.description)}
            <div data-tab={t('STUDY.SESSION.QUESTION_DATA')}>
              {t('STUDY.SESSION.SYNONYMS')}
              :
              <br />
              <Tags
                value={synonyms}
                placeholder={t('STUDY.SESSION.SYNONYMS_DESC')!}
                onChange={sendQuestionDataToServer}
              />
              <br />
              {t('STUDY.SESSION.NOTES')}
              :
              <br />
              <Input
                value={note}
                multiline
                placeholder={t('STUDY.SESSION.NOTES_DESC')}
                onChange={sendQuestionDataToServer}
              />
            </div>
          </Tabs>
        </Skeleton>
      </div>
    </div>
  )
}

export default Subject
