import { mdiCheck, mdiClose, mdiDebugStepOver, mdiProgressClock } from '@mdi/js';
import { Component, createEffect, createMemo, Show } from 'solid-js';

import Dialog from '@/components/dialog';
import Input from '@/components/form/input';
import Icon from '@/components/icon';
import Tooltip from '@/components/tooltip';
import { Atom, atom } from '@/services/reactive';
import { formatTime, MIN_MS } from '@/services/utils';

import { formatCron, getNextCron, PlanEvent, PlanEventStatus } from '../planner.context';

import s from './edit-event.module.scss';

const EditPlanEventDialog: Component<{ event: Atom<PlanEvent | undefined> }> = (properties) => {
  // === State ===
  const title = atom('');
  const description = atom('');
  const duration = atom('');
  const status = atom(PlanEventStatus.TODO);
  const repeat = atom('');
  const start = atom('');

  // === Memos ===
  const repeatDescription = createMemo(() => {
    const $repeat = repeat();
    if (!$repeat) return 'Repeat disabled';
    const n = !$repeat.includes(' ') && Number.parseInt($repeat);
    if (typeof n === 'number') {
      if (Number.isNaN(n)) return 'ERROR';
      return 'Every ' + formatTime(n * MIN_MS);
    }
    try {
      getNextCron($repeat);
      return formatCron($repeat);
    } catch (e) {
      return (e as Error).message;
    }
  });

  // === Effects ===
  createEffect(() => {
    const $e = properties.event();
    if (!$e) return;
    title($e.title);
    description($e.description);
    duration($e.duration + '');
    status($e.status);
    repeat($e.repeat ?? '');
  });

  return (
    <Show when={properties.event()}>
      <Dialog dark onClose={() => properties.event(undefined)}>
        <div class={s.editEvent}>
          <div class={s.field}>
            <div>Title:</div>
            <Input value={title} placeholder='Title' />
          </div>
          <div class={s.buttonLine}>
            <Tooltip content='To do'>
              <button
                onClick={() => status(PlanEventStatus.TODO)}
                classList={{
                  [s.active]: status() === PlanEventStatus.TODO,
                }}
              >
                <Icon path={mdiProgressClock} size='32' />
              </button>
            </Tooltip>
            <Tooltip content='Done'>
              <button
                onClick={() => status(PlanEventStatus.DONE)}
                classList={{
                  [s.active]: status() === PlanEventStatus.DONE,
                }}
              >
                <Icon path={mdiCheck} size='32' />
              </button>
            </Tooltip>
            <Tooltip content='Failed'>
              <button
                onClick={() => status(PlanEventStatus.FAILED)}
                classList={{
                  [s.active]: status() === PlanEventStatus.FAILED,
                }}
              >
                <Icon path={mdiClose} size='32' />
              </button>
            </Tooltip>
            <Tooltip content='Skipped'>
              <button
                onClick={() => status(PlanEventStatus.SKIPPED)}
                classList={{
                  [s.active]: status() === PlanEventStatus.SKIPPED,
                }}
              >
                <Icon path={mdiDebugStepOver} size='32' />
              </button>
            </Tooltip>
          </div>
          <div class={s.field}>
            <div>Start datetime:</div>
            <Input value={start} type='datetime-local' min={/*@once*/ new Date().toISOString().slice(0, -1)} />
          </div>
          <div class={s.field}>
            <div>Duration (minutes):</div>
            <Input value={duration} placeholder='Duration' type='number' min='15' max='1440' />
          </div>
          <div class={s.field}>
            <div>Repeat rules:</div>
            <Input value={repeat} placeholder='Repeat rules' />
            <div class={s.repeatDescription}>{repeatDescription()}</div>
          </div>
          <div class={s.field}>
            <div>Description:</div>
            <Input value={description} placeholder='Description' multiline />
          </div>
        </div>
      </Dialog>
    </Show>
  );
};
export default EditPlanEventDialog;
