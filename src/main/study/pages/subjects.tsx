import { mdiTranslate } from '@mdi/js';
import { createEffect, createMemo, For, onMount, Show } from 'solid-js';

import Button from '@/components/form/button';
import Input from '@/components/form/input';
import Icon from '@/components/icon';
import basicStore, { NotificationType } from '@/services/basic.store';
import { db } from '@/services/db';
import { atom } from '@/services/reactive';
import syncStore from '@/services/sync.store';
import { StudySubject } from '@/sky-shared/study';
import { createDelayedFunction } from '@/sky-utils';

import SubjectRef from '../components/subject-ref';
import Themes from '../components/themes';
import parseHTML from '../services/parseHTML';
import { useStudy } from '../services/study.context';

import s from './subjects.module.scss';

export default function Subjects() {
  // === Hooks ===
  onMount(() => {
    document.title = 'Sky | Subjects';
    void update();
  });

  // === Stores ===
  const { turnedOnThemes, update } = useStudy()!;

  // === State ===
  const query = atom('');
  const isJapanese = atom(false);
  const results = atom<StudySubject[]>([]);
  const isLoading = atom(true);
  let searchId = 0;

  // === Memos ===
  const themeIds = createMemo(() => new Set(turnedOnThemes().map((t) => t.id)));

  // === Effects ===
  createEffect(() => {
    if (!syncStore.cached())
      basicStore.notify({
        title: 'Wait for caching to finish before searching.',
        type: NotificationType.Warning,
        timeout: 10000,
      });
    else void search(themeIds(), query());
  });

  // === Functions ===
  const search = createDelayedFunction(async (themeIds: Set<number>, query?: string) => {
    results([]);
    isLoading(true);
    const sId = ++searchId;
    const tx = db.transaction(['studySubjects', 'studyQuestions'], 'readonly');
    const subjectsStore = tx.objectStore('studySubjects');
    const questionsStore = tx.objectStore('studyQuestions');
    subjects: for await (const { value } of subjectsStore) {
      if (sId !== searchId || results().length === 1000) break;
      if (!themeIds.has(value.themeId)) continue;
      if (!query || value.title.includes(query)) {
        results((x) => [...x, value]);
        continue;
      }
      for (const id of value.questionIds) {
        const question = await questionsStore.get(id);
        if (
          question &&
          (question.answers.includes(query) ||
            question.question.includes(query) ||
            question.description.includes(query))
        ) {
          results((x) => [...x, value]);
          continue subjects;
        }
      }
    }
    isLoading(false);
  }, 1000);

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
        <For each={results()}>{(subject) => <SubjectRef id={subject.id}>{parseHTML(subject.title)}</SubjectRef>}</For>
      </div>
    </div>
  );
}
