import { MetaProvider } from '@solidjs/meta'
import { ParentComponent } from 'solid-js'

import Modals from '@/components/global/modals'
import PageStatus from '@/components/global/page-status'

import AudioPlayer from './components/audio-player'
import { WebSocketProvider } from './services/web-socket.context'

import './classes.scss'
import './fonts.scss'
import './global.scss'

const App: ParentComponent = (properties) => {
  // const fontPixelization = persistentAtom('fontPixelization', true)
  // const JPFontPixelization = persistentAtom('JPFontPixelization', false)
  // createRenderEffect(() => {
  //   document.body.classList.remove('pixelated-font')
  //   document.body.classList.remove('jp-pixelated-font')
  //   document.body.classList.remove('all-pixelated-font')
  //   if (fontPixelization() && JPFontPixelization())
  //     document.body.classList.add('all-pixelated-font')
  //   else if (fontPixelization()) document.body.classList.add('pixelated-font')
  //   else if (JPFontPixelization())
  //     document.body.classList.add('jp-pixelated-font')
  // })

  return (
    <MetaProvider>
      <WebSocketProvider>
        <PageStatus />
        <Modals />
        {properties.children}
        <AudioPlayer />
      </WebSocketProvider>
    </MetaProvider>
  )
}

export default App
