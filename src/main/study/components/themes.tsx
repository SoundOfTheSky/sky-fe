import { mdiTrashCan } from '@mdi/js'
import { Component, createMemo, For, Show } from 'solid-js'

import Icon from '@/components/icon'
import Skeleton from '@/components/loading/skeleton'
import basicStore from '@/services/basic.store'
import { modalsStore } from '@/services/modals.store'
import { atom } from '@/services/reactive'
import syncStore from '@/services/sync.store'

import { useStudy } from '../services/study.context'
import { addTheme, removeTheme } from '../services/study.rest'

import s from './themes.module.scss'

const Themes: Component = () => {
  // === Hooks ===
  const { themes, settings, offlineUnavailable } = useStudy()!
  const { online } = basicStore
  const { sync } = syncStore

  // === State ===
  const disabledUpdating = atom(false)

  // === Memos ===
  const themesCards = createMemo(() => {
    const $themes = themes()
    if (!$themes) return []
    const disabledIds = settings().disabledThemeIds
    const cards = $themes
      .map((theme) => ({
        id: theme.id,
        title: theme.title,
        isAdded: 'lessons' in theme,
        disabled: disabledIds.includes(theme.id),
      }))
      .sort((theme) => (theme.isAdded ? -1 : 1))
    if (!online()) return cards.filter((x) => x.isAdded)
    return cards
  })

  // === Functions ===
  function onClickThemeCard(theme: {
    id: number
    title: string
    isAdded: boolean
    disabled: boolean
  }) {
    if (disabledUpdating()) return
    if (theme.isAdded) {
      if (theme.disabled)
        settings((x) => ({
          ...x,
          disabledThemeIds: x.disabledThemeIds.filter((x) => x !== theme.id),
        }))
      else
        settings((x) => ({
          ...x,
          disabledThemeIds: [...x.disabledThemeIds, theme.id],
        }))
    } else {
      disabledUpdating(true)
      void addTheme(theme.id)
        .then((items) => {
          themes(items)
          void sync()
        })
        .finally(() => {
          disabledUpdating(false)
        })
    }
  }

  async function onClickRemove(theme: {
    id: number
    title: string
    isAdded: boolean
    disabled: boolean
  }) {
    if (
      disabledUpdating() ||
      !(await modalsStore.dialog({
        title: `Вы уверены, что желаете удалить тему "${theme.title}", а так же весь прогресс по ней?`,
      }))
    )
      return
    disabledUpdating(true)
    try {
      const items = await removeTheme(theme.id)
      themes(items)
      void sync()
    } finally {
      disabledUpdating(false)
    }
  }

  return (
    <div class={`${s.themes} card`}>
      <Skeleton
        loading={!themes()}
        offline={offlineUnavailable()}
        class={s.skeleton}
      >
        <For each={themesCards()}>
          {(theme) => (
            <div
              class={s.theme}
              classList={{ [s.added!]: theme.isAdded && !theme.disabled }}
            >
              <button
                disabled={disabledUpdating()}
                onClick={[onClickThemeCard, theme]}
              >
                {theme.title}
              </button>
              <Show when={theme.isAdded && online()}>
                <button
                  disabled={disabledUpdating()}
                  onClick={() => onClickRemove(theme)}
                >
                  <Icon path={mdiTrashCan} size='14' />
                </button>
              </Show>
            </div>
          )}
        </For>
      </Skeleton>
    </div>
  )
}
export default Themes
