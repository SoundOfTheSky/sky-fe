import { Component, Match, Switch } from 'solid-js';
import { Transition } from 'solid-transition-group';

import BasicStore from '@/services/basic.store';
import SyncStore, { SYNC_STATUS } from '@/services/sync.store';
import { createTransitionOptions } from '@/services/transition';

import s from './page-status.module.scss';

const transition = createTransitionOptions(
  {
    maxHeight: ['0px', '24px'],
  },
  200,
);

const PageStatus: Component = () => {
  const { loading, online } = BasicStore;

  return (
    <Transition {...transition}>
      <Switch>
        <Match when={SyncStore.status() === SYNC_STATUS.ACTIONS}>
          <div class={s.progress}>
            <div
              class={s.bar}
              style={{
                transform: `scaleX(${SyncStore.progress()})`,
              }}
            />
            Sync: {~~(SyncStore.progress() * 100)}%
          </div>
        </Match>
        <Match when={SyncStore.status() === SYNC_STATUS.CACHE}>
          <div class={s.progress}>
            <div
              class={s.bar}
              style={{
                transform: `scaleX(${SyncStore.progress()})`,
              }}
            />
            Caching: {~~(SyncStore.progress() * 100)}%
          </div>
        </Match>
        <Match when={SyncStore.status() === SYNC_STATUS.ERRORED}>
          <div class={s.offline}>SYNC ERROR</div>
        </Match>
        <Match when={!online()}>
          <div class={s.offline}>Offline</div>
        </Match>
        <Match when={loading()}>
          <div class={s.loading} />
        </Match>
      </Switch>
    </Transition>
  );
};
export default PageStatus;
