import { Component, Index, createMemo } from 'solid-js';

import s from './jp-pitch-accent.module.scss';

const notConsideredComponent = 'ゃゅょぁぃぅぇぉ ャュョァィゥェォ';
function getAccentForComponent(positionCode: number, index: number) {
  switch (positionCode) {
    case 0:
      return index > 0;
    case 1:
      return index === 0;
    default:
      return index > 0 && index < positionCode;
  }
}
const JPPitchAccent: Component<{ h: string; p: number }> = (properties) => {
  const components = createMemo(() => {
    const components = [];
    for (let i = 0; i <= properties.h.length; i++) {
      const letter = properties.h[i] as string | undefined;
      if (notConsideredComponent.includes(letter ?? '-')) {
        components[components.length - 1] += letter;
      } else components.push(letter ?? '');
    }
    return components;
  });
  return (
    <span class={s.jpPitchAccent}>
      <Index each={components()}>
        {(component, i) => {
          const accent = getAccentForComponent(properties.p, i);
          const change = i !== 0 && accent !== getAccentForComponent(properties.p, i - 1);
          return <span class={`${accent ? s.h : s.l} ${change ? s.c : ''}`}>{component()}</span>;
        }}
      </Index>
    </span>
  );
};
export default JPPitchAccent;
