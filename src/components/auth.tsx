import { ParentComponent, Show } from 'solid-js'

import authStore from '@/services/auth.store'
import basicStore from '@/services/basic.store'
import { atom, useGlobalEvent } from '@/services/reactive'
import { getDefaultFields } from '@/sky-shared/database'

import Input from './form/input'

import s from './auth.module.scss'

export default ((properties) => {
  // === Hooks ===
  const { t } = basicStore
  useGlobalEvent('keypress', (event) => {
    if (authStore.me()) return
    if (event.code === 'Enter') void login()
  })

  // === State ===
  const sendingCredentials = atom(false)
  const username = atom('')
  const password = atom('')

  // === Functions ===
  async function login() {
    if (sendingCredentials()) return
    sendingCredentials(true)
    try {
      await authStore.login({
        username: username().trim(),
        password: password().trim(),
      })
    } finally {
      sendingCredentials(false)
    }
  }
  async function register() {
    if (sendingCredentials()) return
    sendingCredentials(true)
    try {
      await authStore.login({
        ...getDefaultFields(),
        username: username().trim(),
        password: password().trim(),
      })
    } finally {
      sendingCredentials(false)
    }
  }

  return (
    <Show
      when={authStore.me()}
      fallback={
        <div class={s.authComponent}>
          <div class={s.card}>
            <div class={s.content}>
              <div class={s.welcome}>{t('AUTH.TITLE')}</div>
              <Input
                value={username}
                name='username'
                placeholder={t('AUTH.USERNAME')}
                autocomplete='on'
                autofocus
              />
              <Input
                value={password}
                name='password'
                placeholder={t('AUTH.PASSWORD')}
                type='password'
              />
            </div>
            <div class={s.buttons}>
              <button onClick={login}>{t('AUTH.LOGIN')}</button>
              <button onClick={register}>{t('AUTH.REGISTER')}</button>
            </div>
          </div>
        </div>
      }
    >
      {properties.children}
    </Show>
  )
}) as ParentComponent
