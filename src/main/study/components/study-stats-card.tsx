import { Component, createEffect, createMemo, For } from 'solid-js';

import Loading from '@/components/loading/loading';
import Tooltip from '@/components/tooltip';

import { useStudy } from '../services/study.context';

import s from './study-stats-card.module.scss';

const StudyStatsCard: Component = () => {
  const { turnedOnThemes, disabledThemeIds, startDate, endDate, stats, today } = useStudy()!;
  let element: HTMLDivElement | undefined;

  // === Memos ===
  // eslint-disable-next-line sonarjs/cognitive-complexity
  const months = createMemo(() => {
    const stats$ = stats();
    if (!stats$) return;
    const turnedOnThemes$ = turnedOnThemes();
    const disabledThemeIds$ = disabledThemeIds();
    const start$ = startDate();
    const end$ = endDate();
    const today$ = today();
    const months = [];
    const month = new Date(start$);
    while (month <= end$) {
      const currentMonth = new Date(month);
      month.setMonth(month.getMonth() + 1);
      const days = [];
      const day = new Date(currentMonth);
      while (day < month) {
        const currentDay = new Date(day);
        day.setDate(day.getDate() + 1);
        let count = 0;
        if (currentDay > today$)
          for (const theme of turnedOnThemes$)
            for (const [time, ids] of Object.entries(theme.reviews)) {
              const t = new Date(Number.parseInt(time) * 3_600_000);
              if (t < currentDay || t > day) continue;
              count += ids.length;
            }
        else {
          const themeStats = stats$.get(~~(currentDay.getTime() / 86_400_000));
          if (themeStats) {
            for (const [themeId, c] of themeStats) {
              if (disabledThemeIds$.includes(themeId)) continue;
              count += c;
            }
          }
        }
        days.push({ date: currentDay, count });
      }
      months.push({
        title: currentMonth.toLocaleString('default', { month: 'long' }),
        days,
      });
    }
    return months;
  });
  const maxReviewsPerDay = createMemo(() => {
    const months$ = months();
    if (!months$) return 0;
    let max = 0;
    for (const month of months$) for (const day of month.days) if (max < day.count) max = day.count;
    return max;
  });

  // === Effects ===
  // Scroll in view today if possible
  createEffect(() => {
    if (months()?.length && element) {
      const today = document.querySelector(`.${s.today}`) as HTMLElement | undefined;
      if (today) element.scrollLeft = today.offsetLeft - element.clientWidth / 2;
    }
  });
  return (
    <div class={`card ${s.studyStatsCard}`} ref={element}>
      <Loading when={months()}>
        <div class={s.weekdays}>
          <div>M</div>
          <div>T</div>
          <div>W</div>
          <div>T</div>
          <div>F</div>
          <div>S</div>
          <div>S</div>
        </div>
        <For each={months()}>
          {(month) => (
            <div class={s.month}>
              <div class={s.title}>{month.title}</div>
              <div class={s.days}>
                <For each={month.days}>
                  {(day, index) => (
                    <Tooltip
                      content={
                        <div class={s.dayInfo}>
                          <div class={s.title}>{day.date.toLocaleDateString()}</div>
                          <div>Reviews: {day.count}</div>
                        </div>
                      }
                    >
                      <div
                        class={s.day}
                        classList={{
                          [s.today]: today().getTime() === day.date.getTime(),
                          [s.future]: today().getTime() < day.date.getTime(),
                        }}
                        style={
                          index() === 0
                            ? {
                                '--day': (day.date.getDay() + 6) % 7,
                              }
                            : undefined
                        }
                      >
                        <div
                          class={s.brightness}
                          style={{
                            opacity: day.count / maxReviewsPerDay(),
                          }}
                        />
                      </div>
                    </Tooltip>
                  )}
                </For>
              </div>
            </div>
          )}
        </For>
      </Loading>
    </div>
  );
};
export default StudyStatsCard;
