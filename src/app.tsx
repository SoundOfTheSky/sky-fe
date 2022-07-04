import { Component, createRenderEffect } from 'solid-js';
import { Transition } from 'solid-transition-group';
import { MetaProvider } from '@solidjs/meta';
import { Router } from '@solidjs/router';

import Routes from '@/pages/routes';
import Notifications from '@/components/global/notifications';
import PageLoading from '@/components/global/page-loading';
import { persistentAtom } from '@/services/reactive';
import { opacityTransition } from '@/services/transition';

import './global.scss';
import './fonts.scss';

const App: Component = () => {
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
      <Router>
        <Transition {...opacityTransition} mode='outin'>
          <Routes />
        </Transition>
        <Notifications />
        <PageLoading />
      </Router>
    </MetaProvider>
  );
};

export default App;
