import { createMemo, onMount } from 'solid-js';

import { atom, useInterval } from '@/services/reactive';

import { PlanEvent, PlanEventStatus } from './plan.context';

import s from './plan.module.scss';

export default function PlanTab() {
  // === Hooks ===
  document.title = 'Sky | Plan';
  onMount(() => {
    updateTime();
  });
  useInterval(updateTime, 60000);

  // === State ===
  const today = atom(new Date());
  const time = atom(new Date());

  // === Memos ===
  const events = atom<PlanEvent[]>([
    {
      created: '',
      updated: '',
      duration: 30,
      id: 0,
      start: ~~(Date.now() / 60000),
      status: PlanEventStatus.DEFAULT,
      title: 'test',
      userId: 1,
      repeat: '0 14 * * 0,2,4',
    },
  ]);
  const days = createMemo(() => {
    const $time = time();
    const days = [];
    for (let i = 0; i < 7; i++) {
      const t = new Date($time.getTime() + 86400000);
      days.push({
        title: t.toLocaleDateString(),
        weekday: t.toLocaleString(window.navigator.language, {
          weekday: 'long',
        }),
        events: [],
      });
    }
    return days;
  });

  // === Functions ===
  function updateTime() {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    today(new Date(t));
    t.setDate(t.getDate() - t.getDay());
    time(t);
  }

  return (
    <div class='card-container'>
      <div class={`card ${s.planCard}`}>
        <div class={s.timeline} />
      </div>
    </div>
  );
}
