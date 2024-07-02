import { ParentComponent, createMemo } from 'solid-js';

import Sidebar from '@/main/components/sidebar';
import audioStore from '@/services/audio.store';
import basicStore from '@/services/basic.store';

import s from './layout.module.scss';

const Layout: ParentComponent = (properties) => {
  const { queue } = audioStore;
  const { online } = basicStore;
  const size = createMemo(() => {
    let s = 0;
    if (queue().length > 0) s += 32;
    if (!online()) s += 24;
    return s;
  });
  return (
    <div class={s.layout} style={{ height: size() ? `calc(100% - ${size()}px)` : '100%' }}>
      <Sidebar />
      <div class={s.content}>{properties.children}</div>
    </div>
  );
};
export default Layout;
