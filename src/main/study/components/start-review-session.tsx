import { mdiCog, mdiCogOff } from '@mdi/js'
import { A } from '@solidjs/router'
import { createMemo, Show } from 'solid-js'

import Icon from '@/components/icon'
import Skeleton from '@/components/loading/skeleton'
import { atom } from '@/services/reactive'

import { useStudy } from '../services/study.context'

import s from './start-review-session.module.scss'

export default function StartReviewSession(properties: {
  lessons?: boolean
}) {
  // === Hooks ===
  const {
    lessons,
    reviews,
    settings,
    offlineUnavailable,
    ready,
  } = useStudy()!

  // === State ===
  const showSettings = atom(false)

  // === Memos ===
  const subjects = createMemo(() => properties.lessons ? lessons() : reviews())
  const settingsScoped = createMemo(() => properties.lessons ? settings().lessons : settings().reviews)

  return (
    <A
      class={`card ${s.startReviewSession}`}
      classList={{
        [s.disabled!]: subjects().length === 0 && ready(),
        [s.settings!]: showSettings(),
      }}
      href={
        showSettings() || subjects().length === 0
          ? ''
          : (properties.lessons ? './session/lessons' : './session/reviews')
      }
      draggable={false}
    >
      <Show
        when={showSettings()}
        fallback={(
          <div class={s.wrapper}>
            <h1>{properties.lessons ? 'Уроки' : 'Повторения'}</h1>
            <Skeleton
              loading={!ready()}
              class={s.reviewsAmount}
              offline={offlineUnavailable()}
            >
              <h2>{subjects().length}</h2>
            </Skeleton>
            <button
              onClick={(event) => {
                event.preventDefault()
                showSettings(true)
              }}
              class={s.settingsBtn}
            >
              <Icon path={mdiCog} size="24" />
            </button>
          </div>
        )}
      >
        <div class={s.settingsWrapper}>
          <div title="Количество вопросов за одну сессию">
            <div>
              Количество:
              {settingsScoped().amount}
            </div>
            <input
              type="range"
              min="1"
              max="50"
              aria-label="Количество"
              value={settingsScoped().amount}
              onInput={(event) => {
                settingsScoped().amount = Number.parseInt(
                  (event.target as HTMLInputElement).value,
                )
                settings(settings())
              }}
            />
          </div>
          <div title="Размер группы уроков">
            <div>
              Группировать по:
              {' '}
              {settingsScoped().batch}
            </div>
            <input
              type="range"
              min="1"
              max="50"
              value={settingsScoped().batch}
              aria-label="Группировать по"
              onInput={(event) => {
                settingsScoped().batch = Number.parseInt(
                  (event.target as HTMLInputElement).value,
                )
                settings(settings())
              }}
            />
          </div>
          <button
            onClick={(event) => {
              event.preventDefault()
              showSettings(false)
            }}
            class={s.settingsBtn}
          >
            <Icon path={mdiCogOff} size="24" />
          </button>
        </div>
      </Show>

    </A>
  )
}
