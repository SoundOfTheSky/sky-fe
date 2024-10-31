import { mdiCheckBold, mdiClose, mdiCloseThick, mdiUndoVariant } from '@mdi/js';
import { A } from '@solidjs/router';
import { createMemo, For, Show } from 'solid-js';

import Button from '@/components/form/button';
import Icon from '@/components/icon';
import { formatTime } from '@/sky-utils';

import parseHTML from '../services/parseHTML';
import { SubjectStatus, useSession } from '../session/session.context';

import SubjectRef from './subject-ref';

import s from './session-stats.module.scss';

export default function SessionStats() {
  // === Hooks ===
  const { timePassed, subjectIds, startTime, stats, subjectsStats } =
    useSession()!;

  const statsArray = createMemo(
    () =>
      [...subjectsStats.entries()] as [
        number,
        {
          title: string;
          status: SubjectStatus;
          time: number;
          answers: string[];
          undo: boolean;
        },
      ][],
  );
  return (
    <div class={`card ${s.stats}`}>
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
            <td>
              {~~(
                (3_600_000 / (Date.now() - startTime)) *
                subjectIds().length *
                100
              ) / 100}{' '}
              S/H
            </td>
            <td>{~~(stats().correctPercent * 100)}%</td>
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
          <For each={statsArray()}>
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
                  <Icon
                    inline
                    path={
                      stats.status === SubjectStatus.Correct
                        ? mdiCheckBold
                        : mdiCloseThick
                    }
                    size='24'
                  />
                </td>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
}
