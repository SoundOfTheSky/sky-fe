import { MetaProvider } from '@solidjs/meta';
import { ParentComponent, createRenderEffect } from 'solid-js';

import Notifications from '@/components/global/notifications';
import PageLoading from '@/components/global/page-loading';
import { persistentAtom } from '@/services/reactive';

import AudioPlayer from './components/audio-player';
import { PlannerProvider } from './main/planner/planner.context';
import { StudyProvider } from './main/study/services/study.context';
import { WebSocketProvider } from './services/web-socket.context';

import './global.scss';
import './fonts.scss';

const App: ParentComponent = (properties) => {
  const fontPixelization = persistentAtom('fontPixelization', true);
  const JPFontPixelization = persistentAtom('JPFontPixelization', false);
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
        <StudyProvider>
          <PlannerProvider>
            <PageLoading />
            <Notifications />
            {properties.children}
            <AudioPlayer />
          </PlannerProvider>
        </StudyProvider>
      </WebSocketProvider>
    </MetaProvider>
  );
};

export default App;
