import { createEffect, createRoot, untrack } from 'solid-js';

import {
  getThemes,
  studyAnswerEndpoint,
  studyQuestionEndpoint,
  studySubjectEndpoint,
  studyUserQuestionEndpoint,
  studyUserSubjectEndpoint,
} from '@/main/study/services/study.rest';
import { HOUR_MS, UUID } from '@/sky-utils';

import authStore from './auth.store';
import basicStore from './basic.store';
import { db } from './db';
import { handleError, RequestError } from './fetch';
import { atom, persistentAtom, useInterval } from './reactive';

export enum SYNC_STATUS {
  IDLE,
  ACTIONS,
  CACHE,
  SYNCHED,
  ERRORED,
}

export default createRoot(() => {
  // === Hooks ===
  useInterval(sync, HOUR_MS);

  // === State ===
  const cached = persistentAtom('cached', false);
  const progress = atom(0);
  const status = atom(SYNC_STATUS.IDLE);
  let syncId = 0;

  // === Effects ===
  createEffect(() => {
    basicStore.online();
    if (!authStore.loading() && authStore.me()) void sync();
  });

  // === Functions ===
  async function sync() {
    if (!untrack(basicStore.online)) {
      status(cached() ? SYNC_STATUS.SYNCHED : SYNC_STATUS.ERRORED);
      return;
    }
    try {
      syncId = UUID();
      const currentSyncId = syncId;
      const stopIfAborted = () => {
        if (currentSyncId !== syncId) throw new Error('STOP');
      };
      status(SYNC_STATUS.ACTIONS);
      cached(false);
      await syncOfflineTaskQueue({
        checkIfAborted: stopIfAborted,
        onProgress: progress,
      });
      status(SYNC_STATUS.CACHE);
      progress(0);
      await syncStudy({
        checkIfAborted: stopIfAborted,
        onProgress: progress,
      });
      cached(true);
      status(SYNC_STATUS.SYNCHED);
    } catch (e) {
      if (!(e instanceof Error) || e.message !== 'STOP') {
        status(SYNC_STATUS.ERRORED);
        console.error(e);
      }
    }
  }

  async function syncOfflineTaskQueue(options: {
    checkIfAborted: () => void;
    onProgress: (p: number) => unknown;
  }) {
    const endpoints = [
      studySubjectEndpoint,
      studyQuestionEndpoint,
      studyAnswerEndpoint,
      studyUserSubjectEndpoint,
      studyUserQuestionEndpoint,
    ];
    const endpointsMap = new Map(endpoints.map((x) => [x.idb as string, x]));
    const keys = await db.getAllKeys('offlineTasksQueue');
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]!;
      options.checkIfAborted();
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
        const req = (await db.get('offlineTasksQueue', key)) as any;
        const [, idb, action] = key.split('_') as [string, string, string];
        const endpoint = endpointsMap.get(idb);
        if (endpoint) {
          switch (action) {
            case 'create':
              // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
              await new endpoint.builder(req).create();
              break;
            case 'update':
              // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
              await new endpoint.builder(req).update();
              break;
            case 'delete':
              await endpoint.delete(req as number, {
                ignoreDB: true,
              });
              break;
          }
        }
      } catch (e) {
        if (!(e instanceof RequestError) || e.code === 0) {
          handleError(e);
          throw e;
        }
      } finally {
        await db.delete('offlineTasksQueue', key);
        options.onProgress(i / key.length);
      }
    }
  }

  async function syncStudy(options: {
    checkIfAborted: () => void;
    onProgress: (p: number) => unknown;
  }) {
    // Will cache single query
    if (!document.location.pathname.startsWith('/study')) await getThemes();
    const endpoints = [
      studySubjectEndpoint,
      studyQuestionEndpoint,
      studyUserSubjectEndpoint,
      studyUserQuestionEndpoint,
      studyAnswerEndpoint,
    ];
    let i = 0;
    const onProgress = (p: number) =>
      options.onProgress((i + p) / endpoints.length);
    for (; i < endpoints.length; i++)
      await endpoints[i]!.syncIDB({
        checkIfAborted: options.checkIfAborted,
        onProgress,
      });
  }

  return {
    progress,
    status,
    sync,
    cached,
  };
});
