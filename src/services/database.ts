import { openDB } from 'idb'

import {
  StudyAnswer,
  StudyQuestion,
  StudySubject,
  StudyUserQuestion,
  StudyUserSubject,
} from '@/sky-shared/study'

export type DBOptions = {
  keyval: {
    key: string
    value: unknown
  }
  offlineTasksQueue: {
    key: string
    value: unknown
  }

  studySubjects: {
    key: number
    value: StudySubject
  }
  studyQuestions: {
    key: number
    value: StudyQuestion
  }
  studyAnswers: {
    key: number
    value: StudyAnswer
  }
  studyUserSubjects: {
    key: number
    value: StudyUserSubject
  }
  studyUserQuestions: {
    key: number
    value: StudyUserQuestion
  }
}
export const database = await openDB<DBOptions>('skydb', 1, {
  upgrade(database) {
    for (const store of database.objectStoreNames)
      database.deleteObjectStore(store)
    database.createObjectStore('keyval')
    database.createObjectStore('offlineTasksQueue', {
      autoIncrement: true,
    })

    for (const name of [
      'studySubjects',
      'studyQuestions',
      'studyAnswers',
      'studyUserSubjects',
      'studyUserQuestions',
    ] as const)
      database.createObjectStore(name, {
        keyPath: 'id',
      })
  },
})
