import { Component, For, createMemo, onCleanup } from 'solid-js';
import * as webSocket from '@/services/web-socket';
import { atom } from '@/services/reactive';

import s from './server-stats.module.scss';

export default (() => {
  // === State ===
  const serverStats = atom(['', '', '']);

  // === Memos ===
  const fields = createMemo(() => {
    const serverStats$ = serverStats();
    return [
      ['Unique visitors', serverStats$[0]],
      ['Visits', serverStats$[1]],
      ['Online', serverStats$[2]],
    ];
  });

  // === Functions ===
  function subscribe() {
    webSocket.send('subscribeServerStats');
  }
  function onData(data?: string) {
    if (!data) return;
    serverStats(data.split('|'));
  }

  // === Hooks ===
  if (webSocket.status === webSocket.WebSocketStatus.connected) subscribe();
  webSocket.on('connected', subscribe);
  webSocket.on('serverStats', onData);
  onCleanup(() => {
    webSocket.send(`unsubscribeServerStats`);
    webSocket.off('connected', subscribe);
    webSocket.off('serverStats', onData);
  });

  return (
    <div class={`card ${s.serverStats}`}>
      <div class='card-title'>Online stats</div>
      <For each={fields()}>
        {([key, val]) => (
          <div>
            {key}:
            <div class={s.counter}>
              <div>{val}</div>
              <div>888888888</div>
            </div>
          </div>
        )}
      </For>
    </div>
  );
}) as Component;
