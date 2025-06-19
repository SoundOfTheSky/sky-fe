import { Component, Match, Switch } from 'solid-js'
import { Transition } from 'solid-transition-group'

import BasicStore from '@/services/basic.store'
import { createTransitionOptions } from '@/services/transition'

import s from './page-status.module.scss'

const { loading, online, t } = BasicStore

const transition = createTransitionOptions(
  {
    maxHeight: ['0px', '24px'],
  },
  200,
)

const PageStatus: Component = () => {
  return (
    <Transition {...transition}>
      <Switch>
        <Match when={!online()}>
          <div class={s.offline}>{t('PAGE_STATUS.OFFLINE')}</div>
        </Match>
        <Match when={loading()}>
          <div class={s.loading} />
        </Match>
      </Switch>
    </Transition>
  )
}
export default PageStatus
