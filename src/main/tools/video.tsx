import { mdiSubtitles, mdiVideoBox } from '@mdi/js'
import { createWritableMemo } from '@solid-primitives/memo'
import { Show } from 'solid-js'

import Input from '@/components/form/input'
import Icon from '@/components/icon'
import Tooltip from '@/components/tooltip'
import VideoPlayer from '@/components/video-player'
import basicStore from '@/services/basic.store'
import { atom, atomize, useGlobalEvent } from '@/services/reactive'

import s from './video.module.scss'

const { t } = basicStore

export default function Video() {
  // === Hooks ===
  useGlobalEvent('dragover', (event) => {
    event.preventDefault()
  })
  useGlobalEvent('drop', (event) => {
    event.preventDefault()
    const items = event.dataTransfer?.items
    if (!items || items.length === 0) return
    void handleFile(
      [...items]
        .filter((item) => item.kind !== 'file')
        .map((item) => item.getAsFile()!)
        .filter(Boolean),
    )
  })

  // === State ===
  const ass = atom<string>()
  const videoFile = atom<File>()

  // === Memos ===
  const videoSource = atomize(
    createWritableMemo<string | undefined>((lastUrl) => {
      if (lastUrl) URL.revokeObjectURL(lastUrl)
      const $videoFile = videoFile()
      if ($videoFile) return URL.createObjectURL($videoFile)
    }, 'https://c1596291.big-sushi-rise.ru/route/?m=7928958&r=e46539a8e56990c8ed78c5ce3da95f36199603e9d99ac33426631e65d3f5483ac1aaf93ce6099bb7a2e97fc4d90dd37742fbbe363840a42011da30ee85cbf461228ac942a24c1007970e0299701a7a75465616d396ce9a74128fb783be85a54799eb4b461160667b12398fd639a1a90e4415514273abfe6bcca7043608fd633d4f22b2212dd5e4bc27a354454b860c05133a2b529ddec09bf7023051387ba61cbaae9cda745ded931daf7ec1d607b5bd128f17aefe5f3a4f265a66f6b8e702ac0b8d71f8b20a99797dbcfca9875a6861532a0e53f633f7c9ce540f4ea2cd7a32514a7d94ae2b5496d336dacde313060a9ebc87d6b30f309c33a64fafdc0b5009c6ecded9e2b7c5c61276ca60289bb0db8a7260b4ca8ce5349614cac24a291e779162be00f5d55f6f1f80fcb2b8000f46b95a945e8400be2fbf876e27df9dbe0bd91f36659a0cb2ddf6f71442fe37f085'),
  )

  // === Functions ===
  function selectFileDialog() {
    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = 'video/*,.ass'
    fileInput.addEventListener(
      'change',
      (event) => {
        const files = (event.target as HTMLInputElement).files
        if (!files || files.length === 0) return
        void handleFile([...files])
      },
      {
        once: true,
        passive: true,
      },
    )
    fileInput.click()
  }

  async function handleFile(files: File[]) {
    for (const file of files) {
      if (file.name.endsWith('.ass')) {
        ass(await file.text())
      } else videoFile(file)
    }
  }

  return (
    <div class={'card-container ' + s.videoPlayer}>
      <div class={'card ' + s.settings}>
        <button onClick={selectFileDialog}>
          {t('VIDEO_PLAYER.SELECT_FILES')}
        </button>
        <Input
          placeholder={t('VIDEO_PLAYER.VIDEO_URL')}
          onChange={(event) => videoSource(event.target.value)}
        />
        <Show when={!videoSource()}>
          <Tooltip content={t('VIDEO_PLAYER.NO_VIDEO')}>
            <Icon path={mdiVideoBox} size='32' color='#ff3737' />
          </Tooltip>
        </Show>
        <Show when={!ass()}>
          <Tooltip content={t('VIDEO_PLAYER.NO_SUBTITLES')}>
            <Icon path={mdiSubtitles} size='32' color='#ff3737' />
          </Tooltip>
        </Show>
      </div>
      <div class={'card ' + s.player}>
        <VideoPlayer src={videoSource()} />
      </div>
    </div>
  )
}
