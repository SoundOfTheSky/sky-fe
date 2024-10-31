import { mdiCog, mdiCogOff } from '@mdi/js';
import { A } from '@solidjs/router';
import { createEffect, Show } from 'solid-js';

import Button from '@/components/form/button';
import Icon from '@/components/icon';
import Skeleton from '@/components/loading/skeleton';
import FatalError from '@/main/pages/fatal-error';
import { atom } from '@/services/reactive';
import syncStore, { SYNC_STATUS } from '@/services/sync.store';

import StudyActivity from '../components/study-activity';
import StudyReviewForecast from '../components/study-review-forecast';
import StudyStats from '../components/study-stats';
import Themes from '../components/themes';
import { useStudy } from '../services/study.context';

import s from './study.module.scss';

export default function StudyTab() {
  // === Hooks ===
  document.title = 'Sky | Study';

  const {
    lessons,
    reviews,
    settings,
    offlineUnavailable,
    ready,
    updateStats,
    now,
    update,
  } = useStudy()!;

  // === State ===
  const showReviewsSettings = atom(false);
  const showLessonsSettings = atom(false);

  // Update stats when synched
  createEffect(() => {
    if (syncStore.status() === SYNC_STATUS.SYNCHED) void updateStats();
  });

  // Update every hour
  createEffect(() => {
    now();
    void update();
  });

  return (
    <Show when={!offlineUnavailable()} fallback={<FatalError />}>
      <div class='card-container'>
        <Themes />
        <A
          class={`card ${s.special}`}
          classList={{
            [s.disabled!]: lessons().length === 0,
          }}
          href={
            showLessonsSettings() || lessons().length === 0
              ? ''
              : './session/lessons'
          }
          draggable={false}
        >
          <Show
            when={showLessonsSettings()}
            fallback={
              <>
                <h1>Уроки</h1>
                <Skeleton
                  loading={!ready()}
                  class={s.reviewsAmount}
                  offline={offlineUnavailable()}
                >
                  <h2>{lessons().length}</h2>
                </Skeleton>
              </>
            }
          >
            <div title='Количество уроков за одну сессию'>
              <div>Количество: {settings().lessons.amount}</div>
              <input
                type='range'
                min='1'
                max='50'
                value={settings().lessons.amount}
                onInput={(e) =>
                  settings((x) => ({
                    reviews: x.reviews,
                    disabledThemeIds: x.disabledThemeIds,
                    lessons: {
                      ...x.lessons,
                      amount: Number.parseInt(
                        (e.target as HTMLInputElement).value,
                      ),
                    },
                  }))
                }
              />
            </div>
            <div title='Размер группы уроков'>
              <div>
                Группировать по:{' '}
                {settings().lessons.batch === 50
                  ? 'everything'
                  : settings().lessons.batch}
              </div>
              <input
                type='range'
                min='1'
                max='50'
                value={settings().lessons.batch}
                onInput={(e) =>
                  settings((x) => ({
                    reviews: x.reviews,
                    disabledThemeIds: x.disabledThemeIds,
                    lessons: {
                      ...x.lessons,
                      batch: Number.parseInt(
                        (e.target as HTMLInputElement).value,
                      ),
                    },
                  }))
                }
              />
            </div>
          </Show>

          <Button
            onClick={(e) => {
              e.preventDefault();
              showLessonsSettings((x) => !x);
            }}
            class={s.settingsBtn}
          >
            <Icon path={showLessonsSettings() ? mdiCogOff : mdiCog} size='24' />
          </Button>
        </A>
        <A
          class={`card ${s.special}`}
          classList={{
            [s.disabled!]: reviews().length === 0,
          }}
          href={
            reviews().length === 0 || showReviewsSettings()
              ? ''
              : './session/reviews'
          }
          draggable={false}
        >
          <Show
            when={showReviewsSettings()}
            fallback={
              <>
                <h1>Повторения</h1>
                <Skeleton
                  loading={!ready()}
                  class={s.reviewsAmount}
                  offline={offlineUnavailable()}
                >
                  <h2>{reviews().length}</h2>
                </Skeleton>
              </>
            }
          >
            <div title='Количество повторений за одну сессию'>
              <div>Количество: {settings().reviews.amount}</div>
              <input
                type='range'
                min='1'
                max='200'
                value={settings().reviews.amount}
                onInput={(e) =>
                  settings((x) => ({
                    lessons: x.lessons,
                    disabledThemeIds: x.disabledThemeIds,
                    reviews: {
                      ...x.reviews,
                      amount: Number.parseInt(
                        (e.target as HTMLInputElement).value,
                      ),
                    },
                  }))
                }
              />
            </div>
            <div title='Размер группы повторений'>
              <div>Группировать по: {settings().reviews.batch}</div>
              <input
                type='range'
                min='1'
                max='200'
                value={settings().reviews.batch}
                onInput={(e) =>
                  settings((x) => ({
                    lessons: x.lessons,
                    disabledThemeIds: x.disabledThemeIds,
                    reviews: {
                      ...x.reviews,
                      batch: Number.parseInt(
                        (e.target as HTMLInputElement).value,
                      ),
                    },
                  }))
                }
              />
            </div>
          </Show>
          <Button
            onClick={(e) => {
              e.preventDefault();
              showReviewsSettings((x) => !x);
            }}
            class={s.settingsBtn}
          >
            <Icon path={showReviewsSettings() ? mdiCogOff : mdiCog} size='24' />
          </Button>
        </A>
        <StudyActivity />
        <StudyReviewForecast />
        <StudyStats />
      </div>
    </Show>
  );
}
