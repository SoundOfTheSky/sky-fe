import { For, Show } from 'solid-js';

import { usePlanner } from '../planner.context';

import s from './calendar.module.scss';

export default function Calendar() {
  // === Hooks ===
  const { days, selectedDate, daysRange } = usePlanner()!;

  // === Functions ===
  function updateRangeOutOfElement(el: HTMLDivElement) {
    setTimeout(() => {
      daysRange(~~((el.clientWidth - 32) / 216));
    }, 0);
  }
  return (
    <div class={`card ${s.calendar}`} ref={updateRangeOutOfElement}>
      <For each={days()}>
        {(day) => (
          <button
            class={s.day}
            classList={{
              [s.active]: day.selected,
              [s.today]: day.today,
            }}
            onClick={() => selectedDate(new Date(day.date))}
          >
            <div class={s.month}>
              {day.date.toLocaleString(navigator.language, {
                month: 'short',
              })}
            </div>
            <div class={s.date}>{day.date.getDate()}</div>
            <div class={s.weekday}>
              {day.date.toLocaleString(navigator.language, {
                weekday: 'short',
              })}
            </div>
            <Show when={day.events.length !== 0}>
              <div class={s.events}>{day.events.length}</div>
            </Show>
          </button>
        )}
      </For>
    </div>
  );
}
