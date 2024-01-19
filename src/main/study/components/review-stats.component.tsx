import { For, Show } from 'solid-js';
import { mdiCheckBold, mdiClose, mdiCloseThick, mdiUndoVariant } from '@mdi/js';

import { A } from '@solidjs/router';
import { formatTime } from '@/services/utils';
import Icon from '@/components/icon';
import Button from '@/components/form/button';

import parseHTML from '../services/parseHTML';
import { StatusCode, useReview } from '../session/services/review.context';

import s from './review-stats.module.scss';
import SubjectRef from './subject-ref';

export default function ReviewStats() {
  // === Hooks ===
  const { timePassed, subjectIds, startTime, stats, subjectsStats } = useReview()!;

  return (
    <div class={`card ${s.reviewStats}`}>
      <div class='card-title'>
        Review stats
        <Button class={s.finish}>
          <A href='../..'>
            <Icon path={mdiClose} size='32' />
          </A>
        </Button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Subjects</th>
            <th>Speed</th>
            <th>Correct</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{timePassed()}</td>
            <td>{subjectIds().length}</td>
            <td>{Math.floor((3_600_000 / (Date.now() - startTime)) * subjectIds().length * 100) / 100} S/H</td>
            <td>{Math.floor(stats().correctPercent * 100)}%</td>
          </tr>
        </tbody>
      </table>
      <table>
        <thead>
          <tr>
            <th>Subject</th>
            <th>Time</th>
            <th>Undo</th>
            <th>Correct</th>
          </tr>
        </thead>
        <tbody>
          <For each={[...subjectsStats.entries()]}>
            {([id, stats]) => (
              <tr>
                <td>
                  <SubjectRef id={id}>{parseHTML(stats.title)}</SubjectRef>
                </td>
                <td>{formatTime(stats.time * 1000)}</td>
                <td>
                  <Show when={stats.undo}>
                    <Icon inline path={mdiUndoVariant} size='24' />
                  </Show>
                </td>
                <td>
                  <Icon inline path={stats.status === StatusCode.Correct ? mdiCheckBold : mdiCloseThick} size='24' />
                </td>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
}
