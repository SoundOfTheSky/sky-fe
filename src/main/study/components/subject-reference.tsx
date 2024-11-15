import { Component, JSX, Show } from 'solid-js'

import Dialog from '@/components/dialog'
import Button from '@/components/form/button'
import { atom } from '@/services/reactive'

import Subject from '../pages/subject'

import s from './subject-ref.module.scss'

const SubjectReference: Component<{ id: number, children: JSX.Element | string }> = (
  properties,
) => {
  // === State ===
  const dialogShown = atom(false)
  return (
    <span>
      <Button class={s.subjectRefBtn} onClick={() => dialogShown(true)}>
        {properties.children}
      </Button>
      <Show when={dialogShown()}>
        <Dialog dark onClose={() => dialogShown(false)}>
          <Subject id={properties.id} />
        </Dialog>
      </Show>
    </span>
  )
}
export default SubjectReference
