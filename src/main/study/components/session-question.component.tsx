import { Show, createMemo, Index } from 'solid-js';

import Skeleton from '@/components/loading/skeleton';
import Tooltip from '@/components/tooltip';
import { resizeTextToFit } from '@/services/reactive';
import { srs } from '@/sky-shared/study';

import parseHTML from '../services/parseHTML';
import { useStudy } from '../services/study.context';
import { SubjectStatus, useSession } from '../session/session.context';

import s from './session-question.module.scss';

resizeTextToFit;

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
  } = useSession()!;
  const { offlineUnavailable } = useStudy()!;

  /** Current subject stage. Automatically changes based on status. */
  const subjectStage = createMemo(() => {
    const $subjectInfo = subjectInfo();
    const $subjectStats = subjectStats();
    if (!$subjectStats || !$subjectInfo) return 0;
    let delta = 0;
    switch ($subjectStats.status) {
      case SubjectStatus.Correct: {
        delta = 1;
        break;
      }
      case SubjectStatus.Wrong:
      case SubjectStatus.CorrectAfterWrong: {
        delta = -2;
      }
    }
    return $subjectInfo.data.stage === 0 && delta < 0
      ? 0
      : Math.max(1, Math.min(srs.length + 1, $subjectInfo.data.stage! + delta));
  });
  /** Current subject progress percent. From 0 to 1 untill unlock, from 1 to 2 utill burned */
  const progressSpinnerOptions = createMemo(() => {
    const $subject = subject();
    const $subjectStage = subjectStage();
    if (!$subject)
      return {
        color: '#6785fd',
        bgColor: '#192039',
        progress: 0,
      };
    if ($subjectStage > 5)
      return {
        color: '#3d63ff',
        bgColor: '#6785fd',
        progress: ($subjectStage - 5) / (srs.length + 1 - 5),
      };
    return {
      color: '#6785fd',
      bgColor: '#192039',
      progress: $subjectStage / 5,
    };
  });

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
            transform: `rotate(${
              progressSpinnerOptions().progress > 0.5
                ? (progressSpinnerOptions().progress - 0.5) * 360
                : (1 - progressSpinnerOptions().progress) * -360
            }deg)`,
          }}
        />
        <span>{subjectStage()}</span>
      </div>
      <div class={s.stats}>
        <Tooltip content='Passed/Total subjects'>
          <div>
            {stats().passed}/{subjectIds().length}
          </div>
        </Tooltip>{' '}
        <Tooltip content='Correct %'>
          <div>{~~(stats().correctPercent * 100)}%</div>
        </Tooltip>
        <Tooltip content='Time passed'>
          <div>{timePassed()}</div>
        </Tooltip>
        <Tooltip content='ETA'>
          <div>{eta()}m</div>
        </Tooltip>
      </div>
      <div class={s.titleWrapper} use:resizeTextToFit={[48, question(), hint(), isLoading()]}>
        <Skeleton loading={isLoading()} offline={offlineUnavailable()}>
          <div class={s.title}>
            <Show
              when={
                (previousState() || subjectStats()?.status === SubjectStatus.Unlearned) &&
                !question()!.data.question.includes(subject()!.data.title) &&
                !hint().includes(subject()!.data.title)
              }
            >
              <b>{parseHTML(subject()!.data.title, autoplayAudio())}</b>
              <br />
            </Show>
            <div>{parseHTML(question()!.data.question, autoplayAudio())}</div>
            <Show when={hint().toLowerCase() !== 'correct'}>{hint()}</Show>
          </div>
        </Skeleton>
      </div>
      <div class={s.story}>
        <Index each={currentSubjectQuestionsStatuses()}>
          {(element, index) => (
            <div
              classList={{
                [s.storyItem]: true,
                [s.current]: subject()?.data.questionIds[index] === question()?.id,
                [s.correct]: element() === SubjectStatus.Correct,
                [s.error]: element() === SubjectStatus.Wrong,
                [s.correctAfterWrong]: element() === SubjectStatus.CorrectAfterWrong,
                [s.unlearned]: element() === SubjectStatus.Unlearned,
              }}
            />
          )}
        </Index>
      </div>
    </div>
  );
}
