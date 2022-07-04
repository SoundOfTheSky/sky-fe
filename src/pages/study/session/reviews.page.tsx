import { Show } from 'solid-js';
import Loading from '@/components/loading/loading';

import { StatusCode, useReview } from './review.context';
import ReviewStats from '../components/review-stats.component';
import ReviewQuestion from '../components/review-question.component';
import ReviewAnswer from '../components/review-answer.component';
import ReviewDescription from '../components/review-description.component';

import s from './reviews.module.scss';

export default function Reviews() {
  // === Hooks ===
  const { isThemesLoading, done, previousState, subjectStats } = useReview()!;

  return (
    <Loading when={!isThemesLoading()}>
      <div class={s.reviewsComponent}>
        <Show when={!done()} fallback={<ReviewStats />}>
          <ReviewQuestion />
          <ReviewAnswer />

          <Show when={previousState() || subjectStats()?.status === StatusCode.Unlearned}>
            <ReviewDescription />
          </Show>
        </Show>
      </div>
    </Loading>
  );
}
