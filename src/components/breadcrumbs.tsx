import { mdiChevronRight } from '@mdi/js'
import { A, useLocation } from '@solidjs/router'
import { Component, createMemo, For, Show } from 'solid-js'

import Icon from './icon'

import s from './breadcrumbs.module.scss'

const Breadcrumbs: Component<{ skip?: number }> = (properties) => {
  // === State ===
  const location = useLocation()
  const startPath = createMemo(() =>
    location.pathname
      .slice(1)
      .split('/')
      .slice(0, properties.skip ?? 0)
      .join('/'),
  )
  const path = createMemo(() =>
    location.pathname
      .slice(1)
      .split('/')
      .slice(properties.skip ?? 0),
  )

  return (
    <div class={'card ' + s.breadcrumbs}>
      <For each={path()}>
        {(folder, index) => (
          <Show
            when={index() < path().length - 1}
            fallback={<span class={s.item}>{folder}</span>}
          >
            <>
              <A
                class={s.item}
                href={
                  startPath() +
                  '/' +
                  path()
                    .slice(0, index() + 1)
                    .join('/')
                }
              >
                {folder}
              </A>
              <Icon path={mdiChevronRight} size='32' />
            </>
          </Show>
        )}
      </For>
    </div>
  )
}

export default Breadcrumbs
