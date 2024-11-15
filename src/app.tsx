import { MetaProvider } from '@solidjs/meta'
import { ParentComponent, createRenderEffect } from 'solid-js'

import Notifications from '@/components/global/notifications'
import PageStatus from '@/components/global/page-status'
import { persistentAtom } from '@/services/reactive'

import AudioPlayer from './components/audio-player'
import { WebSocketProvider } from './services/web-socket.context'

import './fonts.scss'
import './global.scss'

const App: ParentComponent = (properties) => {
  const fontPixelization = persistentAtom('fontPixelization', true)
  const JPFontPixelization = persistentAtom('JPFontPixelization', false)
  createRenderEffect(() => {
    document.body.classList.remove('pixelated-font')
    document.body.classList.remove('jp-pixelated-font')
    document.body.classList.remove('all-pixelated-font')
    if (fontPixelization() && JPFontPixelization())
      document.body.classList.add('all-pixelated-font')
    else if (fontPixelization()) document.body.classList.add('pixelated-font')
    else if (JPFontPixelization())
      document.body.classList.add('jp-pixelated-font')
  })

  return (
    <MetaProvider>
      <WebSocketProvider>
        <PageStatus />
        <Notifications />
        {properties.children}
        <AudioPlayer />
      </WebSocketProvider>
    </MetaProvider>
  )
}

export default App
