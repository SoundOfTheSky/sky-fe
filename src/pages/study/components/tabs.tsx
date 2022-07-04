import { createMemo, Index, ParentComponent, children as createChildren, createEffect } from 'solid-js';
import { atom } from '@/services/reactive';

import s from './tabs.module.scss';

const Tabs: ParentComponent = (properties) => {
  let component: HTMLDivElement | undefined;
  const children = createChildren(() => properties.children);
  const tabs = createMemo(() => children.toArray().map((child) => (child as HTMLElement).dataset.tab!));
  const activeTabI = atom(0);
  const activeTabContent = createMemo(() => children.toArray()[activeTabI()]);
  createEffect(() => {
    tabs();
    activeTabI(0);
    if (component) component.scrollTop = 0;
  });
  return (
    <div class={s.tabsComponent} ref={component}>
      <div class={s.titles}>
        <Index each={tabs()}>
          {(tab, tabI) => (
            <button onClick={() => activeTabI(tabI)} classList={{ [s.active]: activeTabI() === tabI }}>
              {tab()}
            </button>
          )}
        </Index>
      </div>
      <div class={s.content}>{activeTabContent()}</div>
    </div>
  );
};
export default Tabs;
