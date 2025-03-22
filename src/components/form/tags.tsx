import { mdiCloseCircle } from '@mdi/js'
import { Component, For, JSX, splitProps } from 'solid-js'

import { Atom, atom } from '@/services/reactive'

import Icon from '../icon'

import Input from './input'

import s from './tags.module.scss'

const Tags: Component<
  JSX.HTMLAttributes<HTMLDivElement> & {
    value: Atom<string[]>
    placeholder: string
    onChange?: (data: string[]) => unknown
  }
> = (properties) => {
  // === State ===
  const [properties_, attributes] = splitProps(properties, [
    'value',
    'placeholder',
    'onChange',
  ])
  const inputValue = atom('')

  // === Functions ===
  function onInputChange(event: Event) {
    const target = event.target as HTMLInputElement
    const value = target.value
    const currentVals = properties_.value()
    if (!value || currentVals.includes(value)) return
    const newValue = [...currentVals, value]
    properties_.value(newValue)
    target.value = ''
    properties_.onChange?.(newValue)
  }
  function deleteTag(tag: string) {
    const newValue = properties_.value().filter((t) => t !== tag)
    properties_.value(newValue)
    properties_.onChange?.(newValue)
  }
  return (
    <div {...attributes} class={`${s.tagsComponent} ${attributes.class ?? ''}`}>
      <For each={properties_.value()}>
        {(tag) => (
          <button
            class={s.tag}
            onClick={() => {
              deleteTag(tag)
            }}
          >
            <span>{tag}</span>
            <Icon path={mdiCloseCircle} inline size='16' />
          </button>
        )}
      </For>
      <Input
        value={inputValue}
        onChange={onInputChange}
        placeholder={properties_.placeholder}
        type='text'
      />
    </div>
  )
}
export default Tags
