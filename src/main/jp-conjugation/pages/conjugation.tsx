/* eslint-disable solid/reactivity */
/* eslint-disable solid/no-innerhtml */
import {
  mdiAccountArrowUp,
  mdiArrowRightBold,
  mdiCancel,
  mdiCheckBold,
  mdiClock,
  mdiClose,
  mdiCog,
  mdiIdeogramCjk,
  mdiLock,
  mdiLockOff,
  mdiSyllabaryHiragana,
  mdiTranslate,
  mdiTranslateOff,
} from '@mdi/js';
import { Component, Show, batch, createEffect, untrack } from 'solid-js';
import { createMutable, modifyMutable, reconcile } from 'solid-js/store';

import Button from '@/components/form/button';
import Input from '@/components/form/input';
import Toggle from '@/components/form/toggle';
import Icon from '@/components/icon';
import Tooltip from '@/components/tooltip';
import basicStore, { NotificationType } from '@/services/basic.store';
import { atom, useGlobalEvent, useInterval } from '@/services/reactive';
import { formatTime, randomFromArray } from '@/sky-utils';

import { ConjugateOptions, conjugate } from '../services/conjugator';
import { removeFurigana, toHiragana, words } from '../services/data';

import s from './conjugation.module.scss';

enum Status {
  Answering,
  Correct,
  Wrong,
}

const Conjugation: Component = () => {
  type Question = {
    kanji: string;
    type: string;
    eng: string;
    answers: string[];
    options: ConjugateOptions;
    optionsKey: keyof typeof stats;
  };
  // === Hooks ===
  useGlobalEvent('keypress', (e) => {
    if (e.key === 'Enter') commit();
  });
  useInterval(() => {
    time((x) => x + 1);
  }, 1000);

  // === State ===
  const stats = {
    v_v1_present_affirmative_polite: 0,
    v_v1_present_negative_plain: 0,
    v_v1_present_negative_polite: 0,
    v_v1_past_affirmative_plain: 0,
    v_v1_past_affirmative_polite: 0,
    v_v1_past_negative_plain: 0,
    v_v1_past_negative_polite: 0,
    v_v1_te: 0,
    v_v5_present_affirmative_polite: 0,
    v_v5_present_negative_plain: 0,
    v_v5_present_negative_polite: 0,
    v_v5_past_affirmative_plain: 0,
    v_v5_past_affirmative_polite: 0,
    v_v5_past_negative_plain: 0,
    v_v5_past_negative_polite: 0,
    v_v5_te: 0,
    v_irv_present_affirmative_polite: 0,
    v_irv_present_negative_plain: 0,
    v_irv_present_negative_polite: 0,
    v_irv_past_affirmative_plain: 0,
    v_irv_past_affirmative_polite: 0,
    v_irv_past_negative_plain: 0,
    v_irv_past_negative_polite: 0,
    v_irv_te: 0,
    adj_i_present_affirmative_polite: 0,
    adj_i_present_negative_plain: 0,
    adj_i_present_negative_polite: 0,
    adj_i_past_affirmative_plain: 0,
    adj_i_past_affirmative_polite: 0,
    adj_i_past_negative_plain: 0,
    adj_i_past_negative_polite: 0,
    adj_i_adverb: 0,
    adj_na_present_affirmative_polite: 0,
    adj_na_present_negative_plain: 0,
    adj_na_present_negative_polite: 0,
    adj_na_past_affirmative_plain: 0,
    adj_na_past_affirmative_polite: 0,
    adj_na_past_negative_plain: 0,
    adj_na_past_negative_polite: 0,
    adj_na_adverb: 0,
    adj_ira_present_affirmative_polite: 0,
    adj_ira_present_negative_plain: 0,
    adj_ira_present_negative_polite: 0,
    adj_ira_past_affirmative_plain: 0,
    adj_ira_past_affirmative_polite: 0,
    adj_ira_past_negative_plain: 0,
    adj_ira_past_negative_polite: 0,
    adj_ira_adverb: 0,
  };
  const settings = createMutable({
    v: {
      enabled: true,
      // ===
      v1: true,
      v5: true,
      irv: true,
      // ===
      present: true,
      past: true,
      te: true,
      // ===
      affirmative: true,
      negative: true,
      // ===
      plain: true,
      polite: true,
    },
    adj: {
      enabled: true,
      // ===
      i: true,
      na: true,
      ira: true,
      // ===
      present: true,
      past: true,
      adverb: true,
      // ===
      affirmative: true,
      negative: true,
      // ===
      plain: true,
      polite: true,
    },
    streak: 0,
    translate: false,
    furigana: true,
    lockWord: undefined as undefined | { kanji: string; eng: string; type: string },
  });
  const input = atom('');
  const status = atom<Status>(Status.Answering);
  const time = atom(0);
  const isSettingsOpen = atom(false);
  const question = atom<Question>(selectNewQuestion());
  const inputElement = atom<HTMLInputElement>();
  // === Effects ===
  createEffect(() => {
    localStorage.setItem('jp-conjugation', JSON.stringify(settings));
  });
  // === Functions ===
  function commit() {
    untrack(() =>
      batch(() => {
        if (status() === Status.Answering) {
          const $input = input();
          const $question = question();
          if ($question.answers.includes($input)) {
            stats[$question.optionsKey] += 1;
            status(Status.Correct);
            settings.streak += 1;
          } else {
            status(Status.Wrong);
            settings.streak = 0;
          }
        } else {
          question(selectNewQuestion());
          status(Status.Answering);
          input('');
          setTimeout(() => inputElement()?.focus(), 100);
        }
      }),
    );
  }
  /** Returns random new question. Respects filters */
  function selectNewQuestion(): Question {
    return untrack(() => {
      const availableKeys = Object.entries(stats).filter(
        ([key]) => checkIfFilterKeyEnabled(key) && (!settings.lockWord || key.split('_')[1] === settings.lockWord.type),
      );
      const min = Math.min(...availableKeys.map(([, val]) => val));
      const optionsKey = randomFromArray(availableKeys.filter(([, val]) => val === min))[0] as keyof typeof stats;
      const options = deserializeOptions(optionsKey);
      const word = settings.lockWord ?? randomFromArray(words.filter((x) => x.type === options.type));
      const result = conjugate(toHiragana(word.kanji), word.type, options.options);
      if (!result) throw new Error('Cannot conjugate');

      return {
        ...word,
        options: options.options,
        answers: typeof result === 'string' ? [result] : result,
        optionsKey,
      };
    });
  }
  /** Checks if current filter key is enabled for sorting */
  function checkIfFilterKeyEnabled(filterKey: string) {
    return untrack(() => {
      const split = filterKey.split('_');
      const filter = settings[split[0] as 'v' | 'adj'];
      if (!filter.enabled) return false;
      for (let i = 1; i < split.length; i++) if (!filter[split[i] as keyof typeof filter]) return false;
      return true;
    });
  }
  /** Extract data from options string */
  function deserializeOptions(optionsKey: string) {
    const opts = optionsKey.split('_');
    const options: ConjugateOptions = {};
    if (opts.includes('adverb')) options.adverb = true;
    if (opts.includes('te')) options.te = true;
    if (opts.includes('negative')) options.negative = true;
    if (opts.includes('past')) options.past = true;
    if (opts.includes('polite')) options.polite = true;
    return {
      theme: opts[0],
      type: opts[1],
      options,
    };
  }
  /** On filters change */
  function onFilterChange(type: 'v' | 'adj', key: string) {
    untrack(() => {
      batch(() => {
        try {
          question(selectNewQuestion());
          status(Status.Answering);
          input('');
        } catch {
          (settings[type] as Record<string, boolean>)[key] = !(settings[type] as Record<string, boolean>)[key];
          basicStore.notify({
            title: 'At least one option in must be enabled in each category',
            timeout: 10000,
            type: NotificationType.Info,
          });
        }
      });
    });
  }
  /** Toggle word lock */
  function toggleWordLock() {
    untrack(() => {
      settings.lockWord = settings.lockWord
        ? undefined
        : {
            eng: question().eng,
            kanji: question().kanji,
            type: question().type,
          };
    });
  }
  function restoreFilters() {
    untrack(() => {
      batch(() => {
        const txt = localStorage.getItem('jp-conjugation');
        if (!txt) return;
        modifyMutable(settings, reconcile(JSON.parse(txt)));
      });
    });
  }
  restoreFilters();

  return (
    <div class={s.conjugation + ' card-container'}>
      <Show
        when={isSettingsOpen()}
        fallback={
          <>
            <div class={s.question + ' card'}>
              <div class={s.stats}>
                Streak: {settings.streak} Time: {formatTime(time() * 1000, 1000)}
              </div>
              <div
                class={s.title}
                innerHTML={settings.furigana ? question().kanji : removeFurigana(question().kanji)}
              />
              <Show when={settings.translate || status() !== Status.Answering}>
                <div>{question().eng}</div>
              </Show>
              <Show when={status() !== Status.Answering}>
                <div>{question().answers.join(', ')}</div>
              </Show>
              <div class={s.tags}>
                <Show when={question().options.negative}>
                  <Tooltip content='Negative'>
                    <Icon size='24' path={mdiCancel} inline />
                  </Tooltip>
                </Show>
                <Show when={question().options.past}>
                  <Tooltip content='Past'>
                    <Icon size='24' path={mdiClock} inline />
                  </Tooltip>
                </Show>
                <Show when={question().options.polite}>
                  <Tooltip content='Polite'>
                    <Icon size='24' path={mdiAccountArrowUp} inline />
                  </Tooltip>
                </Show>
                <Show when={question().options.adverb}>
                  <span>Adverb</span>
                </Show>
                <Show when={question().options.te}>
                  <span>-て</span>
                </Show>
              </div>
            </div>
            <div class={s.answer + ' card'}>
              <Input
                japanese
                placeholder='答え'
                value={input}
                type='text'
                disabled={status() !== Status.Answering}
                success={status() === Status.Correct}
                error={status() === Status.Wrong}
                ref={(x: HTMLInputElement) => inputElement(x)}
              />
              <div class={s.buttons}>
                <Tooltip content={settings.furigana ? 'Disable furigana' : 'Enable furigana'}>
                  <Button onClick={() => (settings.furigana = !settings.furigana)}>
                    <Icon path={settings.furigana ? mdiIdeogramCjk : mdiSyllabaryHiragana} size='32' inline />
                  </Button>
                </Tooltip>
                <Tooltip content={settings.translate ? 'Disable translation' : 'Enable translation'}>
                  <Button onClick={() => (settings.translate = !settings.translate)}>
                    <Icon path={settings.translate ? mdiTranslateOff : mdiTranslate} size='32' inline />
                  </Button>
                </Tooltip>
                <Tooltip content={status() === Status.Answering ? 'Submit answer' : 'Next question'}>
                  <Button onClick={commit}>
                    <Icon path={status() === Status.Answering ? mdiCheckBold : mdiArrowRightBold} size='32' inline />
                  </Button>
                </Tooltip>
                <Tooltip content={settings.lockWord ? `Unlock word` : 'Lock word (practice this word only)'}>
                  <Button onClick={toggleWordLock}>
                    <Icon path={settings.lockWord ? mdiLockOff : mdiLock} size='32' inline />
                  </Button>
                </Tooltip>
                <Tooltip content='Settings'>
                  <Button onClick={() => isSettingsOpen(true)}>
                    <Icon path={mdiCog} size='32' inline />
                  </Button>
                </Tooltip>
              </div>
            </div>
          </>
        }
      >
        <div class={s.settings + ' card'}>
          <div class='card-title'>Conjugation settings</div>
          <Button class={s.close} onClick={() => isSettingsOpen(false)}>
            <Icon path={mdiClose} size='32' />
          </Button>
          <h2>Verbs</h2>
          <Toggle store={settings.v} key='enabled' label='Verbs' onChange={() => onFilterChange('v', 'enabled')} />
          <Show when={settings.v.enabled}>
            <hr />
            <Toggle store={settings.v} key='v1' label='Ichidan verbs' onChange={() => onFilterChange('v', 'v1')} />
            <Toggle store={settings.v} key='v5' label='Godan verbs' onChange={() => onFilterChange('v', 'v5')} />
            <Toggle store={settings.v} key='irv' label='Irregular verbs' onChange={() => onFilterChange('v', 'irv')} />
            <hr />
            <Toggle
              store={settings.v}
              key='present'
              label='Present time'
              onChange={() => onFilterChange('v', 'present')}
            />
            <Toggle store={settings.v} key='past' label='Past time' onChange={() => onFilterChange('v', 'past')} />
            <Toggle store={settings.v} key='te' label='-て form' onChange={() => onFilterChange('v', 'te')} />
            <hr />
            <Toggle
              store={settings.v}
              key='affirmative'
              label='Affirmative'
              onChange={() => onFilterChange('v', 'affirmative')}
            />
            <Toggle
              store={settings.v}
              key='negative'
              label='Negative'
              onChange={() => onFilterChange('v', 'negative')}
            />
            <hr />
            <Toggle store={settings.v} key='plain' label='Plain' onChange={() => onFilterChange('v', 'plain')} />
            <Toggle store={settings.v} key='polite' label='Polite' onChange={() => onFilterChange('v', 'polite')} />
          </Show>
          <h2>Adjectives</h2>
          <Toggle
            store={settings.adj}
            key='enabled'
            label='Adjectives'
            onChange={() => onFilterChange('adj', 'enabled')}
          />
          <Show when={settings.adj.enabled}>
            <hr />
            <Toggle store={settings.adj} key='i' label='い-verbs' onChange={() => onFilterChange('adj', 'i')} />
            <Toggle store={settings.adj} key='na' label='な-verbs' onChange={() => onFilterChange('adj', 'na')} />
            <Toggle
              store={settings.adj}
              key='ira'
              label='Irregular adjectives'
              onChange={() => onFilterChange('adj', 'ira')}
            />
            <hr />
            <Toggle
              store={settings.adj}
              key='present'
              label='Present time'
              onChange={() => onFilterChange('adj', 'present')}
            />
            <Toggle store={settings.adj} key='past' label='Past time' onChange={() => onFilterChange('adj', 'past')} />
            <Toggle store={settings.adj} key='adverb' label='Adverb' onChange={() => onFilterChange('adj', 'adverb')} />
            <hr />
            <Toggle
              store={settings.adj}
              key='affirmative'
              label='Affirmative'
              onChange={() => onFilterChange('adj', 'affirmative')}
            />
            <Toggle
              store={settings.adj}
              key='negative'
              label='Negative'
              onChange={() => onFilterChange('adj', 'negative')}
            />
            <hr />
            <Toggle store={settings.adj} key='plain' label='Plain' onChange={() => onFilterChange('adj', 'plain')} />
            <Toggle store={settings.adj} key='polite' label='Polite' onChange={() => onFilterChange('adj', 'polite')} />
          </Show>
        </div>
      </Show>
    </div>
  );
};
export default Conjugation;
