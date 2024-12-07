import { HOUR_MS, noop } from '@softsky/utils'
import { batch, createRoot } from 'solid-js'

import basicStore from './basic.store'
import { RequestError, request } from './fetch'
import { atom, persistentAtom, useInterval } from './reactive'

export type User = {
  id: number
  created: number
  username: string
  status: number
  permissions: string[]
  avatar?: string
}

export default createRoot(() => {
  // === State ===
  const me = persistentAtom<User | undefined>('me')
  const ready = atom(false)
  const loading = atom(true)

  // === Effects ===
  // Then offline retry connection
  useInterval(() => {
    if (!basicStore.online()) void updateCurrentUser().catch(noop)
  }, 10_000)
  useInterval(updateCurrentUser, HOUR_MS)

  // === Functions ===
  async function updateCurrentUser() {
    loading(true)
    try {
      const userData = await request<User>('/api/auth/me')
      batch(() => {
        me(userData)
        basicStore.online(true)
        loading(false)
      })
      return userData
    }
    catch (error) {
      if (error instanceof RequestError) {
        if (error.code >= 400 && error.code < 500) me(undefined)
        else {
          basicStore.online(false)
          throw error
        }
      }
    }
    finally {
      loading(false)
    }
  }
  async function register(body: { username: string, password: string }) {
    await request('/api/auth/register', {
      method: 'POST',
      body,
    })
    await updateCurrentUser()
  }
  async function login(body: { username: string, password: string }) {
    await request('/api/auth/login', {
      method: 'POST',
      body,
    })
    await updateCurrentUser()
  }
  async function logout() {
    await request('/api/auth/logout')
    await updateCurrentUser()
  }
  async function updateData(data: { avatar?: string, username?: string }) {
    me(
      await request<User>('/api/auth/me', {
        method: 'POST',
        body: data,
      }),
    )
  }

  void updateCurrentUser()
    .catch(noop)
    .finally(() => ready(true))

  return {
    me,
    register,
    login,
    updateCurrentUser,
    logout,
    loading,
    ready,
    updateData,
  }
})
