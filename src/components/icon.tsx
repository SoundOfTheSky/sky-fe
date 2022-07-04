import { Component, mergeProps, Show } from 'solid-js';

export type IconOptions = {
  path: string;
  inline?: boolean;
  size?: number | string;
  title?: string;
  color?: string;
};
const Icon: Component<IconOptions> = (_properties) => {
  const properties = mergeProps(
    {
      size: 14,
      color: '#fff',
    },
    _properties,
  );
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 24 24'
      height={properties.size}
      fill={properties.color}
      style={{
        display: properties.inline ? 'inline-block' : 'block',
      }}
    >
      <path d={properties.path} />
      <Show when={properties.title}>
        <title>{properties.title}</title>
      </Show>
    </svg>
  );
};

export default Icon;
