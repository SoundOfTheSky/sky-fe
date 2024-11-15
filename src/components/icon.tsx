import { Component, JSX, mergeProps, Show, splitProps } from 'solid-js'

import s from './icon.module.scss'

export type IconOptions = {
  path: string
  inline?: boolean
  size?: number | string
  title?: string
  color?: string
}
const Icon: Component<JSX.SvgSVGAttributes<SVGSVGElement> & IconOptions> = (
  properties,
) => {
  const _property = mergeProps(
    {
      size: 14,
      color: '#fff',
    },
    properties,
  )
  const [properties_, attributes] = splitProps(_property, [
    'path',
    'inline',
    'size',
    'title',
    'color',
  ])
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      height={properties_.size}
      fill={properties_.color}
      classList={{
        [s.inline!]: properties_.inline,
      }}
      {...attributes}
    >
      <path d={properties_.path} />
      <Show when={properties_.title}>
        <title>{properties_.title}</title>
      </Show>
    </svg>
  )
}

export default Icon
