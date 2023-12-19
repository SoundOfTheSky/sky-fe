import { Component, For, JSX, splitProps } from 'solid-js';
import { mdiCloseCircle } from '@mdi/js';

import { Atom } from '@/services/reactive';
import Icon from '../icon';
import Button from './button';

import s from './tags.module.scss';

const Tags: Component<
  JSX.HTMLAttributes<HTMLDivElement> & {
    value: Atom<string[]>;
    placeholder: string;
    onChange?: (data: string[]) => unknown;
  }
> = (properties) => {
  const [props, attributes] = splitProps(properties, ['value', 'placeholder', 'onChange']);
  function onInputChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const val = target.value;
    const curVals = props.value();
    if (!val || curVals.includes(val)) return;
    const newVal = [...curVals, val];
    props.value(newVal);
    target.value = '';
    props.onChange?.(newVal);
  }
  function deleteTag(tag: string) {
    const newVal = props.value().filter((t) => t !== tag);
    props.value(newVal);
    props.onChange?.(newVal);
  }
  return (
    <div {...attributes} class={`${s.tagsComponent} ${attributes.class ?? ''}`}>
      <For each={props.value()}>
        {(tag) => (
          <Button class={s.tag} onClick={() => deleteTag(tag)}>
            <span>{tag}</span>
            <Icon path={mdiCloseCircle} inline size='16' />
          </Button>
        )}
      </For>
      <input onChange={onInputChange} placeholder={props.placeholder} type='text' />
    </div>
  );
};
export default Tags;
