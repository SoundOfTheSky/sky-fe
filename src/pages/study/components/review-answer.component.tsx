import { Show, createEffect } from 'solid-js';

import { atom, japaneseInput, model, useGlobalEvent } from '@/services/reactive';
import Icon from '@/components/icon';
import {
  mdiArrowRightBold,
  mdiCheckBold,
  mdiHeadphones,
  mdiHeadphonesOff,
  mdiHeadphonesSettings,
  mdiOrderAlphabeticalAscending,
  mdiOrderBoolAscending,
  mdiShuffle,
  mdiShuffleDisabled,
  mdiUndoVariant,
} from '@mdi/js';
import { StatusCode, useReview } from '../session/review.context';

import s from './review-answer.module.scss';

model;
japaneseInput;

export default function ReviewAnswer() {
  const {
    cooldownNext,
    submit,
    hint,
    isJapanese,
    isLoading,
    previousState,
    subjectStats,
    questionStatus,
    answer,
    shuffle,
    shuffleSubjects,
    consistentQuestions,
    questionAnswered,
    autoplayAudio,
    cooldownUndo,
    undo,
  } = useReview()!;

  // === Functions ===
  function onKeyPress(event: KeyboardEvent) {
    if (
      event.code === 'Enter' &&
      cooldownNext() === undefined &&
      (document.activeElement === null ||
        document.activeElement === document.body ||
        document.activeElement === answerInputElement())
    )
      submit();
  }

  // === Refs ===
  const answerInputElement = atom<HTMLInputElement>();

  // === Effects ===
  createEffect(() => {
    if (!hint()) setTimeout(() => answerInputElement()?.focus(), 100);
  });

  // === Hooks ===
  useGlobalEvent('keypress', onKeyPress);

  return (
    <div class={`card ${s.answer}`}>
      <Show
        when={isJapanese()}
        fallback={
          <input
            placeholder='Answer'
            use:model={answer}
            type='text'
            disabled={isLoading() || !!previousState() || subjectStats()?.status === StatusCode.Unlearned}
            classList={{
              correct:
                previousState() &&
                (questionStatus() === StatusCode.Correct || questionStatus() === StatusCode.CorrectAfterWrong),
              error: previousState() && questionStatus() === StatusCode.Wrong,
            }}
            ref={(element) => answerInputElement(element)}
          />
        }
      >
        <input
          use:japaneseInput
          placeholder='答え'
          use:model={answer}
          type='text'
          disabled={isLoading() || !!previousState() || subjectStats()?.status === StatusCode.Unlearned}
          classList={{
            correct:
              previousState() &&
              (questionStatus() === StatusCode.Correct || questionStatus() === StatusCode.CorrectAfterWrong),
            error: previousState() && questionStatus() === StatusCode.Wrong,
          }}
          ref={(element) => answerInputElement(element)}
        />
      </Show>
      <div class={s.buttons}>
        <button
          onClick={() => {
            shuffle(shuffleSubjects((x) => !x));
          }}
          title={`${
            shuffleSubjects() ? 'Disable' : 'Enable'
          } subjects shuffle.\nEffect takes place only after current batch.`}
        >
          <Icon path={shuffleSubjects() ? mdiOrderBoolAscending : mdiOrderAlphabeticalAscending} size='32' inline />
        </button>
        <button
          onClick={() => consistentQuestions((x) => !x)}
          title={`${consistentQuestions() ? 'Disable' : 'Enable'} consistent questions`}
        >
          <Icon path={consistentQuestions() ? mdiShuffleDisabled : mdiShuffle} size='32' inline />
        </button>
        <button
          onClick={submit}
          title={questionAnswered() ? 'Next question' : 'Submit answer'}
          disabled={isLoading() || cooldownNext() !== undefined}
          classList={{ [s.cooldownNext]: cooldownNext() !== undefined }}
        >
          <Icon path={questionAnswered() ? mdiArrowRightBold : mdiCheckBold} size='32' inline />
        </button>
        <button
          title={
            ['Enable first audio autoplay', 'Enable ALL audio autoplay', 'Disable audio autoplay'][autoplayAudio()]
          }
          onClick={() => autoplayAudio((x) => (x + 1) % 3)}
        >
          <Icon path={[mdiHeadphonesOff, mdiHeadphones, mdiHeadphonesSettings][autoplayAudio()]} size='32' inline />
        </button>
        <button
          onClick={undo}
          title='Undo'
          disabled={!previousState() || cooldownUndo() !== undefined}
          classList={{ [s.cooldownUndo]: cooldownUndo() !== undefined }}
        >
          <Icon path={mdiUndoVariant} size='32' inline />
        </button>
      </div>
    </div>
  );
}
