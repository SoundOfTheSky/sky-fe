import { createMemo, Index, Show } from 'solid-js'

import Skeleton from '@/components/loading/skeleton'
import Tooltip from '@/components/tooltip'
import { resizeTextToFit } from '@/services/reactive'
import { srs } from '@/sky-shared/study'

import parseHTML from '../services/parse-html'
import { useStudy } from '../services/study.context'
import { SubjectStatus, useSession } from '../session/session.context'

import s from './session-question.module.scss'

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
resizeTextToFit

export default function SessionQuestion() {
  const {
    isLoading,
    stats,
    subjectIds,
    timePassed,
    eta,
    question,
    hint,
    previousState,
    subjectStats,
    subject,
    subjectInfo,
    autoplayAudio,
    currentSubjectQuestionsStatuses,
  } = useSession()!
  const { offlineUnavailable } = useStudy()!

  /** Current subject progress percent. From 0 to 1 untill unlock, from 1 to 2 utill burned */
  const progressSpinnerOptions = createMemo(() => {
    let $subjectStage = subjectInfo()?.data.stage ?? 0
    const $subjectStats = subjectStats()
    if (previousState()?.subject === SubjectStatus.Unanswered) {
      if (
        $subjectStats?.status === SubjectStatus.Wrong
        || $subjectStats?.status === SubjectStatus.CorrectAfterWrong
      )
        $subjectStage
          = $subjectStage === 0 ? 0 : Math.max(1, $subjectStage - 2)
      else if ($subjectStats?.status === SubjectStatus.Correct) $subjectStage++
    }
    if ($subjectStage > 5)
      return {
        color: '#3d63ff',
        bgColor: '#6785fd',
        progress: ($subjectStage - 5) / (srs.length + 1 - 5),
        stage: $subjectStage,
      }
    return {
      color: '#6785fd',
      bgColor: '#192039',
      progress: $subjectStage / 5,
      stage: $subjectStage,
    }
  })

  return (
    <div class={`card ${s.question}`}>
      <div class={s.progress}>
        <div
          class={s.line}
          style={{
            transform: `scaleX(${stats().progress})`,
          }}
        />
      </div>
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
        <span>{progressSpinnerOptions().stage}</span>
      </div>
      <div class={s.stats}>
        <Tooltip content="Пройдено/Всего вопросов">
          <div>
            {stats().passed}
            /
            {subjectIds().length}
          </div>
        </Tooltip>
        {' '}
        <Tooltip content="Процент правильных ответов">
          <div>
            {~~(stats().correctPercent * 100)}
            %
          </div>
        </Tooltip>
        <Tooltip content="Времени прошло">
          <div>{timePassed()}</div>
        </Tooltip>
        <Tooltip content="Приблизительно осталось">
          <div>
            {eta()}
            мин.
          </div>
        </Tooltip>
      </div>
      <div
        class={s.titleWrapper}
        use:resizeTextToFit={[48, question(), hint(), isLoading()]}
      >
        <Skeleton loading={isLoading()} offline={offlineUnavailable()}>
          <div class={s.title}>
            <Show
              when={
                (previousState()
                  ?? subjectStats()?.status === SubjectStatus.Unlearned)
                && !question()!.data.question.includes(subject()!.data.title)
                && !hint().includes(subject()!.data.title)
              }
            >
              <b>{parseHTML(subject()!.data.title, autoplayAudio())}</b>
              <br />
            </Show>
            <div>{parseHTML(question()!.data.question, autoplayAudio())}</div>
            {hint()}
          </div>
        </Skeleton>
      </div>
      <div class={s.story}>
        <Index each={currentSubjectQuestionsStatuses()}>
          {(element, index) => (
            <div
              classList={{
                [s.storyItem!]: true,
                [s.current!]:
                  subject()?.data.questionIds[index] === question()?.id,
                [s.correct!]: element() === SubjectStatus.Correct,
                [s.error!]: element() === SubjectStatus.Wrong,
                [s.correctAfterWrong!]:
                  element() === SubjectStatus.CorrectAfterWrong,
                [s.unlearned!]: element() === SubjectStatus.Unlearned,
              }}
            />
          )}
        </Index>
      </div>
    </div>
  )
}
