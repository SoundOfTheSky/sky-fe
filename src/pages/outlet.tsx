import { Outlet } from '@solidjs/router';

import Sidebar from '@/components/global/sidebar';
import AudioPlayer from '@/components/audio-player';

import s from './outlet.module.scss';

export default () => {
  return (
    <div class={s.outlet}>
      <Sidebar />
      <div class={s.content}>
        <Outlet />
        <AudioPlayer />
      </div>
    </div>
  );
};
