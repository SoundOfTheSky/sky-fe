import { mdiTrashCan } from '@mdi/js';
import { createMemo, For, Show, Component } from 'solid-js';

import Button from '@/components/form/button';
import Icon from '@/components/icon';
import Skeleton from '@/components/loading/skeleton';

import { useStudy } from '../services/study.context';

import s from './themes.module.scss';

const Themes: Component = () => {
  // === Hooks ===
  const { themes, settings, addTheme, removeTheme, offlineProgress, offlineUnavailable, ready } = useStudy()!;
  // === Memos ===
  const themesCards = createMemo(() => {
    const $themes = themes();
    if (!$themes) return [];
    const disabledIds = settings().disabledThemeIds;
    return $themes
      .map((theme) => ({
        id: theme.id,
        title: theme.title,
        isAdded: !!theme.lessons,
        disabled: disabledIds.includes(theme.id),
      }))
      .sort((theme) => (theme.isAdded ? -1 : 1));
  });
  const disabledUpdating = createMemo(() => offlineProgress() > 0 && offlineProgress() < 1);
  // === Functions ===
  async function onClickThemeCard(theme: { id: number; isAdded: boolean; disabled: boolean }) {
    if (theme.isAdded) {
      if (theme.disabled)
        settings((x) => ({ ...x, disabledThemeIds: x.disabledThemeIds.filter((x) => x !== theme.id) }));
      else settings((x) => ({ ...x, disabledThemeIds: [...x.disabledThemeIds, theme.id] }));
    } else await addTheme(theme.id);
  }

  return (
    <Skeleton class={`${s.themes} card`} loading={!ready()} offline={offlineUnavailable()}>
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
            <Show when={theme.isAdded}>
              <Button disabled={disabledUpdating()} onClick={() => void removeTheme(theme.id)}>
                <Icon path={mdiTrashCan} size='14' />
              </Button>
            </Show>
          </div>
        )}
      </For>
    </Skeleton>
  );
};
export default Themes;
