import { Show } from 'solid-js';

import SessionAnswer from '../components/session-answer.component';
import SessionDescription from '../components/session-description.component';
import SessionQuestion from '../components/session-question.component';
import SessionStats from '../components/session-stats.component';
import { useStudy } from '../services/study.context';

import { SubjectStatus, useSession } from './session.context';

import s from './session.module.scss';
import Skeleton from '@/components/loading/skeleton';

export default function Session() {
  // === Hooks ===
  const { done, previousState, subjectStats } = useSession()!;
  const { ready } = useStudy()!;

  return (
    <Skeleton loading={!ready()}>
      <div class={s.sessionComponent}>
        <Show when={!done()} fallback={<SessionStats />}>
          <SessionQuestion />
          <SessionAnswer />

          <Show
            when={
              previousState() ??
              subjectStats()?.status === SubjectStatus.Unlearned
            }
          >
            <SessionDescription />
          </Show>
        </Show>
      </div>
    </Skeleton>
  );
}
