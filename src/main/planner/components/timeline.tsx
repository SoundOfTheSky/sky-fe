import { mdiClock } from '@mdi/js';
import { For, Show, createMemo } from 'solid-js';

import Icon from '@/components/icon';
import Tooltip from '@/components/tooltip';
import { atom, debugReactive, useInterval } from '@/services/reactive';

import { PlanEvent, usePlanner } from '../planner.context';

import s from './timeline.module.scss';

export default function Timeline() {
  // === Hooks ===
  const { days } = usePlanner()!;
  useInterval(() => {
    minToday(getMinSinceDayStart(new Date()));
  }, 60000);

  // === State ===
  const minToday = atom(getMinSinceDayStart(new Date()));

  // === Memos ===
  const day = createMemo(() => days().find((x) => x.selected)!);
  const timeline = createMemo(() => {
    const $day = day();
    const $minToday = minToday();
    const timeline: (PlanEvent | number)[] = [];
    let lastTime = 0;
    let progress = 0;
    for (let i = 0; i < $day.events.length; i++) {
      const event = $day.events[i];
      const eventMin = getMinSinceDayStart(event.date!);
      const free = eventMin - lastTime;
      if ($minToday >= eventMin) progress = ($minToday - eventMin) / event.duration + i * 2 + 1;
      else if ($minToday >= lastTime) progress = ($minToday - lastTime) / free + i * 2;
      timeline.push(free, event);
      lastTime = eventMin + event.duration;
    }
    return { timeline, progress };
  });

  // === Functions ===
  function getMinSinceDayStart(date: Date) {
    const now = new Date(date);
    const time = now.getTime();
    now.setHours(0, 0, 0, 0);
    return ~~((time - now.getTime()) / 60000);
  }

  debugReactive({ timeline });
  return (
    <div class={s.timeline}>
      <For each={timeline().timeline}>
        {(event, i) => (
          <>
            <Show when={typeof event === 'number' && event > 0}>
              <div class={s.freetime}>
                <Tooltip content='Free time'>
                  <div class={s.title}>
                    {(~~((event as number) / 60)).toString().padStart(2, '0')}:
                    {((event as number) % 60).toString().padStart(2, '0')}
                    <Icon path={mdiClock} size='32' />
                  </div>
                </Tooltip>
                <Show when={i() === ~~timeline().progress}>
                  <div
                    class={s.progress}
                    style={{
                      top: `${(timeline().progress % 1) * 100}%`,
                    }}
                  />
                </Show>
              </div>
            </Show>
            <Show when={typeof event !== 'number'}>
              <div class={s.event}>
                <div class={s.title}>
                  <div>{(event as PlanEvent).title}</div>
                  <Tooltip content='Duration'>
                    <div>
                      {(event as PlanEvent).duration}
                      <Icon path={mdiClock} size='24' />
                    </div>
                  </Tooltip>
                </div>
                <div class={s.description}>{(event as PlanEvent).description}</div>
                <div class={s.sub}>
                  <div>
                    {(event as PlanEvent).date!.toLocaleString(navigator.language, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  <div>{(event as PlanEvent).readableRepeat}</div>
                </div>
                <Show when={i() === ~~timeline().progress}>
                  <div
                    class={s.progress}
                    style={{
                      top: `${(timeline().progress % 1) * 100}%`,
                    }}
                  />
                </Show>
              </div>
            </Show>
          </>
        )}
      </For>
    </div>
  );
}
