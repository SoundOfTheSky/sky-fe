import { noop } from '@softsky/utils'
import { untrack } from 'solid-js'

import basicStore from '@/services/basic.store'
import { database } from '@/services/database'
import { request } from '@/services/fetch'
import {
    RESTEndpointIDB,
    RESTItemIDB,
    RESTItemIDBRequestOptions,
} from '@/services/rest'
import {
    srs,
    StudyAnswer,
    StudyAnswerT,
    StudyEnabledTheme,
    StudyQuestion,
    StudyQuestionT,
    StudySubject,
    StudySubjectT,
    StudyTheme,
    StudyUserQuestion,
    StudyUserQuestionT,
    StudyUserSubject,
    StudyUserSubjectT,
} from '@/sky-shared/study'

export class RESTStudySubject extends RESTItemIDB<StudySubject> {
  public constructor(data: StudySubject) {
    super(data)
    this.endpoint = studySubjectEndpoint
  }
}

export const studySubjectEndpoint = new RESTEndpointIDB<
  StudySubject,
  RESTStudySubject
>('/api/study/subjects', RESTStudySubject, StudySubjectT, 'studySubjects')

export class RESTStudyQuestion extends RESTItemIDB<StudyQuestion> {
  public constructor(data: StudyQuestion) {
    super(data)
    this.endpoint = studyQuestionEndpoint
  }
}

export const studyQuestionEndpoint = new RESTEndpointIDB<
  StudyQuestion,
  RESTStudyQuestion
>('/api/study/questions', RESTStudyQuestion, StudyQuestionT, 'studyQuestions')

export class RESTStudyAnswer extends RESTItemIDB<StudyAnswer> {
  public constructor(data: StudyAnswer) {
    super(data)
    this.endpoint = studyAnswerEndpoint
  }

  public async create(options?: RESTItemIDBRequestOptions): Promise<this> {
    await super.create(options)
    if (!options?.ignoreDB) {
      const subject = await studySubjectEndpoint
        .getById(this.data.subjectId)
        .catch(noop)
      const userSubject = subject?.data.userSubjectId
        ? await studyUserSubjectEndpoint
            .getById(subject.data.userSubjectId)
            .catch(noop)
        : undefined
      if (userSubject) {
        // Update userSubject time
        const time = ~~(this.created.getTime() / 3_600_000)
        userSubject.data.stage = Math.max(
          1,
          Math.min(
            srs.length + 1,
            (userSubject.data.stage ?? 0) + (this.data.correct ? 1 : -2),
          ),
        )
        userSubject.data.nextReview =
          userSubject.data.stage >= srs.length
            ? undefined
            : time + srs[userSubject.data.stage - 1]!
        await database.put(userSubject.endpoint.idb, userSubject.data)

        // Update theme cache
        const themes = (await database.get('keyval', 'themes')) as StudyTheme[]
        const theme = themes.find(
          (t) => t.id === subject!.data.themeId,
        ) as StudyEnabledTheme
        theme.lessons = theme.lessons.filter((x) => x !== subject!.data.id)
        for (const hour in theme.reviews) {
          theme.reviews[hour] = theme.reviews[hour]!.filter(
            (x) => x !== subject!.data.id,
          )

          if (theme.reviews[hour].length === 0) delete theme.reviews[hour]
        }
        if (!theme.reviews[userSubject.data.nextReview!])
          theme.reviews[userSubject.data.nextReview!] = []
        theme.reviews[userSubject.data.nextReview!]!.push(subject!.data.id)
        await database.put('keyval', themes, 'themes')
      }
    }
    return this
  }
}

export const studyAnswerEndpoint = new RESTEndpointIDB<
  StudyAnswer,
  RESTStudyAnswer
>('/api/study/answers', RESTStudyAnswer, StudyAnswerT, 'studyAnswers')
studyAnswerEndpoint.ignoredDTOFields = ['id', 'updated', 'user_id']

export class RESTStudyUserSubject extends RESTItemIDB<StudyUserSubject> {
  public constructor(data: StudyUserSubject) {
    super(data)
    this.endpoint = studyUserSubjectEndpoint
  }

  public async create(options?: RESTItemIDBRequestOptions): Promise<this> {
    await super.create(options)
    if (!options?.ignoreDB) {
      const subject = await database.get('studySubjects', this.data.subjectId)
      if (subject) {
        subject.userSubjectId = this.data.id
        await database.put('studySubjects', subject)
      }
    }
    return this
  }

  public async delete(options?: RESTItemIDBRequestOptions): Promise<this> {
    await super.delete(options)
    if (!options?.ignoreDB) {
      const subject = await database.get('studySubjects', this.data.subjectId)
      if (subject) {
        delete subject.userSubjectId
        await database.put('studySubjects', subject)
      }
    }
    return this
  }
}

export const studyUserSubjectEndpoint = new RESTEndpointIDB<
  StudyUserSubject,
  RESTStudyUserSubject
>(
  '/api/study/user-subjects',
  RESTStudyUserSubject,
  StudyUserSubjectT,
  'studyUserSubjects',
)

export class RESTStudyUserQuestion extends RESTItemIDB<StudyUserQuestion> {
  public constructor(data: StudyUserQuestion) {
    super(data)
    this.endpoint = studyUserQuestionEndpoint
  }

  public async create(options?: RESTItemIDBRequestOptions): Promise<this> {
    await super.create(options)
    if (!options?.ignoreDB) {
      const question = await database.get(
        'studyQuestions',
        this.data.questionId,
      )
      if (question) {
        question.userQuestionId = this.data.id
        await database.put('studyQuestions', question)
      }
    }
    return this
  }

  public async delete(options?: RESTItemIDBRequestOptions): Promise<this> {
    await super.delete(options)
    if (!options?.ignoreDB) {
      const question = await database.get(
        'studyQuestions',
        this.data.questionId,
      )
      if (question) {
        delete question.userQuestionId
        await database.put('studyQuestions', question)
      }
    }
    return this
  }
}

export const studyUserQuestionEndpoint = new RESTEndpointIDB<
  StudyUserQuestion,
  RESTStudyUserQuestion
>(
  '/api/study/user-questions',
  RESTStudyUserQuestion,
  StudyUserQuestionT,
  'studyUserQuestions',
)

export async function getThemes(options: RESTItemIDBRequestOptions = {}) {
  options.ignoreDB ??= untrack(basicStore.online)
  const databaseSubject = options.ignoreDB
    ? undefined
    : ((await database.get('keyval', 'themes')) as Promise<StudyTheme[]>)
  if (databaseSubject) return databaseSubject
  const item = await request<StudyTheme[]>('/api/study/themes', options)
  void database.put('keyval', item, 'themes')
  return item
}

export async function addTheme(
  themeId: number,
  options: RESTItemIDBRequestOptions = {},
) {
  options.method = 'POST'
  await request<StudyTheme[]>('/api/study/themes/' + themeId, options)
  return getThemes()
}

export async function removeTheme(
  themeId: number,
  options: RESTItemIDBRequestOptions = {},
) {
  options.method = 'DELETE'
  await request<StudyTheme[]>('/api/study/themes/' + themeId, options)
  for (const store of [
    'studyUserSubjects',
    'studyUserQuestions',
    'studyAnswers',
  ] as const) {
    await database.clear(store)
    await database.put('keyval', 0, `lastUpdate_${store}`)
  }
  return getThemes()
}
