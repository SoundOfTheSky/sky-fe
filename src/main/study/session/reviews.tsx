import { Show } from 'solid-js';

import Loading from '@/components/loading/loading';

import ReviewAnswer from '../components/review-answer.component';
import ReviewDescription from '../components/review-description.component';
import ReviewQuestion from '../components/review-question.component';
import ReviewStats from '../components/review-stats.component';
import { useStudy } from '../services/study.context';

import { SubjectStatus, useReview } from './review.context';

import s from './reviews.module.scss';

export default function Reviews() {
  // === Hooks ===
  const { done, previousState, subjectStats } = useReview()!;
  const { ready } = useStudy()!;

  return (
    <Loading when={ready()}>
      <div class={s.reviewsComponent}>
        <Show when={!done()} fallback={<ReviewStats />}>
          <ReviewQuestion />
          <ReviewAnswer />

          <Show when={previousState() || subjectStats()?.status === SubjectStatus.Unlearned}>
            <ReviewDescription />
          </Show>
        </Show>
      </div>
    </Loading>
  );
}
