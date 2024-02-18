import { useParams } from '@solidjs/router';
import { batch, Component, createEffect, createMemo, createResource, For, Show } from 'solid-js';

import basicStore from '@/services/basic.store';
import { atom, resizeTextToFit } from '@/services/reactive';
import Skeleton from '@/components/loading/skeleton';
import Loading from '@/components/loading/loading';
import Tags from '@/components/form/tags';
import Input from '@/components/form/input';

import parseHTML from '../services/parseHTML';
import { useStudy } from '../services/study.context';
import Tabs from '../components/tabs';

import s from './subject.module.scss';

resizeTextToFit;

const Subject: Component<{ id?: number }> = (properties) => {
  // === Stores ===
  const { getQuestion, updateQuestion, getSubject, getSRS } = useStudy()!;
  const { getWord } = basicStore;
  const params = useParams<{ id: string }>();

  // === State ===
  const questionI = atom(0);
  const synonyms = atom<string[]>([]);
  const note = atom('');

  // === Memos ===
  const subjectId = createMemo(() => properties.id ?? +params.id);
  const [subject] = createResource(subjectId, (id) => getSubject(id));
  const [question] = createResource(
    () => subject()?.questionIds[questionI()],
    (id) => getQuestion(id),
  );
  const [questionDescription] = createResource(
    () => question()?.descriptionWordId,
    (id) => getWord(id),
  );
  const [srs] = createResource(
    () => subject()?.srsId,
    (id) => getSRS(id),
  );
  const isLoading = createMemo(() => !subject() || !question() || !srs() || !questionDescription());
  /** Current subject progress percent. From 0 to 1 untill unlock, from 1 to 2 utill burned */
  const progressSpinnerOptions = createMemo(() => {
    const $srs = srs();
    const $subjectStage = subject()?.stage ?? 0;
    if (!$srs)
      return {
        color: '#6785fd',
        bgColor: '#192039',
        progress: 0,
      };
    if ($subjectStage > $srs.ok)
      return {
        color: '#3d63ff',
        bgColor: '#6785fd',
        progress: ($subjectStage - $srs.ok) / ($srs.timings.length + 1 - $srs.ok),
      };
    return {
      color: '#6785fd',
      bgColor: '#192039',
      progress: $subjectStage / $srs.ok,
    };
  });

  // === Effects ===
  createEffect(() => {
    const $question = question();
    if (!$question) return;
    batch(() => {
      synonyms($question.synonyms ?? []);
      note($question.note ?? '');
    });
  });

  createEffect(() => {
    const $subject = subject();
    document.title = $subject ? `Sky | ${$subject.title}` : `Sky | Loading...`;
  });

  // === Functions ===
  async function sendQuestionDataToServer() {
    await updateQuestion(question()!.id, {
      note: note().trim(),
      synonyms: synonyms()
        .filter(Boolean)
        .map((x) => x.trim()),
    });
  }

  return (
    <div class={s.subjectComponent}>
      <div class={`card ${s.question}`}>
        <div
          class={s.stage}
          style={{
            background: `linear-gradient(to right, ${progressSpinnerOptions().bgColor} 50%, ${
              progressSpinnerOptions().color
            } 50%)`,
          }}
        >
          <div
            class={s.progressBar}
            style={{
              'background-color':
                progressSpinnerOptions().progress > 0.5
                  ? progressSpinnerOptions().color
                  : progressSpinnerOptions().bgColor,
              transform: `rotate(${
                progressSpinnerOptions().progress > 0.5
                  ? (progressSpinnerOptions().progress - 0.5) * 360
                  : (1 - progressSpinnerOptions().progress) * -360
              }deg)`,
            }}
          />
          <span>{subject()?.stage ?? 0}</span>
        </div>
        <Skeleton class={s.titleSkeleton} loading={isLoading()}>
          <div class={s.title} use:resizeTextToFit={[48, question(), isLoading()]}>
            <Show
              when={!question()!.question.includes(subject()!.title) && !question()!.answers.includes(subject()!.title)}
            >
              <div>
                <b>{subject()!.title}</b>
              </div>
            </Show>
            <div>{parseHTML(question()!.question)}</div>
            <Show when={!question()!.choose}>
              <div>{question()!.answers.join(', ')}</div>
            </Show>
          </div>
        </Skeleton>
        <div class={s.story}>
          <For each={subject()?.questionIds}>
            {(_, index) => (
              <button
                onClick={() => questionI(index())}
                classList={{
                  [s.current]: index() === questionI(),
                }}
              />
            )}
          </For>
        </div>
      </div>
      <div class={`card ${s.description}`}>
        <Loading when={questionDescription()}>
          <Tabs>
            {parseHTML(questionDescription()!)}
            <Show when={subject()!.stage !== null}>
              <div data-tab='Notes & Synonyms'>
                Synonyms:
                <br />
                <Tags
                  value={synonyms}
                  placeholder='Your synonyms will count as correct answers'
                  onChange={sendQuestionDataToServer}
                />
                <br />
                Note:
                <br />
                <Input
                  value={note}
                  multiline
                  placeholder='Add your note to this question'
                  onChange={sendQuestionDataToServer}
                />
              </div>
            </Show>
          </Tabs>
        </Loading>
      </div>
    </div>
  );
};

export default Subject;
