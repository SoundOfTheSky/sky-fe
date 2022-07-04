import { Component, Show } from 'solid-js';

import { Transition } from 'solid-transition-group';
import BasicStore from '@/services/basic.store';
import { opacityTransition } from '@/services/transition';

import s from './page-loading.module.scss';

const PageLoading: Component = () => {
  const { defferedIsRequesting } = BasicStore;

  return (
    <Transition {...opacityTransition}>
      <Show when={defferedIsRequesting()}>
        <div class={s.pageLoadingComponent} />
      </Show>
    </Transition>
  );
};
export default PageLoading;
