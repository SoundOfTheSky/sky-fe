import { JSX } from 'solid-js'

import Audio from '@/components/audio'
import IK from '@/main/study/components/ik'
import JPPitchAccent from '@/main/study/components/jp-pitch-accent'

import SubjectReference from '../components/subject-reference'

export default function parseHTML(
  text: string,
  autoplayAudio = 0,
): JSX.Element[] {
  // const owner = getOwner();
  const body = document.createElement('body')
  body.innerHTML = text.replaceAll('\n', '<br>')
  let foundAudio = false
  const replaceableElements: Record<
    string,
    (element: HTMLElement) => JSX.Element | (() => JSX.Element)
  > = {
    tab(element) {
      return (
        <div data-tab={/* @once */ element.getAttribute('title')}>
          {/* @once */ [...element.childNodes]}
        </div>
      )
    },
    audio(element) {
      const f = foundAudio
      if (autoplayAudio === 1) foundAudio = true
      return (
        <Audio
          src={/* @once */ element.getAttribute('s')!}
          title={/* @once */ element.textContent!}
          autoplay={/* @once */ !f && autoplayAudio > 0}
        />
      )
    },
    subject(element) {
      return (
        <SubjectReference
          id={/* @once */ Number.parseInt(element.getAttribute('uid')!)}
        >
          {/* @once */ [...element.childNodes]}
        </SubjectReference>
      )
    },
    accent(element) {
      return <span class='accent'>{/* @once */ [...element.childNodes]}</span>
    },
    example(element) {
      return <div class='example'>{/* @once */ [...element.childNodes]}</div>
    },
    warning(element) {
      return <div class='warning'>{/* @once */ [...element.childNodes]}</div>
    },
    ik(element) {
      return <IK>{/* @once */ element.textContent}</IK>
    },
    'jp-pitch-accent': (element) => {
      return (
        <JPPitchAccent
          h={/* @once */ element.getAttribute('h')!}
          p={/* @once */ Number.parseInt(element.getAttribute('p')!)}
        />
      )
    },
    'jp-conjugation': () => {
      return <div />
    },
  }
  function parse(tag: HTMLElement) {
    for (const child of tag.children as unknown as HTMLElement[]) {
      parse(child)
      const name = child.tagName.toLocaleLowerCase()
      if (name in replaceableElements) {
        let element = replaceableElements[name]!(child)
        while (typeof element === 'function') element = element()
        child.replaceWith(element as Node)
      }
    }
  }
  parse(body)
  return [...body.childNodes] as JSX.Element[]
}
