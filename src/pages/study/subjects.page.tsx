import { A } from '@solidjs/router';
import { mdiTranslate } from '@mdi/js';
import { createEffect, createMemo, For, Show } from 'solid-js';

import { atom, japaneseInput, model, useTimeout } from '@/services/reactive';
import Icon from '@/components/icon';
import Loading from '@/components/loading/loading';
import { SearchSubject, useStudy } from './services/study.context';
import parseHTML from './services/parseHTML';

import s from './subjects.module.scss';

model;
japaneseInput;

export default function Subjects() {
  document.title = 'Sky | Subjects';
  // === Stores ===
  const { turnedOnThemes, searchSubjects, getAllSubjects } = useStudy()!;

  // === State ===
  const query = atom('');
  const isJapanese = atom(false);
  const results = atom<SearchSubject[]>();
  let timeout: number;
  // === Memos ===
  const themeIds = createMemo(() => turnedOnThemes().map((t) => t.id));
  // === Effects ===
  createEffect(() => {
    const $themeIds = themeIds();
    const $search = query();
    clearTimeout(timeout);
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    timeout = useTimeout(1000, async () => {
      results(undefined);
      if ($themeIds.length === 0) return;
      if ($search) results(await searchSubjects(themeIds(), query()));
      else results(await getAllSubjects(themeIds()));
    });
  });
  return (
    <div class={`${s.subjectsComponent} card-container`}>
      <div class={`card ${s.search}`}>
        <Show when={isJapanese()} fallback={<input type='text' use:model={query} placeholder='Search...' />}>
          <input use:japaneseInput type='text' use:model={query} placeholder='検索' />
        </Show>
        <button
          onClick={() => {
            query('');
            isJapanese((x) => !x);
          }}
        >
          <Icon path={mdiTranslate} size='32' />
        </button>
      </div>
      <Loading when={results()}>
        <Show when={results()?.length} fallback={<div class={s.error}>Nothing found</div>}>
          <For each={results()}>
            {(subject) => (
              <A href={`./${subject.id}`} class={`card ${s.result}`}>
                <div class={s.title}>{parseHTML(subject.title, 0)}</div>
                <div>{subject.answers.join(', ')}</div>
              </A>
            )}
          </For>
        </Show>
      </Loading>
    </div>
  );
}
