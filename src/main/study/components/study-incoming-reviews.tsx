import { Component, createMemo, For } from 'solid-js';

import Skeleton from '@/components/loading/skeleton';
import { useStudy } from '@/main/study/services/study.context';
import { onOutside } from '@/services/reactive';

import s from './study-incoming-reviews.module.scss';

onOutside;

const StudyIncomingReviews: Component = () => {
  const { turnedOnThemes, now, availableReviews, ready, offlineUnavailable } = useStudy()!;

  const data = createMemo(() => {
    const d = new Map<string, [number, number]>();
    let sum = availableReviews().length;
    for (const [time, ids] of turnedOnThemes()
      .flatMap((theme) =>
        Object.entries(theme.reviews).map<[number, number[]]>(([time, ids]) => [Number.parseInt(time), ids]),
      )
      .filter(([time]) => time > now())
      .sort(([a], [b]) => a - b)) {
      const inHours = time - now();
      const title = inHours === 1 ? '1 hour' : inHours < 48 ? `${inHours} hours` : `${Math.floor(inHours / 24)} days`;
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
    <div class={`card ${s.incomingReviews}`}>
      <div class='card-title'>Review forecast</div>
      <Skeleton loading={!ready()} offline={offlineUnavailable()} schema={<div class={`skeleton ${s.skeleton}`} />}>
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
      </Skeleton>
    </div>
  );
};
export default StudyIncomingReviews;
