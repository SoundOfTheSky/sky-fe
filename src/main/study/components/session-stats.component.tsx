import { mdiCheckBold, mdiClose, mdiCloseThick, mdiUndoVariant } from '@mdi/js'
import { formatNumber } from '@softsky/utils'
import { A } from '@solidjs/router'
import { createMemo, For, Show } from 'solid-js'

import Icon from '@/components/icon'
import basicStore from '@/services/basic.store'

import parseHTML from '../services/parse-html'
import { SubjectStatus, useSession } from '../session/session.context'

import SubjectReference from './subject-reference'

import s from './session-stats.module.scss'

const { t } = basicStore

export default function SessionStats() {
  // === Hooks ===
  const { timePassed, subjectIds, startTime, stats, subjectsStats } =
    useSession()!

  const statsArray = createMemo(
    () =>
      [...subjectsStats.entries()] as [
        number,
        {
          title: string
          status: SubjectStatus
          time: number
          answers: string[]
          undo: boolean
        },
      ][],
  )
  return (
    <div class={`card ${s.stats}`}>
      <div class='card-title'>
        Review stats
        <button class={s.finish}>
          <A href='../..'>
            <Icon path={mdiClose} size='32' />
          </A>
        </button>
      </div>
      <table>
        <thead>
          <tr>
            <th>{t('STUDY.SESSION.TIME')}</th>
            <th>{t('STUDY.SUBJECTS')}</th>
            <th>{t('STUDY.SESSION.SPEED')}</th>
            <th>{t('STUDY.SESSION.CORRECT')}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{timePassed()}</td>
            <td>{subjectIds().length}</td>
            <td>
              {~~(
                (3_600_000 / (Date.now() - startTime)) *
                subjectIds().length *
                100
              ) / 100}{' '}
              {t('STUDY.SESSION.SUBJECTS_PER_HOUR')}
            </td>
            <td>{~~(stats().correctPercent * 100)}%</td>
          </tr>
        </tbody>
      </table>
      <table>
        <thead>
          <tr>
            <th>{t('STUDY.SUBJECT')}</th>
            <th>{t('STUDY.SESSION.TIME')}</th>
            <th>{t('STUDY.SESSION.UNDO')}</th>
            <th>{t('STUDY.SESSION.CORRECT')}</th>
          </tr>
        </thead>
        <tbody>
          <For each={statsArray()}>
            {([id, stats]) => (
              <tr>
                <td>
                  <SubjectReference id={id}>
                    {parseHTML(stats.title)}
                  </SubjectReference>
                </td>
                <td>{formatNumber(stats.time * 1000)}</td>
                <td>
                  <Show when={stats.undo}>
                    <Icon inline path={mdiUndoVariant} size='24' />
                  </Show>
                </td>
                <td>
                  <Icon
                    inline
                    path={
                      stats.status === SubjectStatus.Correct
                        ? mdiCheckBold
                        : mdiCloseThick
                    }
                    size='24'
                  />
                </td>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  )
}
