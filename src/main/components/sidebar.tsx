import {
  mdiBookOpenPageVariant,
  mdiBookSearch,
  mdiFolder,
  mdiHome,
  mdiTimer,
} from '@mdi/js'
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
      icon: mdiHome,
      title: t('SIDEBAR.MAIN'),
      link: '/',
    },
    {
      icon: mdiBookOpenPageVariant,
      title: t('STUDY.TITLE'),
      link: '/study',
    },
    {
      icon: mdiBookSearch,
      title: t('STUDY.SUBJECTS'),
      link: '/study/subjects',
    },
    {
      icon: mdiFolder,
      title: t('SIDEBAR.STORAGE'),
      link: '/storage',
    },
    {
      icon: mdiTimer,
      title: t('TIMER.TITLE'),
      link: '/timer',
    },
  ])
  return (
    <div class={s.sidebarComponent}>
      <h1>{t('SIDEBAR.TITLE')}</h1>
      <div class={s.menu}>
        <Index each={items()}>
          {(item) => (
            <A class={s.item} href={item().link} activeClass={s.active}>
              <Icon path={item().icon} size='32' />
              <span class={s.title}>{item().title}</span>
            </A>
          )}
        </Index>
        <A
          class={`${s.item} ${s.profile}`}
          href='/profile'
          activeClass={s.active}
        >
          <img
            class={s.avatar}
            src={AuthStore.me()?.avatar ?? '/avatar.webp'}
            alt={t('AUTH.AVATAR')}
          />
          <span class={s.title}>
            {AuthStore.me()?.username ?? t('AUTH.ANONYMOUS')}
          </span>
        </A>
      </div>
    </div>
  )
}

export default Sidebar
