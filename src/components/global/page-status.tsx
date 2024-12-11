import { mdiInformation } from '@mdi/js'
import { Component, Match, Switch } from 'solid-js'
import { Transition } from 'solid-transition-group'

import BasicStore from '@/services/basic.store'
import SyncStore, { SYNC_STATUS } from '@/services/sync.store'
import { createTransitionOptions } from '@/services/transition'

import Icon from '../icon'
import Tooltip from '../tooltip'

import s from './page-status.module.scss'

const transition = createTransitionOptions(
  {
    maxHeight: ['0px', '24px'],
  },
  200,
)

const PageStatus: Component = () => {
  const { loading, online } = BasicStore

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
            Загрузка изменений:
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
            Кэширование:
            {' '}
            {~~(SyncStore.progress() * 100)}
            %
            <Tooltip content="Вы можете не дожидаться окончания синхронизации. При закрытии прогресс сохраняется. Синхронизация нужна только для оффлайн доступа к сайту.">
              <Icon path={mdiInformation} class="ml-1" />
            </Tooltip>
          </div>
        </Match>
        <Match when={SyncStore.status() === SYNC_STATUS.ERRORED}>
          <div class={s.offline}>Ошибка синхронизации</div>
        </Match>
        <Match when={!online()}>
          <div class={s.offline}>Оффлайн</div>
        </Match>
        <Match when={loading()}>
          <div class={s.loading} />
        </Match>
      </Switch>
    </Transition>
  )
}
export default PageStatus
