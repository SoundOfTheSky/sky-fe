import { Component, JSX, mergeProps, Show, splitProps } from 'solid-js';

import s from './icon.module.scss';

export type IconOptions = {
  path: string;
  inline?: boolean;
  size?: number | string;
  title?: string;
  color?: string;
};
const Icon: Component<JSX.SvgSVGAttributes<SVGSVGElement> & IconOptions> = (properties) => {
  const _prop = mergeProps(
    {
      size: 14,
      color: '#fff',
    },
    properties,
  );
  const [props, attributes] = splitProps(_prop, ['path', 'inline', 'size', 'title', 'color']);
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 24 24'
      height={props.size}
      fill={props.color}
      classList={{
        [s.inline]: props.inline,
      }}
      {...attributes}
    >
      <path d={props.path} />
      <Show when={props.title}>
        <title>{props.title}</title>
      </Show>
    </svg>
  );
};

export default Icon;
