import { Show, createMemo, Index } from 'solid-js';

import Skeleton from '@/components/loading/skeleton';
import { resizeTextToFit } from '@/services/reactive';

import parseHTML from '../services/parseHTML';
import { useStudy } from '../services/study.context';
import { SubjectStatus, useReview } from '../session/review.context';

import s from './review-question.module.scss';

resizeTextToFit;

export default function ReviewQuestion() {
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
    autoplayAudio,
    currentSubjectQuestionsStatuses,
  } = useReview()!;
  const { offlineUnavailable, srsMap } = useStudy()!;

  /** Current subject stage. Automatically changes based on status. */
  const subjectStage = createMemo(() => {
    const $subject = subject();
    const $subjectStats = subjectStats();
    if (!$subject || !$subjectStats) return 0;
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
    return $subject.stage === 0 && delta < 0
      ? 0
      : Math.max(1, Math.min(srsMap[$subject.srsId - 1].timings.length + 1, $subject.stage! + delta));
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
    const $srs = srsMap[$subject.srsId - 1];
    if ($subjectStage > $srs.ok)
      return {
        color: '#3d63ff',
        bgColor: '#6785fd',
        progress: ($subjectStage - $srs.ok) / ($srs.timings.length + 1 - $srs.ok),
      };
    return {
      color: '#6785fd',
      bgColor: '#192039',
      progress: $subjectStage / $srs.ok,
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
        {stats().passed}/{subjectIds().length} {Math.floor(stats().correctPercent * 100)}% {timePassed()} {eta()}m
      </div>
      <div class={s.titleWrapper}>
        <Skeleton loading={isLoading()} offline={offlineUnavailable()}>
          <div class={s.title} use:resizeTextToFit={[48, question(), hint(), isLoading()]}>
            <Show
              when={
                (previousState() || subjectStats()?.status === SubjectStatus.Unlearned) &&
                !question()!.question.includes(subject()!.title) &&
                !hint().includes(subject()!.title)
              }
            >
              <b>{parseHTML(subject()!.title, autoplayAudio())}</b>
              <br />
            </Show>
            <div>{parseHTML(question()!.question, autoplayAudio())}</div>
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
                [s.current]: subject()?.questionIds[index] === question()?.id,
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
