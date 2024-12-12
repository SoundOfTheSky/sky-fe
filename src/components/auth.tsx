import { ParentComponent, Show } from 'solid-js'

import AuthStore from '@/services/auth.store'
import { atom, useGlobalEvent } from '@/services/reactive'

import Input from './form/input'

import s from './auth.module.scss'

export default ((properties) => {
  // === Hooks ===
  useGlobalEvent('keypress', (event) => {
    if (AuthStore.me() || AuthStore.loading()) return
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
      await AuthStore.login({
        username: username().trim(),
        password: password().trim(),
      })
    }
    finally {
      sendingCredentials(false)
    }
  }
  async function register() {
    if (sendingCredentials()) return
    sendingCredentials(true)
    try {
      await AuthStore.register({
        username: username().trim(),
        password: password().trim(),
      })
    }
    finally {
      sendingCredentials(false)
    }
  }

  return (
    <Show
      when={AuthStore.me()}
      fallback={(
        <div class={s.authComponent}>
          <div class={s.card}>
            <div class={s.content}>
              <div class={s.welcome}>Авторизация</div>
              <Input
                value={username}
                name="username"
                placeholder="Имя пользователя"
                autocomplete="on"
                autofocus
              />
              <Input
                value={password}
                name="password"
                placeholder="Пароль"
                type="password"
              />
            </div>
            <div class={s.buttons}>
              <button onClick={login}>Войти</button>
              <button onClick={register}>Регистрация</button>
            </div>
          </div>
        </div>
      )}
    >
      {properties.children}
    </Show>
  )
}) as ParentComponent
