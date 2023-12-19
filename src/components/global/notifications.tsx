import { Component, For, Show } from 'solid-js';
import { TransitionGroup } from 'solid-transition-group';

import BasicStore, { Notification } from '@/services/basic.store';
import { onMounted } from '@/services/reactive';
import { slideInTransition } from '@/services/transition';
import Button from '../form/button';

import s from './notifications.module.scss';
onMounted;

const Notifications: Component = () => {
  const { notifications, removeNotification } = BasicStore;
  function clickNotification(notification: Notification) {
    notification.onClick?.();
    removeNotification(notification.id);
  }
  return (
    <div class={s.notificationsComponent}>
      <TransitionGroup {...slideInTransition}>
        <For each={notifications()}>
          {(notification) => (
            <Button
              class={`${s.notification} ${[s.info, s.success, s.warning, s.error][notification.type]}`}
              onClick={() => clickNotification(notification)}
            >
              <div class={s.content}>{notification.title}</div>
              <Show when={notification.timeout}>
                <div
                  class={s.line}
                  use:onMounted={(el) => el.animate({ transform: ['scaleX(0)', 'scaleX(1)'] }, notification.timeout)}
                />
              </Show>
            </Button>
          )}
        </For>
      </TransitionGroup>
    </div>
  );
};

export default Notifications;
