import { Router } from '@solidjs/router'
import { render } from 'solid-js/web'

import App from '@/app'

import Routes from './main/routes'

render(
  () => (
    <Router root={App}>
      <Routes />
    </Router>
  ),
  document.querySelector('#root')!,
)

// TODO: Offline mode
// TODO: Make all vocab/kanji as <subject>
// TODO: Open preview for <subject> instead of opening it
// TODO: Add mobile hints on buttons
// TODO: Remove spaces for answers in DB
// TODO: Preload content in subjects (images, audio)

declare global {
  function setTimeout<TArguments extends unknown[]>(
    callback: (...arguments_: TArguments) => void,
    ms?: number,
    ...arguments_: TArguments
  ): number
  function setInterval<TArguments extends unknown[]>(
    callback: (...arguments_: TArguments) => void,
    ms?: number,
    ...arguments_: TArguments
  ): number
}
