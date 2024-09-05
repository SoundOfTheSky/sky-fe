import { mdiBookOpenPageVariant, mdiHome, mdiIdeogramCjk } from '@mdi/js';
import { A } from '@solidjs/router';
import { Component, Index, createMemo } from 'solid-js';

import AuthStore from '@/services/auth.store';

import Icon from '../../components/icon';

import s from './sidebar.module.scss';

const Sidebar: Component = () => {
  // === Hooks ===
  const items = createMemo(() => [
    {
      icon: mdiHome,
      title: 'Overview',
      link: '/',
    },
    {
      icon: mdiBookOpenPageVariant,
      title: 'Study',
      link: '/study',
      progress: 1,
    },
    {
      icon: mdiIdeogramCjk,
      title: 'JP Conjugation',
      link: '/jp-conjugation',
    },
  ]);
  return (
    <div class={s.sidebarComponent}>
      <h1>Dashboard</h1>
      <div class={s.menu}>
        <Index each={items()}>
          {(item) => (
            <A class={s.item} href={item().link} activeClass={s.active}>
              <Icon path={item().icon} size='32' />
              <span class={s.title}>{item().title}</span>
              <div
                class={s.progress}
                classList={{
                  [s.shown]: !!item().progress && item().progress! > 0 && item().progress! < 1,
                }}
                style={{
                  transform: `scaleX(${item().progress!})`,
                }}
              />
            </A>
          )}
        </Index>
        <A class={`${s.item} ${s.profile}`} href='/profile' activeClass={s.active}>
          <img class={s.avatar} src={AuthStore.me()?.avatar ?? '/avatar.webp'} alt='My avatar' />
          <span class={s.title}>{AuthStore.me()?.username ?? 'Anonymous'}</span>
        </A>
      </div>
    </div>
  );
};

export default Sidebar;
