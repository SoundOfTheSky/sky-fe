import { AnyFunction, formatNumber, log, setSafeTimeout } from '@softsky/utils'
import { createEffect, createMemo, createResource, createRoot } from 'solid-js'

import { createUserOrLogin, getUser } from '@/controllers/user.controller'
import { UserCreateDTO } from '@/sky-shared/controllers/user.controller'
import { extractJWTPayload } from '@/sky-shared/session'

import { persistentAtom } from './reactive'

export default createRoot(() => {
  // === State ===
  const token = persistentAtom<string | undefined>('token')
  let logoutTimeout: AnyFunction | undefined

  // === Effects ===
  // Logout automatically on token expiration
  createEffect(() => {
    const $session = session()
    if (!$session) return
    const now = Math.floor(Date.now() / 1000)
    logoutTimeout?.()
    const timeLeft = ($session.exp - now) * 1000
    log('[AUTH] Token expires in', formatNumber(timeLeft))
    logoutTimeout = setSafeTimeout(
      () => {
        console.error('TOKEN EXPIRED')
        token(undefined)
      },
      Math.max(0, timeLeft),
    )
  })

  // === Memos ===
  const session = createMemo(() => {
    const $token = token()
    return $token ? extractJWTPayload($token) : undefined
  })

  // === Resources ===
  const [me] = createResource(session, (session) =>
    getUser({ _id: session._id, session }),
  )

  // === Functions ===
  async function login(body: UserCreateDTO) {
    token(await createUserOrLogin(body))
  }

  return {
    login,
    token,
    session,
    me,
  }
})
