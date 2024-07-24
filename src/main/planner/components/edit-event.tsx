import { Component, createEffect, Show } from 'solid-js';

import Dialog from '@/components/dialog';
import Button from '@/components/form/button';
import Input from '@/components/form/input';
import { Atom, atom } from '@/services/reactive';

import { PlanEvent, PlanEventStatus } from '../planner.context';

import s from './edit-event.module.scss';

const EditPlanEventDialog: Component<{ event: Atom<PlanEvent | undefined> }> = (properties) => {
  // === State ===
  const title = atom('');
  const description = atom('');
  const duration = atom('');
  const status = atom(PlanEventStatus.DEFAULT);

  // === Effects ===
  createEffect(() => {
    const $e = properties.event();
    if (!$e) return;
    title($e.title);
    description($e.description);
    duration($e.duration + '');
    status($e.status);
  });

  return (
    <Show when={properties.event()}>
      <Dialog dark onClose={() => properties.event(undefined)}>
        <div class={s.editEvent}>
          <div class={s.field}>
            <div>Title:</div>
            <Input value={title} placeholder='Title' />
          </div>
          <div class={s.field}>
            <div>Description:</div>
            <Input value={description} placeholder='Description' />
          </div>
          <div class={s.field}>
            <div>Duration (minutes):</div>
            <Input value={duration} placeholder='Duration' />
          </div>
          <div class={s.statuses}>
            <Button
              onClick={() => status(PlanEventStatus.DEFAULT)}
              classList={{
                [s.active]: status() === PlanEventStatus.DEFAULT,
              }}
            >
              Default
            </Button>
            <Button
              onClick={() => status(PlanEventStatus.SUCCESS)}
              classList={{
                [s.active]: status() === PlanEventStatus.SUCCESS,
              }}
            >
              Success
            </Button>
            <Button
              onClick={() => status(PlanEventStatus.FAILURE)}
              classList={{
                [s.active]: status() === PlanEventStatus.FAILURE,
              }}
            >
              Failed
            </Button>
            <Button
              onClick={() => status(PlanEventStatus.SKIP)}
              classList={{
                [s.active]: status() === PlanEventStatus.SKIP,
              }}
            >
              Skipped
            </Button>
          </div>
        </div>
      </Dialog>
    </Show>
  );
};
export default EditPlanEventDialog;
