import { openDB } from 'idb';

import { PlanEvent } from '@/main/plan/plan.context';
import { Question, Stat, Subject } from '@/main/study/services/study.context';

import { RequestOptions, request } from './fetch';

export type DBOptions = {
  keyval: {
    key: string;
    value: unknown;
  };
  offlineRequestQueue: {
    key: string;
    value: {
      url: string;
      options: RequestOptions;
    };
  };
  studySubjects: {
    key: number;
    value: Subject;
  };
  studyQuestions: {
    key: number;
    value: Question;
  };
  studyStats: {
    key: Date;
    value: Stat;
  };
  planEvents: {
    key: number;
    value: PlanEvent;
  };
};
export const db = await openDB<DBOptions>('skydb', 1, {
  upgrade(database) {
    database.createObjectStore('keyval');
    database.createObjectStore('offlineRequestQueue', {
      autoIncrement: true,
    });
    database.createObjectStore('studySubjects', {
      keyPath: 'id',
    });
    database.createObjectStore('studyQuestions', {
      keyPath: 'id',
    });
    database.createObjectStore('planEvents', {
      keyPath: 'id',
    });
    database.createObjectStore('studyStats', {
      keyPath: 'created',
    });
  },
});
/**
 * Verifies and updates cache. If offline only validates
 * !!!Works as generator so you must iterate through it to complete update!!!
 * required must be passed ALL needed ids.
 */
export async function* updateDBEntity<T extends 'studySubjects' | 'studyQuestions' | 'planEvents'>(
  url: string,
  type: T,
  required?: Set<number>,
): AsyncIterable<[DBOptions[T]['value'], number, number]> {
  const lastUpdateKey = 'lastUpdate_' + type;
  const lastUpdate = ((await db.get('keyval', lastUpdateKey)) as number) ?? 0;
  const updated = await request<string>(`${url}/updated/${lastUpdate}`)
    .then((str) => new Map(str.split('\n').map((x) => x.split(',').map((x) => Number.parseInt(x)) as [number, number])))
    .catch(() => new Map<number, number>());
  let maxTime = 0;
  if (!required) required = new Set([...(await db.getAllKeys(type)), ...updated.keys()]);
  const size = required.size;
  let i = 0;
  for (const id of required) {
    let item = (await db.get(type, id)) as DBOptions[T]['value'];
    const DBupdatedTime = updated.get(id);
    let updatedTime = item ? ~~(new Date(item.updated).getTime() / 1000) : undefined;
    if (item && (!DBupdatedTime || updatedTime! >= DBupdatedTime)) yield [item, i, size];
    else {
      item = await request<DBOptions[T]['value']>(`${url}/${id}`);
      await db.put(type, item);
      updatedTime = ~~(new Date(item.updated).getTime() / 1000);
      yield [item, i, size];
    }
    if (updatedTime! > maxTime) maxTime = updatedTime!;
    i++;
  }
  await db.put('keyval', maxTime, lastUpdateKey);
  let keyCursor = await db.transaction(type, 'readwrite').store.openCursor();
  while (keyCursor) {
    if (!required.has(keyCursor.primaryKey)) await keyCursor.delete();
    keyCursor = await keyCursor.continue();
  }
}
