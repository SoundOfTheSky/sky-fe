import { findErrorText, retry } from '@softsky/utils'
import { createContext, useContext } from 'solid-js'

import BasicStore from '@/services/basic.store'

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

export type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
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
        options.body instanceof ReadableStream ||
        (typeof options.body === 'object' && ArrayBuffer.isView(options.body))
      )
    )
      options.body = JSON.stringify(options.body)
    if (options.query)
      url += `?${new URLSearchParams(options.query).toString()}`
    let key: string
    if (options.useCache) {
      key = `${url}|${options.raw ? 1 : 0}|${options.body as string}`
      const value = options.useCache.get(key) as T | undefined
      if (value) return value
    }
    return await retry(
      async () => {
        const controller = new AbortController()
        options.signal = controller.signal
        const timeout = setTimeout(() => {
          controller.abort('Request timeout')
        }, options.timeout ?? 10_000)
        const response = await fetch(url, options as RequestInit)
        clearTimeout(timeout)
        if (options.raw) {
          if (options.useCache) options.useCache.set(key!, response)
          return response
        }
        const body = await getBody<T>(response)
        if (!response.ok) throw new RequestError(response.status, body)
        if (options.useCache) options.useCache.set(key!, body)
        return body
      },
      options.retries ?? 6,
      options.retryInterval ?? 1000,
      (error) =>
        error instanceof RequestError && error.code < 500 && error.code !== 0,
    )
  } catch (error) {
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

export const formatDBDate = (d: Date) =>
  `${d.getUTCFullYear()}-${`${d.getUTCMonth() + 1}`.padStart(2, '0')}-${d
    .getUTCDate()
    .toString()
    .padStart(2, '0')} ${d.getUTCHours().toString().padStart(2, '0')}:${d
    .getUTCMinutes()
    .toString()
    .padStart(2, '0')}:${d.getUTCSeconds().toString().padStart(2, '0')}`
