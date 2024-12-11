import { Component, JSX, Show } from 'solid-js'

import Button from '@/components/form/button'
import Modal from '@/components/modal'
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
        <Modal dark onClose={() => dialogShown(false)}>
          <Subject id={properties.id} />
        </Modal>
      </Show>
    </span>
  )
}
export default SubjectReference
