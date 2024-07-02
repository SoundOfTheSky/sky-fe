import { toString as fromatCron } from 'cronstrue';
import { ParentComponent, createContext, createEffect, createMemo, untrack, useContext } from 'solid-js';

import authStore from '@/services/auth.store';
import { updateDBEntity } from '@/services/db';
import { atom } from '@/services/reactive';
import { DAY_MS, formatTime } from '@/services/utils';

export enum PlanEventStatus {
  DEFAULT = 0,
  SUCCESS = 1,
  FAILURE = 2,
  SKIP = 3,
}
export type PlanEvent = {
  id: number;
  created: string;
  updated: string;
  title: string;
  start: number; // unix minutes
  duration: number; // Minutes
  userId: number;
  status: PlanEventStatus;
  repeat?: string; // cron
  description?: string;
  parentId?: number;
  date?: Date;
  readableRepeat?: string;
};

export function getNextCron(cronString: string, datetime = new Date()) {
  const cron = cronString.split(' ');
  if (cron.length !== 5) throw new Error('Only 5 cron params supported');
  const dt = new Date(datetime);
  dt.setSeconds(0, 0);
  const items = [
    [
      parseCronItem(cron[4], 0, 6),
      dt.getDay.bind(dt),
      (x: number) => dt.setDate(dt.getDate() + (dt.getDay() < x ? x - dt.getDay() : 7 - dt.getDay() + x)),
    ],
    [parseCronItem(cron[3], 1, 12), () => dt.getMonth() + 1, (x: number) => dt.setMonth(x - 1)],
    [parseCronItem(cron[2], 1, 31), dt.getDate.bind(dt), dt.setDate.bind(dt)],
    [parseCronItem(cron[1], 0, 23), dt.getHours.bind(dt), dt.setHours.bind(dt)],
    [parseCronItem(cron[0], 0, 59), dt.getMinutes.bind(dt), dt.setMinutes.bind(dt)],
  ] as const;
  function r() {
    for (let i = 0; i < items.length; i++) {
      const [ok, getN, setN] = items[i];
      const n = getN();
      // If OK continue
      if (ok.includes(n)) continue;
      // If not ok, change every possible lower value lowest ok
      for (let i2 = i === 0 ? 3 : i + 1; i2 < items.length; i2++) {
        const [ok, , setN] = items[i2];
        setN(ok[0]);
      }
      const found = ok.find((x) => x > n);
      if (found) setN(found);
      else {
        // Set lowest value, increase item before and recheck everything
        setN(ok[0]);
        if (i > 1) {
          const [, getN, setN] = items[i - 1];
          setN(getN() + 1);
          r();
        }
        break;
      }
    }
  }
  r();
  return dt;
}
// eslint-disable-next-line sonarjs/cognitive-complexity
export function parseCronItem(cronString: string, min: number, max: number): number[] {
  const cron = cronString.split(',');
  const ok = new Set<number>();
  const err = new Error(`Can\'t parse CRON string: ${cronString}`);
  for (const item of cron) {
    // If everything add every possible value and skip others
    if (item === '*') {
      for (let i = min; i <= max; i++) ok.add(i);
      break;
    }
    // If range
    let split = item.split('-');
    if (split.length === 2) {
      const a = Number.parseInt(split[0]);
      const b = Number.parseInt(split[1]);
      if (Number.isNaN(a) || Number.isNaN(b) || a < min || a > b || b > max) throw err;
      for (let i = a; i <= b; i++) ok.add(i);
      continue;
    }
    // If stepped
    split = item.split('/');
    if (split.length === 2) {
      const step = Number.parseInt(split[1]);
      if (Number.isNaN(step)) throw err;
      const items = parseCronItem(split[0], min, max);
      for (let i = 0; i < items.length; i += step) ok.add(items[i]);
      continue;
    }
    // If everything else failed check for simple number
    const n = Number.parseInt(item);
    if (Number.isNaN(n) || n < min || n > max) throw err;
    ok.add(n);
  }
  return [...ok].sort((a, b) => a - b);
}

function getProvided() {
  // === Hooks ===
  const { me } = authStore;

  // === State ===
  const today = atom(
    (() => {
      const t = new Date();
      t.setHours(0, 0, 0, 0);
      return t;
    })(),
  );
  const selectedDate = atom(
    (() => {
      const t = new Date();
      t.setHours(0, 0, 0, 0);
      return t;
    })(),
  );
  const cachingProgress = atom(0);
  const events = atom<PlanEvent[]>([
    {
      created: '',
      updated: '',
      duration: 30,
      id: 0,
      start: ~~(Date.now() / 60000) - 32,
      status: PlanEventStatus.DEFAULT,
      title: 'test',
      userId: 1,
      repeat: '0 14 * * 0,2,4',
      description: 'Tuesday, Thursday and Sunday\nPlease do this at 14:00\nblablabla',
    },
    {
      created: '',
      updated: '',
      duration: 30,
      id: 0,
      start: ~~(Date.now() / 60000) + 2,
      status: PlanEventStatus.DEFAULT,
      title: 'test 2',
      userId: 1,
      repeat: '2880',
    },
    {
      created: '',
      updated: '',
      duration: 30,
      id: 0,
      start: ~~(Date.now() / 60000) + 20,
      status: PlanEventStatus.DEFAULT,
      title: 'test 3',
      userId: 1,
    },
  ]);
  const daysRange = atom(0);

  // === Memos ===
  // eslint-disable-next-line sonarjs/cognitive-complexity
  const days = createMemo(() => {
    const curDate = new Date(selectedDate());
    const $daysRange = daysRange();
    curDate.setDate(curDate.getDate() - $daysRange);
    const days = [];
    const amountOfDays = $daysRange * 2 + 1;
    for (let i = 0; i < amountOfDays; i++) {
      days.push({
        date: new Date(curDate),
        events: [] as PlanEvent[],
        selected: $daysRange === i,
        today: today().getTime() === curDate.getTime(),
      });
      curDate.setDate(curDate.getDate() + 1);
    }
    for (const event of events()) {
      let date = new Date(event.start * 60000);
      if (!event.repeat) {
        const i = ~~((date.getTime() - days[0].date.getTime()) / DAY_MS);
        if (i >= 0 && i < amountOfDays) days[i].events.push({ ...event, date: new Date(event.start * 60000) });
        continue;
      }
      try {
        event.readableRepeat = fromatCron(event.repeat, {
          locale: navigator.language,
        });
      } catch {
        event.readableRepeat = `every ${formatTime(Number.parseInt(event.repeat) * 60000)}`;
      }
      while (true) {
        const i = ~~((date.getTime() - days[0].date.getTime()) / DAY_MS);
        if (i >= amountOfDays) break;
        if (i >= 0) days[i].events.push({ ...event, date });
        try {
          date = getNextCron(event.repeat, date > days[0].date ? new Date(date.getTime() + 60000) : days[0].date);
        } catch {
          date = new Date(date.getTime() + Number.parseInt(event.repeat) * 60000);
        }
      }
    }
    for (const day of days) day.events.sort((a, b) => a.date!.getTime() - b.date!.getTime());

    return days;
  });

  // === Effects ===
  createEffect(() => {
    const $me = untrack(me);
    if (authStore.ready() && $me && ($me.permissions.includes('admin') || $me.permissions.includes('planner')))
      void update();
  });

  // === Functions ===
  let updateCount = 0;
  async function update() {
    try {
      let lastUpdateTime = Date.now();
      const curUpdateCount = ++updateCount;
      cachingProgress(0.01);
      for await (const [, i, size] of updateDBEntity('/api/plan-events', 'planEvents')) {
        if (curUpdateCount !== updateCount) return;
        const t = Date.now();
        if (lastUpdateTime + 200 < t) {
          lastUpdateTime = t;
          cachingProgress(i / size);
        }
      }
      cachingProgress(1);
    } catch (e) {
      cachingProgress(0);
      console.error(e);
    }
  }

  return {
    today,
    update,
    days,
    events,
    cachingProgress,
    selectedDate,
    daysRange,
  };
}
const Context = createContext<ReturnType<typeof getProvided>>();
export const PlannerProvider: ParentComponent = (props) => (
  <Context.Provider value={getProvided()}>{props.children}</Context.Provider>
);
export const usePlanner = () => useContext(Context);
