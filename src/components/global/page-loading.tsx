import { Component, Match, Switch } from 'solid-js';
import { Transition } from 'solid-transition-group';

import BasicStore from '@/services/basic.store';
import { createTransitionOptions } from '@/services/transition';

import s from './page-loading.module.scss';

const transition = createTransitionOptions(
  {
    maxHeight: ['0px', '24px'],
  },
  500,
);

const PageLoading: Component = () => {
  const { loading, online } = BasicStore;

  return (
    <Transition {...transition}>
      <Switch>
        <Match when={!online()}>
          <div class={s.offline}>Offline</div>
        </Match>
        <Match when={loading()}>
          <div class={s.pageLoadingComponent} />
        </Match>
      </Switch>
    </Transition>
  );
};
export default PageLoading;
