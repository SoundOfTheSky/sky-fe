import { Component, For, Show } from 'solid-js'
import { TransitionGroup } from 'solid-transition-group'

import { modalsStore, Notification } from '@/services/modals.store'
import { onMounted } from '@/services/reactive'
import { slideInTransition } from '@/services/transition'

import Modal from '../modal'

import s from './modals.module.scss'

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
onMounted

const Notifications: Component = () => {
  function clickNotification(notification: Notification) {
    notification.onClick?.()
    modalsStore.removeNotification(notification.id)
  }

  return (
    <>
      <div class={s.notifications}>
        <TransitionGroup {...slideInTransition}>
          <For each={modalsStore.notifications()}>
            {notification => (
              <button
                class={`${s.notification} ${[s.info, s.success, s.warning, s.error][notification.severity ?? 0]}`}
                onClick={() => {
                  clickNotification(notification)
                }}
              >
                <div class={s.content}>{notification.title}</div>
                <Show when={notification.timeout}>
                  <div
                    class={s.line}
                    use:onMounted={element =>
                      element.animate(
                        { transform: ['scaleX(0)', 'scaleX(1)'] },
                        notification.timeout,
                      )}
                  />
                </Show>
              </button>
            )}
          </For>
        </TransitionGroup>
      </div>
      <div class={s.dialogs}>
        <For each={modalsStore.dialogs()}>
          {dialog => (
            <Modal>
              <h2>{dialog.title}</h2>
              <div class={s.buttons}>
                <For each={dialog.buttons}>
                  {(button, index) => (
                    <button
                      onClick={() => modalsStore.clickDialogButton(dialog, index())}
                      class={`${s.button} ${[s.info, s.success, s.warning, s.error][button.severity ?? 0]}`}
                    >
                      {button.title}
                    </button>
                  )}
                </For>
              </div>
            </Modal>
          )}
        </For>
      </div>
    </>
  )
}

export default Notifications
