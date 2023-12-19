import { createMemo, For, Show } from 'solid-js';
import { A } from '@solidjs/router';
import { mdiBookOpenPageVariant, mdiCog, mdiCogOff, mdiTrashCan } from '@mdi/js';
import { createWritableMemo } from '@solid-primitives/memo';

import Icon from '@/components/icon';
import IncomingReviewsCard from '@/main/study/components/incoming-reviews-card';
import { atom, atomize, useInterval } from '@/services/reactive';
import Skeleton from '@/components/loading/skeleton';
import Button from '@/components/form/button';

import { useStudy } from '../services/study.context';

import s from './study.module.scss';

export default function StudyTab() {
  // === Hooks ===
  document.title = 'Sky | Study';

  const {
    updateAllIfOutdated,
    availableLessons,
    availableReviews,
    refetchThemesData,
    allThemes,
    themesData,
    addTheme,
    removeTheme,
    settings,
    disabledThemeIds,
  } = useStudy()!;
  useInterval(60_000, updateAllIfOutdated);
  updateAllIfOutdated();

  // === State ===
  const showReviewsSettings = atom(false);
  const showLessonsSettings = atom(false);
  const isThemeAdded = (id: number) => themesData()?.some((t) => t.id === id) ?? false;
  const themesCards = createMemo(
    () =>
      allThemes()
        ?.map((theme) => ({
          id: theme.id,
          title: theme.title,
          isAdded: isThemeAdded(theme.id),
        }))
        .sort((theme) => (theme.isAdded ? -1 : 1)) ?? [],
  );
  // === Memos ===
  const loadingThemes = atomize(createWritableMemo(() => !themesData()));
  // === Functions ===
  async function onClickThemeCard(id: number) {
    if (loadingThemes()) return;
    loadingThemes(true);
    if (isThemeAdded(id)) {
      if (disabledThemeIds().includes(id)) disabledThemeIds((el) => el.filter((x) => x !== id));
      else disabledThemeIds((el) => [...el, id]);
    } else {
      await addTheme(id);
      await refetchThemesData();
    }
    loadingThemes(false);
  }
  async function onThemeDeleteClick(id: number) {
    if (loadingThemes()) return;
    loadingThemes(true);
    await removeTheme(id);
    disabledThemeIds((el) => el.filter((x) => x !== id));
    await refetchThemesData();
    loadingThemes(false);
  }

  return (
    <div class='card-container'>
      <Skeleton class={`${s.themes} card`} loading={loadingThemes()}>
        <For each={themesCards()}>
          {(theme) => (
            <div class={s.theme} classList={{ [s.added]: theme.isAdded && !disabledThemeIds().includes(theme.id) }}>
              <Button disabled={loadingThemes()} onClick={[onClickThemeCard, theme.id]}>
                {theme.title}
              </Button>
              <Show when={theme.isAdded}>
                <Button disabled={loadingThemes()} onClick={() => void onThemeDeleteClick(theme.id)}>
                  <Icon path={mdiTrashCan} size='14' />
                </Button>
              </Show>
            </div>
          )}
        </For>
      </Skeleton>
      <A href='./subjects' class={`card ${s.subjects}`} title='Subjects'>
        <Icon path={mdiBookOpenPageVariant} size='32' />
      </A>
      <A class={`card ${s.special}`} href={showLessonsSettings() ? '' : './session/lessons'} draggable={false}>
        <Show
          when={showLessonsSettings()}
          fallback={
            <>
              <h1>Lessons</h1>
              <Skeleton loading={loadingThemes()} class={s.reviewsAmount}>
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
                  lessons: {
                    ...x.lessons,
                    amount: Number.parseInt((e.target as HTMLInputElement).value),
                  },
                }))
              }
            />
          </div>
          <div title='Preload N next lessons. Helps on slow connection.'>
            <div>
              Preload:{' '}
              {settings().lessons.preload === 0
                ? 'disabled'
                : settings().lessons.preload === 50
                  ? 'everything'
                  : settings().lessons.preload}
            </div>
            <input
              type='range'
              max='50'
              value={settings().lessons.preload}
              onInput={(e) =>
                settings((x) => ({
                  reviews: x.reviews,
                  lessons: {
                    ...x.lessons,
                    preload: Number.parseInt((e.target as HTMLInputElement).value),
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
              <Skeleton loading={loadingThemes()} class={s.reviewsAmount}>
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
                  reviews: {
                    ...x.reviews,
                    amount: Number.parseInt((e.target as HTMLInputElement).value),
                  },
                }))
              }
            />
          </div>
          <div title='Preload N next reviews. Helps on slow connection.'>
            <div>
              Preload:{' '}
              {settings().reviews.preload === 0
                ? 'disabled'
                : settings().reviews.preload === 200
                  ? 'everything'
                  : settings().reviews.preload}
            </div>
            <input
              type='range'
              max='200'
              value={settings().reviews.preload}
              onInput={(e) =>
                settings((x) => ({
                  lessons: x.lessons,
                  reviews: {
                    ...x.reviews,
                    preload: Number.parseInt((e.target as HTMLInputElement).value),
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
      <IncomingReviewsCard />
    </div>
  );
}
