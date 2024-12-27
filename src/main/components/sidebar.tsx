import { mdiBookOpenPageVariant, mdiMagnify } from '@mdi/js'
import { A } from '@solidjs/router'
import { Component, Index, createMemo } from 'solid-js'

import AuthStore from '@/services/auth.store'
import basicStore from '@/services/basic.store'

import Icon from '../../components/icon'

import s from './sidebar.module.scss'

const { t } = basicStore

const Sidebar: Component = () => {
  // === Hooks ===
  const items = createMemo(() => [
    {
      icon: mdiBookOpenPageVariant,
      title: 'Главная',
      link: '/study',
    },
    {
      icon: mdiMagnify,
      title: 'Поиск',
      link: '/study/subjects',
    },
  ])
  return (
    <div class={s.sidebarComponent}>
      <h1>{t('STUDY.TITLE')}</h1>
      <div class={s.menu}>
        <Index each={items()}>
          {item => (
            <A class={s.item} href={item().link} activeClass={s.active}>
              <Icon path={item().icon} size="32" />
              <span class={s.title}>{item().title}</span>
            </A>
          )}
        </Index>
        <A
          class={`${s.item} ${s.profile}`}
          href="/profile"
          activeClass={s.active}
        >
          <img
            class={s.avatar}
            src={AuthStore.me()?.avatar ?? '/avatar.webp'}
            alt={t('AUTH.AVATAR')}
          />
          <span class={s.title}>{AuthStore.me()?.username ?? t('AUTH.ANONYMOUS')}</span>
        </A>
      </div>
    </div>
  )
}

export default Sidebar
