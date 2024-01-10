import Audio from '@/components/audio';
import Img from '@/components/img';
import IK from '@/main/study/components/ik';
import JPPitchAccent from '@/main/study/components/jp-pitch-accent';
import { JSX } from 'solid-js';

export default function parseHTML(text: string, autoplayAudio: number): JSX.Element[] {
  //const owner = getOwner();
  const body = document.createElement('body');
  body.innerHTML = text.replaceAll('\n', '<br>');
  let foundAudio = false;
  const replaceableElements: Record<string, (element: HTMLElement) => JSX.Element | (() => JSX.Element)> = {
    tab(element) {
      return <div data-tab={/*@once*/ element.getAttribute('title')}>{/*@once*/ [...element.childNodes]}</div>;
    },
    audio(element) {
      const f = foundAudio;
      if (autoplayAudio === 1) foundAudio = true;
      return (
        <Audio
          src={/*@once*/ element.getAttribute('s')!}
          title={/*@once*/ element.textContent!}
          autoplay={/*@once*/ !f && autoplayAudio > 0}
        />
      );
    },
    subject(element) {
      return (
        <a class='subject' href={/*@once*/ `/study/subjects/${element.getAttribute('uid')!}`} target='_blank'>
          {/*@once*/ [...element.childNodes]}
        </a>
      );
    },
    accent(element) {
      return <b>{/*@once*/ [...element.childNodes]}</b>;
    },
    example(element) {
      return <div class='example'>{/*@once*/ [...element.childNodes]}</div>;
    },
    warning(element) {
      return <div class='warning'>{/*@once*/ [...element.childNodes]}</div>;
    },
    ik(element) {
      return <IK>{/*@once*/ element.textContent}</IK>;
    },
    img(element) {
      return (
        <Img
          url={/*@once*/ element.getAttribute('src')!}
          alt={/*@once*/ element.getAttribute('alt') ?? undefined}
          class={/*@once*/ element.getAttribute('class') ?? undefined}
        />
      );
    },
    'jp-pitch-accent': (element) => {
      return <JPPitchAccent h={/*@once*/ element.getAttribute('h')!} p={/*@once*/ 2} />;
    },
  };
  function parse(tag: HTMLElement) {
    for (const child of tag.children as unknown as HTMLElement[]) {
      parse(child);
      const name = child.tagName.toLocaleLowerCase();
      if (name in replaceableElements) {
        let element = replaceableElements[name](child);
        while (typeof element === 'function') element = element();
        child.replaceWith(element as Node);
      }
    }
  }
  parse(body);
  return [...body.childNodes] as JSX.Element[];
}
