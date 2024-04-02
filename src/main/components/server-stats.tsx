import { mdiAccount, mdiAccountBadge, mdiStar } from '@mdi/js';
import { Component, For, createEffect, createMemo, onCleanup } from 'solid-js';

import Icon from '@/components/icon';
import Skeleton from '@/components/loading/skeleton';
import Tooltip from '@/components/tooltip';
import { atom } from '@/services/reactive';
import { WebSocketStatus, useWebSocket } from '@/services/web-socket.context';

import s from './server-stats.module.scss';

export default (() => {
  // === Hooks ===
  const ws = useWebSocket()!;

  onCleanup(() => {
    if (ws.status() === WebSocketStatus.connected) ws.send('unsubscribeServerStats');
  });

  // === State ===
  const serverStats = atom(['', '', '']);
  const loading = atom(true);

  // === Memos ===
  const fields = createMemo(() => {
    const $serverStats = serverStats();
    return [
      ['Unique visitors', mdiStar, $serverStats[0]],
      ['Visits', mdiAccount, $serverStats[1]],
      ['Online', mdiAccountBadge, $serverStats[2]],
    ] as const;
  });

  // === Effects ===
  // WebSocket status handler
  createEffect(() => {
    switch (ws.status()) {
      case WebSocketStatus.connecting:
        loading(true);
        break;
      case WebSocketStatus.connected:
        ws.send('subscribeServerStats');
        break;
    }
  });
  // WebSocket event handler
  createEffect(() => {
    const [event, data] = ws.lastEvent();
    if (event === 'serverStats' && data) {
      loading(false);
      serverStats(data.split('|'));
    }
  });

  return (
    <Skeleton loading={loading()} offline={ws.status() === WebSocketStatus.closed} class={`card ${s.serverStats}`}>
      <div class='card-title'>Online stats</div>
      <div class={s.fields}>
        <For each={fields()}>
          {([title, icon, val]) => (
            <Tooltip content={title}>
              <div class={s.field}>
                <Icon path={icon} inline size='24' />
                <span class={s.counter}>
                  <span>{val}</span>
                  <span>888888888</span>
                </span>
              </div>
            </Tooltip>
          )}
        </For>
      </div>
    </Skeleton>
  );
}) as Component;
