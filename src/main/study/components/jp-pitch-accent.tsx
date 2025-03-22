import { Component, Index, createMemo } from 'solid-js'

import s from './jp-pitch-accent.module.scss'

const notConsideredComponent = 'ゃゅょぁぃぅぇぉ ャュョァィゥェォ'
function getAccentForComponent(positionCode: number, index: number) {
  switch (positionCode) {
    case 0: {
      return index > 0
    }
    case 1: {
      return index === 0
    }
    default: {
      return index > 0 && index < positionCode
    }
  }
}
const JPPitchAccent: Component<{ h: string; p: number }> = (properties) => {
  const components = createMemo(() => {
    const components = []
    for (let index = 0; index <= properties.h.length; index++) {
      const letter = properties.h[index] as string | undefined
      if (notConsideredComponent.includes(letter ?? '-')) {
        // eslint-disable-next-line unicorn/prefer-at
        components[components.length - 1]! += letter
      } else components.push(letter ?? '')
    }
    return components
  })
  return (
    <span class={s.jpPitchAccent}>
      <Index each={components()}>
        {(component, index) => {
          const accent = getAccentForComponent(properties.p, index)
          const change =
            index !== 0 &&
            accent !== getAccentForComponent(properties.p, index - 1)
          return (
            <span class={`${accent ? s.h : s.l} ${change ? s.c : ''}`}>
              {component()}
            </span>
          )
        }}
      </Index>
    </span>
  )
}
export default JPPitchAccent
