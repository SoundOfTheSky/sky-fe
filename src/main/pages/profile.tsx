import { mdiExitRun } from '@mdi/js'
import { createWritableMemo } from '@solid-primitives/memo'
import { Component } from 'solid-js'

import Auth from '@/components/auth'
import Input from '@/components/form/input'
import Toggle from '@/components/form/toggle'
import Icon from '@/components/icon'
import AuthStore from '@/services/auth.store'
import basicStore from '@/services/basic.store'
import { modalsStore, Severity } from '@/services/modals.store'
import { atomize, persistentAtom } from '@/services/reactive'

import s from './profile.module.scss'

const { t } = basicStore

export default (() => {
  // === State ===
  let avatarElement!: HTMLImageElement
  const avatar = atomize(createWritableMemo(() => AuthStore.me()?.avatar ?? ''))
  const imageURL = atomize(createWritableMemo(() => avatar()))
  const username = atomize(
    createWritableMemo(() => AuthStore.me()?.username ?? ''),
  )
  const fontPixelization = persistentAtom('fontPixelization', true)
  const JPFontPixelization = persistentAtom('JPFontPixelization', true)

  // === Functions ===
  async function userDataChange() {
    if (!avatarElement.complete || avatarElement.naturalHeight === 0) {
      modalsStore.notify({
        title: t('AUTH.AVATAR_LOAD_ERROR'),
        severity: Severity.ERROR,
        timeout: 5000,
      })
      return
    }
    await AuthStore.updateData({
      avatar: avatar(),
      username: username(),
    })
  }

  return (
    <Auth>
      <div class='card-container'>
        <div class='card'>
          <div class='card-title'>{t('AUTH.AVATAR')}</div>
          <img
            class={s.avatar}
            src={imageURL() || '/avatar.webp'}
            alt={t('AUTH.AVATAR')}
            ref={avatarElement}
          />
        </div>
        <div class={`card ${s.info}`}>
          <div class='card-title'>{t('AUTH.EDIT_PROFILE')}</div>
          <div class={s.field}>
            <div>{t('AUTH.USERNAME')}:</div>
            <Input
              value={username}
              placeholder={t('AUTH.USERNAME')}
              onChange={userDataChange}
            />
          </div>
          <div class={s.field}>
            <div>{t('AUTH.AVATAR')} (URL):</div>
            <Input value={avatar} placeholder='URL' onChange={userDataChange} />
          </div>
        </div>
        <div class={`card ${s.settings}`}>
          <div class='card-title'>Settings</div>
          <div class={s.field}>
            <Toggle value={fontPixelization} label='Pixel font' />
          </div>
          <div class={s.field}>
            <Toggle value={JPFontPixelization} label='ピクセルフォント' />
          </div>
        </div>
        <button class={`card ${s.logout}`} onClick={() => AuthStore.logout()}>
          <div>{t('AUTH.LOGOUT')}</div>
          <Icon path={mdiExitRun} size='48' />
        </button>
      </div>
    </Auth>
  )
}) as Component
