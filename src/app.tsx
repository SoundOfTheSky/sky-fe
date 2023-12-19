import { ParentComponent, Show, createRenderEffect } from 'solid-js';
import { Transition } from 'solid-transition-group';
import { MetaProvider } from '@solidjs/meta';
import { mdiServerNetworkOff } from '@mdi/js';

import Notifications from '@/components/global/notifications';
import PageLoading from '@/components/global/page-loading';
import { persistentAtom } from '@/services/reactive';
import { opacityTransition } from '@/services/transition';

import basicStore from './services/basic.store';
import FatalError from './main/pages/fatal-error';
import Icon from './components/icon';

import './global.scss';
import './fonts.scss';

const App: ParentComponent = (properties) => {
  const fontPixelization = persistentAtom('fontPixelization', true);
  const JPFontPixelization = persistentAtom('JPFontPixelization', true);
  createRenderEffect(() => {
    document.body.classList.remove('pixelated-font');
    document.body.classList.remove('jp-pixelated-font');
    document.body.classList.remove('all-pixelated-font');
    if (fontPixelization() && JPFontPixelization()) document.body.classList.add('all-pixelated-font');
    else if (fontPixelization()) document.body.classList.add('pixelated-font');
    else if (JPFontPixelization()) document.body.classList.add('jp-pixelated-font');
  });

  return (
    <MetaProvider>
      <Transition {...opacityTransition} mode='outin'>
        <Show
          when={basicStore.online()}
          fallback={
            <FatalError>
              <Icon path={mdiServerNetworkOff} size='48' />
              <h1>We're offline</h1>
              <p>Unable to connect to server.</p>
              <p>Please come back later!</p>
            </FatalError>
          }
        >
          {properties.children}
        </Show>
      </Transition>
      <Notifications />
      <PageLoading />
    </MetaProvider>
  );
};

export default App;
