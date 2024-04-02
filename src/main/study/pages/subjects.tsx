import { mdiChevronLeft, mdiChevronRight, mdiTranslate } from '@mdi/js';
import { createScheduled, debounce } from '@solid-primitives/scheduled';
import { createEffect, createMemo, createResource, For, Show } from 'solid-js';

import Button from '@/components/form/button';
import Input from '@/components/form/input';
import Icon from '@/components/icon';
import { atom } from '@/services/reactive';

import SubjectRef from '../components/subject-ref';
import Themes from '../components/themes';
import parseHTML from '../services/parseHTML';
import { SearchSubject, useStudy } from '../services/study.context';

import s from './subjects.module.scss';

export default function Subjects() {
  document.title = 'Sky | Subjects';
  // === Stores ===
  const { turnedOnThemes, searchSubjects } = useStudy()!;

  // === State ===
  const query = atom('');
  const isJapanese = atom(false);
  const page = atom(1);
  // === Memos ===
  const themeIds = createMemo(() => turnedOnThemes().map((t) => t.id));
  const queryScheduler = createScheduled((fn) => debounce(fn, 400));
  const scheduledQuery = createMemo<string>((last) => (!queryScheduler() ? last : query()), '');
  const [results] = createResource<SearchSubject[], [string, number[], number]>(
    () => [scheduledQuery(), themeIds(), page()] as const,
    ([query, themeIds, page], info) => (themeIds.length ? searchSubjects(themeIds, query, page) : info.value ?? []),
  );
  // === Effects ===
  createEffect(() => {
    scheduledQuery();
    themeIds();
    page(1);
  });
  return (
    <div class={s.subjectsComponent}>
      <Themes />
      <div class={`card ${s.search}`}>
        <Show when={isJapanese()} fallback={<Input value={query} placeholder='Search...' />}>
          <Input japanese value={query} placeholder='検索' />
        </Show>
        <Button
          onClick={() => {
            query('');
            isJapanese((x) => !x);
          }}
        >
          <Icon path={mdiTranslate} size='32' />
        </Button>
      </div>
      <div class={`card ${s.results}`}>
        <table>
          <thead>
            <tr>
              <th>Subject</th>
              <th>Answers</th>
              <th>Stage</th>
              <th>Synonyms</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <For each={results()}>
              {(subject) => (
                <tr>
                  <td>
                    <SubjectRef id={subject.id}>{parseHTML(subject.title)}</SubjectRef>
                  </td>
                  <td>{subject.answers.replaceAll(',', ', ').replaceAll('|', ', ')}</td>
                  <td>{subject.stage}</td>
                  <td>{subject.synonyms}</td>
                  <td>{subject.note}</td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
        <div class={s.pager}>
          <Button disabled={results.loading || !results() || page() === 1} onClick={() => page((x) => x - 1)}>
            <Icon path={mdiChevronLeft} size='32' />
          </Button>
          {page()}
          <Button
            disabled={results.loading || !results() || results()!.length < 100}
            onClick={() => page((x) => x + 1)}
          >
            <Icon path={mdiChevronRight} size='32' />
          </Button>
        </div>
      </div>
    </div>
  );
}
