import { mdiTrashCan } from '@mdi/js';
import { createMemo, For, Show, Component, untrack } from 'solid-js';

import Button from '@/components/form/button';
import Icon from '@/components/icon';
import Skeleton from '@/components/loading/skeleton';
import basicStore from '@/services/basic.store';
import { atom } from '@/services/reactive';
import syncStore from '@/services/sync.store';

import { useStudy } from '../services/study.context';
import { addTheme, removeTheme } from '../services/study.rest';

import s from './themes.module.scss';

const Themes: Component = () => {
  // === Hooks ===
  const { themes, settings, offlineUnavailable } = useStudy()!;
  const { online } = basicStore;
  const { sync } = syncStore;

  // === State ===
  const disabledUpdating = atom(false);

  // === Memos ===
  const themesCards = createMemo(() => {
    const $themes = themes();
    if (!$themes) return [];
    const disabledIds = settings().disabledThemeIds;
    const cards = $themes
      .map((theme) => ({
        id: theme.id,
        title: theme.title,
        isAdded: 'lessons' in theme,
        disabled: disabledIds.includes(theme.id),
      }))
      .sort((theme) => (theme.isAdded ? -1 : 1));
    if (!online()) return cards.filter((x) => x.isAdded);
    return cards;
  });

  // === Functions ===
  function onClickThemeCard(theme: { id: number; isAdded: boolean; disabled: boolean }) {
    untrack(() => {
      if (disabledUpdating()) return;
      if (theme.isAdded) {
        if (theme.disabled)
          settings((x) => ({ ...x, disabledThemeIds: x.disabledThemeIds.filter((x) => x !== theme.id) }));
        else settings((x) => ({ ...x, disabledThemeIds: [...x.disabledThemeIds, theme.id] }));
      } else {
        disabledUpdating(true);
        void addTheme(theme.id)
          .then((items) => {
            themes(items);
            void sync();
          })
          .finally(() => {
            disabledUpdating(false);
          });
      }
    });
  }

  function onClickRemove(id: number) {
    untrack(() => {
      if (disabledUpdating()) return;
      disabledUpdating(true);

      void removeTheme(id)
        .then((items) => {
          themes(items);
          void sync();
        })
        .finally(() => disabledUpdating(false));
    });
  }

  return (
    <div class={`${s.themes} card`}>
      <Skeleton loading={!themes()} offline={offlineUnavailable()} class={s.skeleton}>
        <For each={themesCards()}>
          {(theme) => (
            <div class={s.theme} classList={{ [s.added]: theme.isAdded && !theme.disabled }}>
              <Button disabled={disabledUpdating()} onClick={[onClickThemeCard, theme]}>
                {theme.title}
              </Button>
              <Show when={theme.isAdded && online()}>
                <Button disabled={disabledUpdating()} onClick={[onClickRemove, theme.id]}>
                  <Icon path={mdiTrashCan} size='14' />
                </Button>
              </Show>
            </div>
          )}
        </For>
      </Skeleton>
    </div>
  );
};
export default Themes;
