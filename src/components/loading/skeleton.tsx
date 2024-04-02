import { mdiCloudOff } from '@mdi/js';
import { ParentComponent, JSX, splitProps, Switch, Match } from 'solid-js';
import { Transition } from 'solid-transition-group';

import basicStore from '@/services/basic.store';
import { opacityTransition } from '@/services/transition';

import Icon from '../icon';

export default ((properties) => {
  const [props, attributes] = splitProps(properties, ['loading', 'offline', 'children', 'schema']);

  return (
    <Transition {...opacityTransition} mode='outin'>
      <Switch fallback={<div {...attributes}>{props.children}</div>}>
        <Match when={props.offline ?? !basicStore.online()}>
          {props.schema ?? (
            <div {...attributes} class={`center ${attributes.class ?? ''}`}>
              <Icon path={mdiCloudOff} size='48' />
            </div>
          )}
        </Match>
        <Match when={props.loading ?? basicStore.loading()}>
          {props.schema ?? <div {...attributes} class={`skeleton ${attributes.class ?? ''}`} />}
        </Match>
      </Switch>
    </Transition>
  );
}) as ParentComponent<
  JSX.HTMLAttributes<HTMLDivElement> & { loading?: boolean; offline?: boolean; schema?: JSX.Element }
>;
