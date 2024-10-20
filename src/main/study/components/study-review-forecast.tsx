import { mdiClockRemove } from '@mdi/js';
import { Component, createMemo, For, Show } from 'solid-js';

import Icon from '@/components/icon';
import Skeleton from '@/components/loading/skeleton';
import Tooltip from '@/components/tooltip';
import { useStudy } from '@/main/study/services/study.context';

import s from './study-review-forecast.module.scss';

const StudyReviewForecast: Component = () => {
  const { turnedOnThemes, now, reviews, ready, offlineUnavailable } = useStudy()!;

  const data = createMemo(() => {
    const d = new Map<string, [number, number]>();
    let sum = reviews().length;
    for (const [time, ids] of turnedOnThemes()
      .flatMap((theme) =>
        Object.entries(theme.reviews).map<[number, number[]]>(([time, ids]) => [Number.parseInt(time), ids]),
      )
      .filter(([time]) => time > now())
      .sort(([a], [b]) => a - b)) {
      const inHours = time - now();
      const title = inHours === 1 ? '1 hour' : inHours < 48 ? `${inHours} hours` : `${~~(inHours / 24)} days`;
      sum += ids.length;
      if (time > now()) d.set(title, [(d.get(title)?.[0] ?? 0) + ids.length, sum]);
    }
    return [...d.entries()].map(([title, [reviews, total]]) => ({
      title,
      reviews,
      total,
    }));
  });

  const max = createMemo(() => {
    let n = 0;
    for (const { reviews } of data()) if (reviews > n) n = reviews;
    return n;
  });

  return (
    <div class={`card ${s.reviewForecast}`}>
      <div class='card-title'>Review forecast</div>
      <Skeleton loading={!ready()} offline={offlineUnavailable()} class={s.skeleton}>
        <Show
          when={data().length}
          fallback={
            <Tooltip content='No incoming reviews'>
              <div class={s.skeleton}>
                <Icon path={mdiClockRemove} size='48' />
              </div>
            </Tooltip>
          }
        >
          <table>
            <tbody>
              <For each={data()}>
                {({ title, reviews, total }) => (
                  <tr>
                    <td class={s.title}>{title}</td>
                    <td class={s.line}>
                      <div
                        style={{
                          width: `${(reviews / max()) * 100}%`,
                        }}
                      />
                    </td>
                    <td class={s.reviews}>+{reviews}</td>
                    <td class={s.total}>{total}</td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </Show>
      </Skeleton>
    </div>
  );
};
export default StudyReviewForecast;
