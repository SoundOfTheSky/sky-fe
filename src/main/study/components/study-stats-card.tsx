import { Component, createEffect, createMemo, For, Show } from 'solid-js';

import { atom, onOutside } from '@/services/reactive';
import Loading from '@/components/loading/loading';
import Button from '@/components/form/button';

import { Stat, useStudy } from '../services/study.context';

import s from './study-stats-card.module.scss';

onOutside;

const StudyStatsCard: Component = () => {
  const { turnedOnThemes, disabledThemeIds, startDate, endDate, stats, today } = useStudy()!;

  let element: HTMLDivElement | undefined;

  // === State ===
  const selected = atom<{
    date: Date;
    stats: number[] | Stat[];
  }>();
  // === Memos ===
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
        days.push({
          date: currentDay,
          stats:
            currentDay > today$
              ? turnedOnThemes$.flatMap((theme) =>
                  Object.entries(theme.reviews)
                    .filter(([time]) => {
                      const t = new Date(Number.parseInt(time) * 3_600_000);
                      return t >= currentDay && t <= day;
                    })
                    .flatMap(([, ids]) => ids),
                )
              : stats$.filter(
                  (stat) => !disabledThemeIds$.includes(stat.themeId) && stat.date >= currentDay && stat.date <= day,
                ),
        });
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
    for (const month of months$) for (const day of month.days) if (max < day.stats.length) max = day.stats.length;
    return max;
  });

  function scrollInView() {
    if (element) {
      const today = document.querySelector(`.${s.today}`) as HTMLElement | undefined;
      if (today) element.scrollLeft = today.offsetLeft - element.clientWidth / 2;
    }
  }

  // === Effects ===
  createEffect(() => {
    if (months()?.length) scrollInView();
  });
  return (
    <div class={`card ${s.studyStatsCardComponent}`} ref={element}>
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
              <div
                class={s.days}
                style={{
                  'min-width': `${Math.ceil((((month.days[0].date.getDay() + 6) % 7) + month.days.length) / 7) * 22}px`,
                }}
              >
                <For each={month.days}>
                  {(day, index) => (
                    <Button
                      class={s.day}
                      classList={{
                        [s.today]: today().getTime() === day.date.getTime(),
                        [s.future]: today().getTime() < day.date.getTime(),
                        [s.selected]: day === selected(),
                      }}
                      style={
                        index() === 0
                          ? {
                              'margin-top': `${((day.date.getDay() + 6) % 7) * 22}px`,
                            }
                          : undefined
                      }
                      onClick={() => selected(day)}
                    >
                      <div
                        class={s.brightness}
                        style={{
                          opacity: day.stats.length / maxReviewsPerDay(),
                        }}
                      />
                      <Show when={day === selected()}>
                        <div class={s.dayInfo} use:onOutside={['click', () => selected(undefined)]}>
                          <div class={s.title}>{day.date.toLocaleDateString()}</div>
                          <div>Reviews: {day.stats.length}</div>
                        </div>
                      </Show>
                    </Button>
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
