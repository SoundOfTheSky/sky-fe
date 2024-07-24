import { For, Show, createMemo } from 'solid-js';

import Tooltip from '@/components/tooltip';
import { atom, useInterval } from '@/services/reactive';
import { MIN_MS } from '@/services/utils';

import { PlanEvent, usePlanner } from '../planner.context';

import EditPlanEventDialog from './edit-event';

import s from './timeline.module.scss';

const eventTypeClasses = [s.default, s.success, s.failure, s.skip];

export default function Timeline() {
  // === Hooks ===
  const { days } = usePlanner()!;
  useInterval(() => {
    minToday(getMinSinceDayStart(new Date()));
  }, MIN_MS);

  // === State ===
  const minToday = atom(getMinSinceDayStart(new Date()));
  const selectedEvent = atom<PlanEvent>();

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
    return ~~((time - now.getTime()) / MIN_MS);
  }
  return (
    <div class={s.timeline}>
      <EditPlanEventDialog event={selectedEvent} />
      <For each={timeline().timeline}>
        {(event, i) => (
          <>
            <Show when={typeof event === 'number' && event > 0}>
              <div class={s.freetime}>
                <Tooltip content='Free time'>
                  <div class={s.title}>
                    {(~~((event as number) / 60)).toString().padStart(2, '0')}:
                    {((event as number) % 60).toString().padStart(2, '0')}
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
              <button
                class={`${s.event} ${eventTypeClasses[(event as PlanEvent).status]}`}
                onClick={() => selectedEvent(event as PlanEvent)}
              >
                <div class={s.title}>
                  <div>{(event as PlanEvent).title}</div>
                  <div>
                    {(event as PlanEvent).date!.toLocaleString(navigator.language, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <div class={s.description}>{(event as PlanEvent).description}</div>
                <div class={s.sub}>
                  <Tooltip content='Duration'>
                    <div>{(event as PlanEvent).duration} min</div>
                  </Tooltip>
                  <Tooltip content='Repeat rules'>
                    <div>{(event as PlanEvent).readableRepeat}</div>
                  </Tooltip>
                </div>
                <Show when={i() === ~~timeline().progress}>
                  <div
                    class={s.progress}
                    style={{
                      top: `${(timeline().progress % 1) * 100}%`,
                    }}
                  />
                </Show>
              </button>
            </Show>
          </>
        )}
      </For>
    </div>
  );
}
