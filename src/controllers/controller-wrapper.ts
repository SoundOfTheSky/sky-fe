import { deepEquals } from '@softsky/utils'

import { handleError } from '@/services/fetch'

export enum ControllerStrategy {
  FIRST_LOCAL,
  FIRST_REMOTE,
  ONLY_LOCAL,
  ONLY_REMOTE,
}
export type WrapControllerOptions = {
  strategy?: ControllerStrategy
}
export function wrapControllerFunction<BODY, T>(
  local: (body: BODY) => Promise<T>,
  remote: (body: BODY) => Promise<T>,
  defaultOptions: WrapControllerOptions = {},
): (body: BODY) => Promise<T> {
  return async (body, options: WrapControllerOptions = {}) => {
    console.log(`[SYNC] Send body`, body)
    try {
      const allOptions = { ...defaultOptions, ...options }
      let localResponse, remoteResponse
      switch (allOptions.strategy) {
        case ControllerStrategy.FIRST_REMOTE: {
          remoteResponse = await remote(body)
          localResponse = await local(body)
          break
        }
        case ControllerStrategy.ONLY_LOCAL: {
          localResponse = await local(body)
          break
        }
        case ControllerStrategy.ONLY_REMOTE: {
          remoteResponse = await remote(body)
          break
        }
        default: {
          localResponse = await local(body)
          remoteResponse = await remote(body)
          break
        }
      }
      if (
        localResponse &&
        remoteResponse &&
        !deepEquals(localResponse, remoteResponse)
      )
        console.error(
          'Front and Back entities differ',
          JSON.stringify(localResponse, undefined, 2),
          JSON.stringify(remoteResponse, undefined, 2),
        )
      return (remoteResponse ?? localResponse) as T
    } catch (error) {
      handleError(error)
      throw error
    }
  }
}
