import { For } from 'solid-js';
import type { Component } from 'solid-js';
import { A } from '@solidjs/router';
import { mdiHome, mdiBookOpenPageVariant } from '@mdi/js';

import Skeleton from '@/components/loading/skeleton';
import AuthStore from '@/services/auth.store';
import Icon from '../icon';

import s from './sidebar.module.scss';

const items = [
  {
    icon: mdiHome,
    title: 'Overview',
    link: '/',
  },
  {
    icon: mdiBookOpenPageVariant,
    title: 'Study Japanese',
    link: '/study',
  },
] as const;
const Sidebar: Component = () => {
  return (
    <div class={s.sidebarComponent}>
      <h1>Dashboard</h1>
      <div class={s.menu}>
        <For each={items}>
          {(item) => (
            <A class={s.item} href={item.link} activeClass={s.active}>
              <Icon path={item.icon} size='32' />
              <span class={s.title}>{item.title}</span>
            </A>
          )}
        </For>
        <A class={`${s.item} ${s.profile}`} href='/profile' activeClass={s.active}>
          <Skeleton
            loading={AuthStore.loading()}
            schema={
              <div>
                <div class={`${s.avatar} skeleton`} />
                <div class={`${s.title} skeleton`} />
              </div>
            }
          >
            <img class={s.avatar} src={AuthStore.user()?.avatar ?? '/avatar.webp'} alt='My avatar' />
            <span class={s.title}>{AuthStore.user()?.username ?? 'Anonymous'}</span>
          </Skeleton>
        </A>
      </div>
    </div>
  );
};

export default Sidebar;
