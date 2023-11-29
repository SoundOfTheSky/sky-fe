import { Component, For } from 'solid-js';
import { mdiCloseCircle } from '@mdi/js';

import { Atom } from '@/services/reactive';
import Icon from './icon';

import s from './tags.module.scss';

const Tags: Component<{
  model: Atom<string[]>;
  placeholder: string;
  onChange?: (data: string[]) => unknown;
}> = (properties) => {
  function onInputChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const val = target.value;
    const curVals = properties.model();
    if (!val || curVals.includes(val)) return;
    const newVal = [...curVals, val];
    properties.model(newVal);
    target.value = '';
    properties.onChange?.(newVal);
  }
  function deleteTag(tag: string) {
    const newVal = properties.model().filter((t) => t !== tag);
    properties.model(newVal);
    properties.onChange?.(newVal);
  }
  return (
    <div class={s.tagsComponent}>
      <For each={properties.model()}>
        {(tag) => (
          <button class={s.tag} onClick={() => deleteTag(tag)}>
            <span>{tag}</span>
            <Icon path={mdiCloseCircle} inline size='16' />
          </button>
        )}
      </For>
      <input onChange={onInputChange} placeholder={properties.placeholder} type='text' />
    </div>
  );
};
export default Tags;
