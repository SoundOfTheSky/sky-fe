import { Show, createEffect } from 'solid-js';
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

import { atom, useGlobalEvent } from '@/services/reactive';
import Icon from '@/components/icon';
import Tooltip from '@/components/tooltip';
import Input from '@/components/form/input';
import Button from '@/components/form/button';

import { StatusCode, useReview } from '../session/services/review.context';

import s from './review-answer.module.scss';

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
          <Input
            placeholder='Answer'
            value={answer}
            type='text'
            disabled={isLoading() || !!previousState() || subjectStats()?.status === StatusCode.Unlearned}
            success={
              previousState() &&
              (questionStatus() === StatusCode.Correct || questionStatus() === StatusCode.CorrectAfterWrong)
            }
            error={previousState() && questionStatus() === StatusCode.Wrong}
            ref={(element) => answerInputElement(element)}
          />
        }
      >
        <Input
          japanese
          placeholder='答え'
          value={answer}
          type='text'
          disabled={isLoading() || !!previousState() || subjectStats()?.status === StatusCode.Unlearned}
          success={
            previousState() &&
            (questionStatus() === StatusCode.Correct || questionStatus() === StatusCode.CorrectAfterWrong)
          }
          error={previousState() && questionStatus() === StatusCode.Wrong}
          ref={(element) => answerInputElement(element)}
        />
      </Show>
      <div class={s.buttons}>
        <Tooltip
          content={`${
            shuffleSubjects() ? 'Disable' : 'Enable'
          } subjects shuffle.\nEffect takes place only after current batch.`}
        >
          <Button
            onClick={() => {
              shuffle(shuffleSubjects((x) => !x));
            }}
          >
            <Icon path={shuffleSubjects() ? mdiOrderBoolAscending : mdiOrderAlphabeticalAscending} size='32' inline />
          </Button>
        </Tooltip>
        <Tooltip content={`${consistentQuestions() ? 'Disable' : 'Enable'} consistent questions`}>
          <Button onClick={() => consistentQuestions((x) => !x)}>
            <Icon path={consistentQuestions() ? mdiShuffleDisabled : mdiShuffle} size='32' inline />
          </Button>
        </Tooltip>
        <Tooltip content={questionAnswered() ? 'Next question' : 'Submit answer'}>
          <Button
            onClick={submit}
            disabled={isLoading() || cooldownNext() !== undefined}
            classList={{ [s.cooldownNext]: cooldownNext() !== undefined }}
          >
            <Icon path={questionAnswered() ? mdiArrowRightBold : mdiCheckBold} size='32' inline />
          </Button>
        </Tooltip>
        <Tooltip
          content={
            ['Enable first audio autoplay', 'Enable ALL audio autoplay', 'Disable audio autoplay'][autoplayAudio()]
          }
        >
          <Button onClick={() => autoplayAudio((x) => (x + 1) % 3)}>
            <Icon path={[mdiHeadphonesOff, mdiHeadphones, mdiHeadphonesSettings][autoplayAudio()]} size='32' inline />
          </Button>
        </Tooltip>
        <Tooltip content='Undo'>
          <Button
            onClick={undo}
            disabled={!previousState() || cooldownUndo() !== undefined}
            classList={{ [s.cooldownUndo]: cooldownUndo() !== undefined }}
          >
            <Icon path={mdiUndoVariant} size='32' inline />
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}
