import { mdiFire, mdiStar } from '@mdi/js'
import { Component } from 'solid-js'

import Icon from '@/components/icon'
import Skeleton from '@/components/loading/skeleton'
import Tooltip from '@/components/tooltip'
import basicStore from '@/services/basic.store'

import { useStudy } from '../services/study.context'

import s from './study-activity.module.scss'

const { t } = basicStore
const MAX_SCORE = 200
const StudyActivity: Component = () => {
  const { activity, statsGraph, offlineUnavailable } = useStudy()!

  return (
    <div class={`card ${s.studyActivity}`}>
      <Skeleton
        loading={statsGraph().length === 0}
        offline={offlineUnavailable()}
        class={s.skeleton}
      >
        <Tooltip content={t('STUDY.TITLE')}>
          <div
            class={`${s.progress} ${activity()[0] < 25 ? s.bad : ''}`}
            style={{
              transform: `scaleX(${(activity()[0] / MAX_SCORE) * 100}%)`,
            }}
          />
        </Tooltip>
        <Tooltip content={t('STUDY.ACTIVITY.TOMORROW')}>
          <div
            class={`${s.progress} ${s.tomorrow} ${activity()[0] / 4 < 25 ? s.bad : ''}`}
            style={{
              transform: `scaleX(${(activity()[0] / 4 / MAX_SCORE) * 100}%)`,
            }}
          />
        </Tooltip>
        <Tooltip content={t('STUDY.ACTIVITY.GOAL')}>
          <div class={s.goal} />
        </Tooltip>
        <Tooltip content={t('STUDY.TITLE')}>
          <span class={s.stat}>
            {activity()[0]}
            <Icon path={mdiFire} size="32" />
          </span>
        </Tooltip>
        <Tooltip content={t('STUDY.ACTIVITY.STREAK')}>
          <span class={s.stat}>
            {activity()[1]}
            <Icon path={mdiStar} size="32" />
          </span>
        </Tooltip>
      </Skeleton>
    </div>
  )
}
export default StudyActivity
