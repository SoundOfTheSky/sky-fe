import { MetaProvider } from '@solidjs/meta'
import { createRenderEffect, ParentComponent } from 'solid-js'

import Modals from '@/components/global/modals'

import AudioPlayer from './components/audio-player'
import { persistentAtom } from './services/reactive'

import './classes.scss'
import './fonts.scss'
import './global.scss'

const App: ParentComponent = (properties) => {
  const fontPixelization = persistentAtom('fontPixelization', true)
  const JPFontPixelization = persistentAtom('JPFontPixelization', false)
  createRenderEffect(() => {
    document.body.classList.remove(
      'pixelated-font',
      'jp-pixelated-font',
      'all-pixelated-font',
    )
    if (fontPixelization() && JPFontPixelization())
      document.body.classList.add('all-pixelated-font')
    else if (fontPixelization()) document.body.classList.add('pixelated-font')
    else if (JPFontPixelization())
      document.body.classList.add('jp-pixelated-font')
  })

  return (
    <MetaProvider>
      <Modals />
      {properties.children}
      <AudioPlayer />
    </MetaProvider>
  )
}

export default App
