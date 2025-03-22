import { Component, For, Index, Show } from 'solid-js'
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
          <Index each={modalsStore.notifications()}>
            {(notification) => (
              <button
                class={`${s.notification} ${['info', 'success', 'warning', 'error'][notification().severity ?? 0]}`}
                onClick={() => {
                  clickNotification(notification())
                }}
              >
                <div class={s.content}>{notification().title}</div>
                <Show when={notification().progress}>
                  <div
                    class={s.line}
                    style={{
                      transform: `scaleX(${notification().progress})`,
                    }}
                  />
                </Show>
                <Show when={!notification().progress && notification().timeout}>
                  <div
                    class={s.line}
                    use:onMounted={(element) =>
                      element.animate(
                        { transform: ['scaleX(0)', 'scaleX(1)'] },
                        notification().timeout,
                      )
                    }
                  />
                </Show>
              </button>
            )}
          </Index>
        </TransitionGroup>
      </div>
      <For each={modalsStore.dialogs()}>
        {(dialog) => (
          <Modal
            class={s.dialog}
            width={dialog.width}
            closed={dialog.closed()}
            onClose={
              dialog.onClose
                ? () => modalsStore.clickDialogButton(dialog)
                : undefined
            }
          >
            <h2>{dialog.title}</h2>
            <div class={s.buttons}>
              <For each={dialog.buttons}>
                {(button, index) => (
                  <button
                    onClick={() =>
                      modalsStore.clickDialogButton(dialog, index())
                    }
                    class={`${s.button} ${['info', 'success', 'warning', 'error'][button.severity ?? 0]}`}
                  >
                    {button.title}
                  </button>
                )}
              </For>
            </div>
          </Modal>
        )}
      </For>
    </>
  )
}

export default Notifications
