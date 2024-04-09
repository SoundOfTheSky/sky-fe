import { openDB } from 'idb';

import { Question, Stat, Subject } from '@/main/study/services/study.context';

import { RequestOptions } from './fetch';

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
};
const db = await openDB<DBOptions>('skydb', 1, {
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
    database.createObjectStore('studyStats', {
      keyPath: 'created',
    });
  },
});
export default db;
