/* eslint-disable solid/no-innerhtml */
import { JSX, Show, splitProps } from 'solid-js'

import s from './spin.module.scss'

type Options = {
  size?: number | string
  when?: boolean
  children?: JSX.Element
  rings?: number
  type?: 'groove' | 'dashed'
}
export default function Spin(
  properties_: Omit<JSX.HTMLAttributes<HTMLDivElement>, keyof Options> &
    Options,
) {
  // === State ===
  const [properties, attributes] = splitProps(properties_, [
    'size',
    'when',
    'children',
    'rings',
    'type',
  ])

  return (
    <Show
      when={properties.when}
      fallback={
        <div
          {...attributes}
          class={[
            'spin',
            s.spin,
            properties.type === 'groove' && s.groove,
            attributes.class,
          ]
            .filter(Boolean)
            .join(' ')}
          innerHTML={
            '<div>'.repeat(properties.rings ?? 3) +
            '</div>'.repeat(properties.rings ?? 3)
          }
        />
      }
    >
      {properties.children}
    </Show>
  )
}
