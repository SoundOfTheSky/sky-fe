import { ParentComponent } from 'solid-js';

import Sidebar from '@/components/global/sidebar';
import AudioPlayer from '@/components/audio-player';

import s from './layout.module.scss';

const Layout: ParentComponent = (properties) => {
  return (
    <div class={s.layout}>
      <Sidebar />
      <div class={s.content}>
        {properties.children}
        <AudioPlayer />
      </div>
    </div>
  );
};
export default Layout;
