import { findErrorText, log, retry } from '@softsky/utils'
import { decode, encode } from 'cbor-x'
import { createContext, useContext } from 'solid-js'

import BasicStore from '@/services/basic.store'

import authStore from './auth.store'
import { modalsStore, Severity } from './modals.store'

export class RequestError<T = unknown> extends Error {
  public constructor(
    public code: number,
    public body?: T,
  ) {
    super(typeof body === 'string' ? body : '')
    this.name = 'RequestError'
  }
}
export const MAIN_URL = location.origin

export type RequestOptions = Omit<RequestInit, 'body' | 'headers'> & {
  body?: unknown
  headers?: Record<string, string>
  raw?: boolean
  query?: Record<string, string>
  useCache?: Map<string, unknown>
  timeout?: number
  retries?: number
  retryInterval?: number
  disableHandler?: boolean
}
export type CommonRequestOptions = Omit<RequestOptions, 'raw'>

/**
 *
 * @param url endpoint URL
 * @param options fetch options
 * @returns Body or Response if raw set to true in options
 */
export async function request(
  url: string,
  options: RequestOptions & {
    raw: true
  },
): Promise<Response>
export async function request<T>(
  url: string,
  options?: RequestOptions & {
    raw?: false
  },
): Promise<T>
export async function request<T>(
  url: string,
  options: RequestOptions = {},
): Promise<T | Response | undefined> {
  log(`[REQUEST] ${options.method ?? 'GET'} ${url}`, options.body)
  BasicStore.activeRequests((x) => x + 1)
  try {
    options.useCache ??= useContext(CacheContext)
    if (
      typeof options.body === 'object' &&
      !(
        options.body instanceof ArrayBuffer ||
        options.body instanceof Blob ||
        options.body instanceof DataView ||
        options.body instanceof File ||
        options.body instanceof FormData ||
        options.body instanceof URLSearchParams ||
        options.body instanceof ReadableStream
      )
    )
      options.body = encode(options.body)
    if (options.query)
      url += `?${new URLSearchParams(options.query).toString()}`
    let key: string
    if (options.useCache) {
      key = `${url}|${options.raw ? 1 : 0}|${options.body as string}`
      const value = options.useCache.get(key) as T | undefined
      log(`[RESPONSE] (cached) ${options.method ?? 'GET'} ${url}`, value)
      if (value) return value
    }
    return await retry(
      async () => {
        let timeout
        if (!options.signal) {
          const controller = new AbortController()
          options.signal = controller.signal
          timeout = setTimeout(() => {
            controller.abort('Request timeout')
          }, options.timeout ?? 10_000)
        }
        options.headers ??= {}
        const $token = authStore.token()
        if ($token) options.headers.session = $token
        const response = await fetch(url, options as RequestInit)
        clearTimeout(timeout)
        if (options.raw) {
          if (options.useCache) options.useCache.set(key!, response)
          return response
        }
        const body = await getBody<T>(response)
        log(
          `[RESPONSE] ${options.method ?? 'GET'} ${url}`,
          response.status,
          body,
        )
        if (!response.ok) throw new RequestError(response.status, body)
        if (options.useCache) options.useCache.set(key!, body)
        return body
      },
      options.retries ?? 1,
      options.retryInterval ?? 1000,
      (error) =>
        error instanceof RequestError && error.code < 500 && error.code !== 0,
    )
  } catch (error) {
    console.error(error)
    if (!options.disableHandler) handleError(error)
    if (error instanceof RequestError) throw error
    if (error instanceof Error) throw new RequestError(0, error.message)
    throw new RequestError(0)
  } finally {
    BasicStore.activeRequests((x) => x - 1)
  }
}
function getBody<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type')
  if (!contentType || contentType.startsWith('text'))
    return response.text() as Promise<T>
  if (contentType.startsWith('application/cbor'))
    return response.arrayBuffer().then((x) => decode(new Uint8Array(x)) as T)
  if (contentType.startsWith('application/json'))
    return response.json() as Promise<T>
  return response.blob() as Promise<T>
}

export const CacheContext = createContext<Map<string, unknown>>()

export function handleError(error: unknown) {
  let title
  if (error instanceof RequestError) {
    if (error.code === 0 || error.code >= 500) BasicStore.online(false)
    title = error.body ? (findErrorText(error.body) ?? title) : error.message
    title ??= BasicStore.t(('HTTP_ERROR.' + error.code) as 'HTTP_ERROR.0')
  } else title = findErrorText(error) ?? title
  title ??= BasicStore.t('COMMON.UNKNOWN_ERROR')
  modalsStore.notify({
    title,
    severity: Severity.ERROR,
    timeout: 10_000,
  })
}
