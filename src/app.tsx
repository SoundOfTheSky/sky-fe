import { MetaProvider } from '@solidjs/meta';
import { ParentComponent, createRenderEffect } from 'solid-js';
import { Transition } from 'solid-transition-group';

import Notifications from '@/components/global/notifications';
import PageLoading from '@/components/global/page-loading';
import { persistentAtom } from '@/services/reactive';
import { opacityTransition } from '@/services/transition';

import { WebSocketProvider } from './services/web-socket.context';

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
      <WebSocketProvider>
        <PageLoading />
        <Notifications />
        <Transition {...opacityTransition} mode='outin'>
          {properties.children}
        </Transition>
      </WebSocketProvider>
    </MetaProvider>
  );
};

export default App;
