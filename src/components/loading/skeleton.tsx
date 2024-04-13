import { mdiCloudOff } from '@mdi/js';
import { ParentComponent, JSX, splitProps, Switch, Match } from 'solid-js';

import basicStore from '@/services/basic.store';

import Icon from '../icon';

export default ((properties) => {
  const [props, attributes] = splitProps(properties, ['loading', 'offline', 'children']);
  return (
    <Switch fallback={props.children}>
      <Match when={props.offline ?? !basicStore.online()}>
        <div {...attributes} class={`full center ${attributes.class ?? ''}`}>
          <Icon path={mdiCloudOff} size='48' />
        </div>
      </Match>
      <Match when={props.loading ?? basicStore.loading()}>
        <div {...attributes} class={`skeleton ${attributes.class ?? ''}`} />
      </Match>
    </Switch>
  );
}) as ParentComponent<JSX.HTMLAttributes<HTMLDivElement> & { loading?: boolean; offline?: boolean }>;
