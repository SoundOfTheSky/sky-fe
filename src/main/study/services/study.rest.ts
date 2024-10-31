import { untrack } from 'solid-js';

import basicStore from '@/services/basic.store';
import { db } from '@/services/db';
import { request } from '@/services/fetch';
import {
  RESTEndpointIDB,
  RESTItemIDB,
  RESTItemIDBRequestOptions,
} from '@/services/rest';
import {
  StudyQuestionT,
  StudySubject,
  StudySubjectT,
  StudyAnswer,
  StudyAnswerT,
  StudyUserQuestion,
  StudyUserQuestionT,
  StudyUserSubject,
  StudyUserSubjectT,
  StudyQuestion,
  StudyTheme,
  srs,
  StudyEnabledTheme,
} from '@/sky-shared/study';

export class RESTStudySubject extends RESTItemIDB<StudySubject> {
  public constructor(data: StudySubject) {
    super(data);
    this.endpoint = studySubjectEndpoint;
  }
}

export const studySubjectEndpoint = new RESTEndpointIDB<
  StudySubject,
  RESTStudySubject
>('/api/study/subjects', RESTStudySubject, StudySubjectT, 'studySubjects');

export class RESTStudyQuestion extends RESTItemIDB<StudyQuestion> {
  public constructor(data: StudyQuestion) {
    super(data);
    this.endpoint = studyQuestionEndpoint;
  }
}

export const studyQuestionEndpoint = new RESTEndpointIDB<
  StudyQuestion,
  RESTStudyQuestion
>('/api/study/questions', RESTStudyQuestion, StudyQuestionT, 'studyQuestions');

export class RESTStudyAnswer extends RESTItemIDB<StudyAnswer> {
  public constructor(data: StudyAnswer) {
    super(data);
    this.endpoint = studyAnswerEndpoint;
  }

  public async create(options?: RESTItemIDBRequestOptions): Promise<this> {
    await super.create(options);
    if (!options?.ignoreDB) {
      const subject = await studySubjectEndpoint
        .get(this.data.subjectId)
        .catch(() => undefined);
      const userSubject = subject?.data.userSubjectId
        ? await studyUserSubjectEndpoint
            .get(subject.data.userSubjectId)
            .catch(() => undefined)
        : undefined;
      if (userSubject) {
        // Update userSubject time
        const time = ~~(this.created.getTime() / 3_600_000);
        userSubject.data.stage = Math.max(
          1,
          Math.min(
            srs.length + 1,
            (userSubject.data.stage ?? 0) + (this.data.correct ? 1 : -2),
          ),
        );
        userSubject.data.nextReview =
          userSubject.data.stage >= srs.length
            ? null
            : time + srs[userSubject.data.stage - 1]!;
        await db.put(userSubject.endpoint.idb, userSubject.data);

        // Update theme cache
        const themes = (await db.get('keyval', 'themes')) as StudyTheme[];
        const theme = themes.find(
          (t) => t.id === subject!.data.themeId,
        ) as StudyEnabledTheme;
        theme.lessons = theme.lessons.filter((x) => x !== subject!.data.id);
        for (const hour in theme.reviews) {
          theme.reviews[hour] = theme.reviews[hour]!.filter(
            (x) => x !== subject!.data.id,
          );
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          if (theme.reviews[hour].length === 0) delete theme.reviews[hour];
        }
        if (!theme.reviews[userSubject.data.nextReview!])
          theme.reviews[userSubject.data.nextReview!] = [];
        theme.reviews[userSubject.data.nextReview!]!.push(subject!.data.id);
        await db.put('keyval', themes, 'themes');
      }
    }
    return this;
  }
}

export const studyAnswerEndpoint = new RESTEndpointIDB<
  StudyAnswer,
  RESTStudyAnswer
>('/api/study/answers', RESTStudyAnswer, StudyAnswerT, 'studyAnswers');
studyAnswerEndpoint.ignoredDTOFields = ['id', 'updated', 'user_id'];

export class RESTStudyUserSubject extends RESTItemIDB<StudyUserSubject> {
  public constructor(data: StudyUserSubject) {
    super(data);
    this.endpoint = studyUserSubjectEndpoint;
  }

  public async create(options?: RESTItemIDBRequestOptions): Promise<this> {
    await super.create(options);
    if (!options?.ignoreDB) {
      const subject = await db.get('studySubjects', this.data.subjectId);
      if (subject) {
        subject.userSubjectId = this.data.id;
        await db.put('studySubjects', subject);
      }
    }
    return this;
  }

  public async delete(options?: RESTItemIDBRequestOptions): Promise<this> {
    await super.delete(options);
    if (!options?.ignoreDB) {
      const subject = await db.get('studySubjects', this.data.subjectId);
      if (subject) {
        delete subject.userSubjectId;
        await db.put('studySubjects', subject);
      }
    }
    return this;
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
);

export class RESTStudyUserQuestion extends RESTItemIDB<StudyUserQuestion> {
  public constructor(data: StudyUserQuestion) {
    super(data);
    this.endpoint = studyUserQuestionEndpoint;
  }

  public async create(options?: RESTItemIDBRequestOptions): Promise<this> {
    await super.create(options);
    if (!options?.ignoreDB) {
      const question = await db.get('studyQuestions', this.data.questionId);
      if (question) {
        question.userQuestionId = this.data.id;
        await db.put('studyQuestions', question);
      }
    }
    return this;
  }

  public async delete(options?: RESTItemIDBRequestOptions): Promise<this> {
    await super.delete(options);
    if (!options?.ignoreDB) {
      const question = await db.get('studyQuestions', this.data.questionId);
      if (question) {
        delete question.userQuestionId;
        await db.put('studyQuestions', question);
      }
    }
    return this;
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
);

export async function getThemes(
  options: RESTItemIDBRequestOptions = {
    ignoreDB: untrack(basicStore.online),
  },
) {
  const dbSubject = options.ignoreDB
    ? undefined
    : ((await db.get('keyval', 'themes')) as Promise<StudyTheme[]>);
  if (dbSubject) return dbSubject;
  const item = await request<StudyTheme[]>('/api/study/themes', options);
  void db.put('keyval', item, 'themes');
  return item;
}

export async function addTheme(
  themeId: number,
  options: RESTItemIDBRequestOptions = {},
) {
  options.method = 'POST';
  await request<StudyTheme[]>('/api/study/themes/' + themeId, options);
  return getThemes();
}

export async function removeTheme(
  themeId: number,
  options: RESTItemIDBRequestOptions = {},
) {
  options.method = 'DELETE';
  await request<StudyTheme[]>('/api/study/themes/' + themeId, options);
  for (const store of [
    'studyUserSubjects',
    'studyUserQuestions',
    'studyAnswers',
  ] as const) {
    await db.clear(store);
    await db.put('keyval', 0, `lastUpdate_${store}`);
  }
  return getThemes();
}
