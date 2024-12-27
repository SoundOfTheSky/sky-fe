import { mdiInformation } from '@mdi/js'
import { Component, Match, Switch } from 'solid-js'
import { Transition } from 'solid-transition-group'

import BasicStore from '@/services/basic.store'
import SyncStore, { SYNC_STATUS } from '@/services/sync.store'
import { createTransitionOptions } from '@/services/transition'

import Icon from '../icon'
import Tooltip from '../tooltip'

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
        <Match when={SyncStore.status() === SYNC_STATUS.ACTIONS}>
          <div class={s.progress}>
            <div
              class={s.bar}
              style={{
                transform: `scaleX(${SyncStore.progress()})`,
              }}
            />
            {t('PAGE_STATUS.ACTIONS')}
            :
            {' '}
            {~~(SyncStore.progress() * 100)}
            %
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
            {t('PAGE_STATUS.CACHING')}
            :
            {' '}
            {~~(SyncStore.progress() * 100)}
            %
            <Tooltip content={t('PAGE_STATUS.CACHING_INFO')}>
              <Icon path={mdiInformation} class="ml-1" />
            </Tooltip>
          </div>
        </Match>
        <Match when={SyncStore.status() === SYNC_STATUS.ERRORED}>
          <div class={s.offline}>{t('PAGE_STATUS.ERROR')}</div>
        </Match>
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
