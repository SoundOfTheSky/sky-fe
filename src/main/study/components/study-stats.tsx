import { Component, createEffect, createMemo, Index, Show } from 'solid-js';

import Skeleton from '@/components/loading/skeleton';
import Tooltip from '@/components/tooltip';
import { DAY_MS } from 'sky-utils';

import { useStudy } from '../services/study.context';

import s from './study-stats.module.scss';

const StudyStats: Component = () => {
  // === Hooks ===
  const { offlineUnavailable, statsGraph, startDate, today } = useStudy()!;

  // === State ===
  let element: HTMLDivElement | undefined;

  // === Memos ===
  const maxReviewsPerDay = createMemo(() => Math.max(...statsGraph()));

  // === Effects ===
  // Scroll in view today if possible
  createEffect(() => {
    if (statsGraph().length && element)
      element.scrollLeft = element.scrollWidth;
  });

  return (
    <div class={`card ${s.studyStats}`}>
      <div class='card-title'>Календарь активности</div>
      <Skeleton
        loading={!statsGraph().length}
        offline={offlineUnavailable()}
        class={s.skeleton}
      >
        <div class={s.days} ref={element}>
          <Index each={statsGraph()}>
            {(reviews, i) => {
              const date = new Date(startDate().getTime() + i * DAY_MS);
              return (
                <Tooltip
                  content={
                    <div class={s.dayInfo}>
                      <div class={s.title}>{date.toLocaleDateString()}</div>
                      <div>Повторения: {reviews()}</div>
                    </div>
                  }
                >
                  <div
                    class={s.day}
                    classList={{
                      [s.today!]: today().getTime() === date.getTime(),
                      [s.future!]: today().getTime() < date.getTime(),
                    }}
                  >
                    <Show when={reviews()}>
                      <div
                        class={s.brightness}
                        style={{
                          opacity: (reviews() / maxReviewsPerDay()) * 0.6 + 0.4,
                        }}
                      />
                    </Show>
                  </div>
                </Tooltip>
              );
            }}
          </Index>
        </div>
      </Skeleton>
    </div>
  );
};
export default StudyStats;
