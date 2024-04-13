import { mdiTrashCan } from '@mdi/js';
import { createMemo, For, Show, Component } from 'solid-js';

import Button from '@/components/form/button';
import Icon from '@/components/icon';
import Skeleton from '@/components/loading/skeleton';
import basicStore from '@/services/basic.store';

import { useStudy } from '../services/study.context';

import s from './themes.module.scss';

const Themes: Component = () => {
  // === Hooks ===
  const { themes, settings, addTheme, removeTheme, offlineProgress, offlineUnavailable } = useStudy()!;
  const { online } = basicStore;
  // === Memos ===
  const themesCards = createMemo(() => {
    const $themes = themes();
    if (!$themes) return [];
    const disabledIds = settings().disabledThemeIds;
    const cards = $themes
      .map((theme) => ({
        id: theme.id,
        title: theme.title,
        isAdded: !!theme.lessons,
        disabled: disabledIds.includes(theme.id),
      }))
      .sort((theme) => (theme.isAdded ? -1 : 1));
    if (!online()) return cards.filter((x) => x.isAdded);
    return cards;
  });
  const disabledUpdating = createMemo(() => offlineProgress() > 0 && offlineProgress() < 1);
  // === Functions ===
  async function onClickThemeCard(theme: { id: number; isAdded: boolean; disabled: boolean }) {
    if (disabledUpdating()) return;
    if (theme.isAdded) {
      if (theme.disabled)
        settings((x) => ({ ...x, disabledThemeIds: x.disabledThemeIds.filter((x) => x !== theme.id) }));
      else settings((x) => ({ ...x, disabledThemeIds: [...x.disabledThemeIds, theme.id] }));
    } else await addTheme(theme.id);
  }
  async function onClickRemove(id: number) {
    if (disabledUpdating()) return;
    await removeTheme(id);
  }

  return (
    <div class={`${s.themes} card`}>
      <Skeleton loading={!themes()} offline={offlineUnavailable()} class={s.skeleton}>
        <div
          class={s.loader}
          style={{
            transform: `scaleX(${offlineProgress()})`,
            opacity: disabledUpdating() ? 1 : 0,
          }}
        />
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
