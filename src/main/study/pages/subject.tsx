import { useParams } from '@solidjs/router';
import { batch, createEffect, createResource, For, Show } from 'solid-js';

import basicStore from '@/services/basic.store';
import { atom } from '@/services/reactive';
import Input from '@/components/form/input';
import Button from '@/components/form/button';

import parseHTML from '../services/parseHTML';
import { useStudy } from '../services/study.context';
import Tabs from '../components/tabs';

import s from './reviews-subject.module.scss';

export default function Subjects() {
  // === Stores ===
  const { getQuestion, updateQuestion, getSubject } = useStudy()!;
  const { getWord } = basicStore;
  const params = useParams<{ id: string }>();

  // === State ===
  const questionI = atom(0);
  const synonyms = atom('');
  const note = atom('');

  // === Memos ===
  const [subject] = createResource(
    () => +params.id,
    (id) => getSubject(id),
  );
  const [question] = createResource(
    () => subject()?.questionIds[questionI()],
    (id) => getQuestion(id),
  );
  const [questionDescription] = createResource(
    () => question()?.descriptionWordId,
    (id) => getWord(id),
  );

  createEffect(() => {
    const $question = question();
    if (!$question) return;
    batch(() => {
      synonyms($question.synonyms?.join(', ') ?? '');
      note($question.note ?? '');
    });
  });

  createEffect(() => {
    const $subject = subject();
    document.title = $subject ? `Sky | ${$subject.title}` : `Sky | Loading...`;
  });

  // === Functions ===
  async function saveQuestionData() {
    await updateQuestion(question()!.id, {
      note: note(),
      synonyms: synonyms().split(', ').filter(Boolean),
    });
  }

  return (
    <div class={s.subjectComponent}>
      <div class={`card ${s.question}`}>
        <Show when={question() && subject()}>
          <div class={s.title}>
            <div>{parseHTML(question()!.question, 0)}</div>
            <div class={s.hint}>{question()!.answers.join(', ')}</div>
          </div>
          <div class={s.story}>
            <For each={subject()!.questionIds}>
              {(_, index) => (
                <Button
                  classList={{
                    [s.current]: index() === questionI(),
                  }}
                  onClick={() => questionI(index())}
                />
              )}
            </For>
          </div>
        </Show>
      </div>
      <div class={`card ${s.description}`}>
        <Show when={questionDescription()} fallback={<div>Loading...</div>}>
          <Tabs>
            {parseHTML(questionDescription()!, 0)}
            <div data-tab='Notes & Synonyms'>
              Synonyms:
              <br />
              <Input
                type='text'
                onChange={() => void saveQuestionData()}
                value={synonyms}
                placeholder='Example: Alternate answer, second answer, example'
              />
              <br />
              Note:
              <br />
              <Input onChange={() => void saveQuestionData()} value={note} placeholder='Write anything' multiline />
              <br />
            </div>
          </Tabs>
        </Show>
      </div>
    </div>
  );
}
