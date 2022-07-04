import { render } from 'solid-js/web';
import App from '@/app';

render(() => <App />, document.querySelector('#root')!);

// TODO: Offline mode
// TODO: Make all vocab/kanji as <subject>
// TODO: Open preview for <subject> instead of opening it
// TODO: Add mobile hints on buttons
// TODO: Remove spaces for answers in DB
// TODO: Preload content in subjects (images, audio)

declare global {
  function setTimeout<TArgs extends unknown[]>(callback: (...args: TArgs) => void, ms?: number, ...args: TArgs): number;
  function setInterval<TArgs extends unknown[]>(
    callback: (...args: TArgs) => void,
    ms?: number,
    ...args: TArgs
  ): number;
}
