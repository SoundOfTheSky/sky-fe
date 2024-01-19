import { createMemo, For, Show, Component } from 'solid-js';
import { atomize } from '@/services/reactive';

import s from './themes.module.scss';
import { useStudy } from '../services/study.context';
import { createWritableMemo } from '@solid-primitives/memo';
import Skeleton from '@/components/loading/skeleton';
import Button from '@/components/form/button';
import Icon from '@/components/icon';
import { mdiTrashCan } from '@mdi/js';

const Themes: Component = () => {
  // === Hooks ===
  const { refetchThemesData, allThemes, themesData, addTheme, removeTheme, disabledThemeIds } = useStudy()!;
  // === Memos ===
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
  const loadingThemes = atomize(createWritableMemo(() => !themesData()));
  // === Functions ===
  function isThemeAdded(id: number) {
    return themesData()?.some((t) => t.id === id) ?? false;
  }
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
    <Skeleton class={`${s.themes} card`} loading={loadingThemes()}>
      <For each={themesCards()}>
        {(theme) => (
          <div class={s.theme} classList={{ [s.added]: theme.isAdded && !disabledThemeIds().includes(theme.id) }}>
            <button disabled={loadingThemes()} onClick={[onClickThemeCard, theme.id]}>
              {theme.title}
            </button>
            <Show when={theme.isAdded}>
              <Button disabled={loadingThemes()} onClick={() => void onThemeDeleteClick(theme.id)}>
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
