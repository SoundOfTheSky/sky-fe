import { Show } from 'solid-js';

import Loading from '@/components/loading/loading';

import SessionAnswer from '../components/session-answer.component';
import SessionDescription from '../components/session-description.component';
import SessionQuestion from '../components/session-question.component';
import SessionStats from '../components/session-stats.component';
import { useStudy } from '../services/study.context';

import { SubjectStatus, useSession } from './session.context';

import s from './session.module.scss';

export default function Session() {
  // === Hooks ===
  const { done, previousState, subjectStats } = useSession()!;
  const { ready } = useStudy()!;

  return (
    <Loading when={ready()}>
      <div class={s.reviewsComponent}>
        <Show when={!done()} fallback={<SessionStats />}>
          <SessionQuestion />
          <SessionAnswer />

          <Show when={previousState() || subjectStats()?.status === SubjectStatus.Unlearned}>
            <SessionDescription />
          </Show>
        </Show>
      </div>
    </Loading>
  );
}
