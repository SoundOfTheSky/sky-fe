import { ParentComponent, Show, JSX, splitProps } from 'solid-js';
import { Transition } from 'solid-transition-group';

import { opacityTransition } from '@/services/transition';

export default ((properties) => {
  const [props, attributes] = splitProps(properties, ['loading', 'children', 'schema']);

  return (
    <Transition {...opacityTransition} mode='outin'>
      <Show when={props.loading} fallback={<div {...attributes}>{props.children}</div>}>
        {props.schema ?? <div {...attributes} class={`skeleton ${attributes.class ?? ''}`} />}
      </Show>
    </Transition>
  );
}) as ParentComponent<JSX.HTMLAttributes<HTMLDivElement> & { loading: boolean; schema?: JSX.Element }>;
