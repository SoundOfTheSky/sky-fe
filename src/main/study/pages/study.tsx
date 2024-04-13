import { mdiBookOpenPageVariant, mdiCog, mdiCogOff } from '@mdi/js';
import { A } from '@solidjs/router';
import { Show, createEffect } from 'solid-js';

import Button from '@/components/form/button';
import Icon from '@/components/icon';
import Skeleton from '@/components/loading/skeleton';
import basicStore from '@/services/basic.store';
import { atom } from '@/services/reactive';

import StudyActivity from '../components/study-activity';
import StudyReviewForecast from '../components/study-review-forecast';
import StudyStats from '../components/study-stats';
import Themes from '../components/themes';
import { useStudy } from '../services/study.context';

import s from './study.module.scss';

export default function StudyTab() {
  // === Hooks ===
  document.title = 'Sky | Study';

  const { availableLessons, availableReviews, settings, offlineUnavailable, ready, update, outdated } = useStudy()!;

  // === State ===
  const showReviewsSettings = atom(false);
  const showLessonsSettings = atom(false);

  // === Effect ===
  createEffect(() => {
    if (outdated()) void update();
  });

  return (
    <div class='card-container'>
      <div class={s.top}>
        <Themes />
        <Show when={basicStore.online()}>
          <A href='./subjects' class={`card ${s.subjects}`} title='Subjects'>
            <Icon path={mdiBookOpenPageVariant} size='32' />
          </A>
        </Show>
      </div>
      <A class={`card ${s.special}`} href={showLessonsSettings() ? '' : './session/lessons'} draggable={false}>
        <Show
          when={showLessonsSettings()}
          fallback={
            <>
              <h1>Lessons</h1>
              <Skeleton loading={!ready()} class={s.reviewsAmount} offline={offlineUnavailable()}>
                <h2>{availableLessons().length}</h2>
              </Skeleton>
            </>
          }
        >
          <div title='How many lessons to do in one go'>
            <div>Amount: {settings().lessons.amount}</div>
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
                    amount: Number.parseInt((e.target as HTMLInputElement).value),
                  },
                }))
              }
            />
          </div>
          <div title='How many lessons need to learn before answering'>
            <div>Batch: {settings().lessons.batch === 50 ? 'everything' : settings().lessons.batch}</div>
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
                    batch: Number.parseInt((e.target as HTMLInputElement).value),
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
      <A class={`card ${s.special}`} href={showReviewsSettings() ? '' : './session/reviews'} draggable={false}>
        <Show
          when={showReviewsSettings()}
          fallback={
            <>
              <h1>Reviews</h1>
              <Skeleton loading={!ready()} class={s.reviewsAmount} offline={offlineUnavailable()}>
                <h2>{availableReviews().length}</h2>
              </Skeleton>
            </>
          }
        >
          <div title='How many reviews to do in one go'>
            <div>Amount: {settings().reviews.amount}</div>
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
                    amount: Number.parseInt((e.target as HTMLInputElement).value),
                  },
                }))
              }
            />
          </div>
          <div title='How many wrong answers can you have before stopping progress'>
            <div>Batch: {settings().reviews.batch === 200 ? 'everything' : settings().reviews.batch}</div>
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
                    batch: Number.parseInt((e.target as HTMLInputElement).value),
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
  );
}
