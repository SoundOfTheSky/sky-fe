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
} from '@mdi/js'
import { shuffleArray } from '@softsky/utils'
import { For, Match, Switch, createEffect, createMemo } from 'solid-js'

import Input from '@/components/form/input'
import Icon from '@/components/icon'
import Tooltip from '@/components/tooltip'
import basicStore from '@/services/basic.store'
import { atom, useGlobalEvent } from '@/services/reactive'

import { SubjectStatus, useSession } from '../session/session.context'

import s from './session-answer.module.scss'

const { t } = basicStore

export default function SessionAnswer() {
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
    question,
    questionInfo,
  } = useSession()!
  // === Memos ===
  const inputDisabled = createMemo(
    () =>
      isLoading()
      || !!previousState()
      || subjectStats()?.status === SubjectStatus.Unlearned,
  )
  const answerButtons = createMemo(() => {
    if (isLoading()) return
    const $question = question()!
    const $questionInfo = questionInfo()
    if (!$question.data.choose) return
    const answers = [
      ...$question.data.answers,
      ...($questionInfo?.data.synonyms ?? []),
    ]
    if (answers[0] !== 'Correct') return shuffleArray(answers)
    return answers
  })
  // === Functions ===
  function onKeyPress(event: KeyboardEvent) {
    if (
      event.code === 'Enter'
      && cooldownNext() === undefined
      && (document.activeElement === null
        || document.activeElement === document.body
        || document.activeElement === answerInputElement())
    )
      submit()
  }

  // === Refs ===
  const answerInputElement = atom<HTMLInputElement>()

  // === Effects ===
  createEffect(() => {
    if (!hint()) setTimeout(() => answerInputElement()?.focus(), 100)
  })

  // === Hooks ===
  useGlobalEvent('keypress', onKeyPress)

  return (
    <div class={`card ${s.answer}`}>
      <Switch
        fallback={(
          <Input
            placeholder={t('STUDY.SESSION.ANSWER')}
            value={answer}
            type="text"
            disabled={inputDisabled()}
            success={
              previousState()
              && (questionStatus() === SubjectStatus.Correct
                || questionStatus() === SubjectStatus.CorrectAfterWrong)
            }
            error={previousState() && questionStatus() === SubjectStatus.Wrong}
            ref={element => answerInputElement(element)}
          />
        )}
      >
        <Match when={answerButtons()}>
          <div class={s.answerButtons}>
            <For each={answerButtons()}>
              {x => (
                <button
                  disabled={inputDisabled()}
                  onClick={() => {
                    answer(x)
                    submit()
                  }}
                >
                  {x}
                </button>
              )}
            </For>
          </div>
        </Match>
        <Match when={isJapanese()}>
          <Input
            japanese
            placeholder="答え"
            value={answer}
            type="text"
            disabled={inputDisabled()}
            success={
              previousState()
              && (questionStatus() === SubjectStatus.Correct
                || questionStatus() === SubjectStatus.CorrectAfterWrong)
            }
            error={previousState() && questionStatus() === SubjectStatus.Wrong}
            ref={element => answerInputElement(element)}
          />
        </Match>
      </Switch>

      <div class={s.buttons}>
        <Tooltip
          content={t('STUDY.SESSION.SHUFFLED_SUBJECTS') + ': ' + t(shuffleSubjects() ? 'COMMON.ENABLED' : 'COMMON.DISABLED')}
        >
          <button
            onClick={() => {
              shuffle(shuffleSubjects(x => !x))
            }}
          >
            <Icon
              path={
                shuffleSubjects()
                  ? mdiOrderBoolAscending
                  : mdiOrderAlphabeticalAscending
              }
              size="32"
              inline
            />
          </button>
        </Tooltip>
        <Tooltip
          content={t('STUDY.SESSION.CONSISTENT_QUESTIONS') + ': ' + t(shuffleSubjects() ? 'COMMON.ENABLED' : 'COMMON.DISABLED')}
        >
          <button onClick={() => consistentQuestions(x => !x)}>
            <Icon
              path={consistentQuestions() ? mdiShuffleDisabled : mdiShuffle}
              size="32"
              inline
            />
          </button>
        </Tooltip>
        <Tooltip content={t(questionAnswered() ? 'STUDY.SESSION.NEXT_QUESTION' : 'STUDY.SESSION.TO_ANSWER')}>
          <button
            onClick={submit}
            disabled={
              isLoading()
              || cooldownNext() !== undefined
              || (!!question()?.data.choose && !questionAnswered())
            }
            classList={{ [s.cooldownNext!]: cooldownNext() !== undefined }}
          >
            <Icon
              path={questionAnswered() ? mdiArrowRightBold : mdiCheckBold}
              size="32"
              inline
            />
          </button>
        </Tooltip>
        <Tooltip
          content={
            t('STUDY.SESSION.AUTO_AUDIO')![autoplayAudio()]
          }
        >
          <button onClick={() => autoplayAudio(x => (x + 1) % 3)}>
            <Icon
              path={
                [mdiHeadphonesOff, mdiHeadphones, mdiHeadphonesSettings][
                  autoplayAudio()
                ]!
              }
              size="32"
              inline
            />
          </button>
        </Tooltip>
        <Tooltip content={t('STUDY.SESSION.UNDO')}>
          <button
            onClick={undo}
            disabled={!previousState() || cooldownUndo() !== undefined}
            classList={{ [s.cooldownUndo!]: cooldownUndo() !== undefined }}
          >
            <Icon path={mdiUndoVariant} size="32" inline />
          </button>
        </Tooltip>
      </div>
    </div>
  )
}
