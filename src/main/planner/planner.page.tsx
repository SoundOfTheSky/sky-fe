import { onMount } from 'solid-js';

import Calendar from './components/calendar';
import Timeline from './components/timeline';
import { usePlanner } from './planner.context';

import s from './planner.module.scss';

export default function PlanTab() {
  // === Hooks ===
  const {} = usePlanner()!;
  onMount(() => {
    document.title = 'Sky | Planner';
  });

  return (
    <div class={`card-container ${s.planner}`}>
      <Calendar />
      <Timeline />
    </div>
  );
}
