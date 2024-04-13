import { ParentComponent } from 'solid-js';

import Sidebar from '@/components/global/sidebar';
import audioStore from '@/services/audio.store';

import s from './layout.module.scss';

const Layout: ParentComponent = (properties) => {
  const { queue } = audioStore;
  return (
    <div class={s.layout} style={{ height: queue().length > 0 ? 'calc(100dvh - 32px)' : '100dvh' }}>
      <Sidebar />
      <div class={s.content}>{properties.children}</div>
    </div>
  );
};
export default Layout;
