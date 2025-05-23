import { mdiTranslate } from '@mdi/js'
import { createDelayedFunction } from '@softsky/utils'
import { createEffect, createMemo, For, onMount, Show } from 'solid-js'

import Input from '@/components/form/input'
import Icon from '@/components/icon'
import basicStore from '@/services/basic.store'
import { database } from '@/services/database'
import { modalsStore, Severity } from '@/services/modals.store'
import { atom } from '@/services/reactive'
import syncStore from '@/services/sync.store'
import {
  StudyQuestion,
  StudySubject,
  StudyUserQuestion,
  StudyUserSubject,
} from '@/sky-shared/study'

import SubjectReference from '../components/subject-reference'
import Themes from '../components/themes'
import parseHTML from '../services/parse-html'
import { useStudy } from '../services/study.context'

import s from './subjects.module.scss'

const { t } = basicStore

type SearchResult = {
  subject: StudySubject
  questions: StudyQuestion[]
  studyUserSubject?: StudyUserSubject
  studyUserQuestions: (StudyUserQuestion | undefined)[]
  score: number
}

function searchText(text: string, query: string) {
  text = text.toLowerCase().trim()
  if (text === query) return 5
  else if (text.includes(query)) return 1
  return 0
}
function searchArray(text: string[], query: string) {
  text = text.map((x) => x.toLowerCase().trim())
  if (text.includes(query)) return 5
  else if (text.some((x) => x.includes(query))) return 1
  return 0
}

export default function Subjects() {
  // === Hooks ===
  onMount(() => {
    document.title = 'Sky | Subjects'
    void update()
  })

  // === Stores ===
  const { turnedOnThemes, update } = useStudy()!

  // === State ===
  const query = atom('')
  const isJapanese = atom(false)
  const results = atom<SearchResult[]>([], {
    equals: () => false,
  })
  const isLoading = atom(false)
  let searchId = 0

  // === Memos ===
  const themeIds = createMemo(() => new Set(turnedOnThemes().map((t) => t.id)))

  // === Effects ===
  createEffect(() => {
    if (syncStore.cached()) {
      void search(themeIds(), query())
    } else {
      modalsStore.notify({
        title: t('STUDY.SEARCH_NEED_SYNC'),
        severity: Severity.WARNING,
        timeout: 10_000,
      })
    }
  })

  // === Functions ===
  const search = createDelayedFunction(
    async (themeIds: Set<number>, query?: string) => {
      results([])
      if (!query) return
      query = query.toLowerCase().trim()
      const $results = results()
      isLoading(true)
      const sId = ++searchId
      const tx = database.transaction(
        [
          'studySubjects',
          'studyQuestions',
          'studyUserSubjects',
          'studyUserQuestions',
        ],
        'readonly',
      )
      const studySubjects = tx.objectStore('studySubjects')
      const studyQuestions = tx.objectStore('studyQuestions')
      const studyUserSubjects = tx.objectStore('studyUserSubjects')
      const studyUserQuestions = tx.objectStore('studyUserQuestions')
      for await (const { value } of studySubjects) {
        if (!themeIds.has(value.themeId)) continue
        const result: SearchResult = {
          score: 0,
          questions: [],
          studyUserQuestions: [],
          subject: value,
        }
        result.score += searchText(value.title, query)
        result.studyUserSubject = value.userSubjectId
          ? await studyUserSubjects.get(value.userSubjectId)
          : undefined
        for (const id of value.questionIds) {
          const question = await studyQuestions.get(id)
          if (!question) continue
          result.questions.push(question)
          result.score +=
            searchArray(question.answers, query) +
            searchText(question.question, query) +
            searchText(question.description, query)
          const userQuestion = question.userQuestionId
            ? await studyUserQuestions.get(question.userQuestionId)
            : undefined
          result.studyUserQuestions.push(userQuestion)
          if (userQuestion) {
            if (userQuestion.note)
              result.score += searchText(userQuestion.note, query)
            if (userQuestion.synonyms)
              result.score += searchArray(userQuestion.synonyms, query)
          }
        }
        if (sId !== searchId) break
        if (result.score !== 0) {
          const maxxed = $results.length > 500
          const index = $results.findIndex((x) => x.score < result.score)
          const isNotFound = index === -1
          if (maxxed && isNotFound) continue
          $results.splice(isNotFound ? $results.length - 1 : index, 0, result)
          if (maxxed) $results.pop()
          results($results)
        }
      }
      if (sId === searchId) isLoading(false)
    },
    1000,
  )

  return (
    <div class={s.subjectsComponent}>
      <Themes />
      <div class={`card ${s.search}`}>
        <Show
          when={isJapanese()}
          fallback={<Input value={query} placeholder={t('COMMON.SEARCH')} />}
        >
          <Input japanese value={query} placeholder='検索' />
        </Show>
        <button
          onClick={() => {
            query('')
            isJapanese((x) => !x)
          }}
        >
          <Icon path={mdiTranslate} size='32' />
        </button>
      </div>
      <div class={`card ${s.results}`}>
        <Show when={isLoading()}>
          <div class={s.loading}>{t('COMMON.LOADING')}</div>
        </Show>
        <For each={results()}>
          {(result) => (
            <SubjectReference id={result.subject.id}>
              {parseHTML(result.subject.title)}
            </SubjectReference>
          )}
        </For>
      </div>
    </div>
  )
}
