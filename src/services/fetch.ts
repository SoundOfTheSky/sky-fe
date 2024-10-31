import { createContext, useContext } from 'solid-js';

import BasicStore, { NotificationType } from '@/services/basic.store';
import { findErrorText } from '@/sky-utils';

export class RequestError<T = unknown> extends Error {
  public constructor(
    public code: number,
    public body?: T,
  ) {
    super(typeof body === 'string' ? body : '');
    this.name = 'RequestError';
  }
}
export const MAIN_URL = location.origin;

export type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  raw?: boolean;
  query?: Record<string, string>;
  useCache?: Map<string, unknown>;
  timeout?: number;
};
export type CommonRequestOptions = Omit<RequestOptions, 'raw'>;

/**
 *
 * @param url endpoint URL
 * @param options fetch options
 * @returns Body or Response if raw set to true in options
 */
export async function request(
  url: string,
  options: RequestOptions & {
    raw: true;
  },
): Promise<Response>;
export async function request<T>(
  url: string,
  options?: RequestOptions & {
    raw?: false;
  },
): Promise<T>;
export async function request<T>(
  url: string,
  options: RequestOptions = {},
): Promise<T | Response | undefined> {
  BasicStore.activeRequests((x) => x + 1);
  try {
    options.useCache ??= useContext(CacheContext);
    if (typeof options.body === 'object')
      options.body = JSON.stringify(options.body);
    if (options.query)
      url += `?${new URLSearchParams(options.query).toString()}`;
    let key: string;
    if (options.useCache) {
      key = `${url}|${options.raw ? 1 : 0}|${options.body as string}`;
      const val = options.useCache.get(key) as T | undefined;
      if (val) return val;
    }
    const controller = new AbortController();
    options.signal = controller.signal;
    const timeout = setTimeout(() => {
      controller.abort('Request timeout');
    }, options.timeout ?? 10000);
    const response = await fetch(url, options as RequestInit);
    clearTimeout(timeout);
    if (options.raw) {
      if (options.useCache) options.useCache.set(key!, response);
      return response;
    }
    const body = await getBody<T>(response);
    if (!response.ok) throw new RequestError(response.status, body);
    if (options.useCache) options.useCache.set(key!, body);
    return body;
  } catch (error) {
    if (error instanceof RequestError) throw error;
    if (error instanceof Error) throw new RequestError(0, error.message);
    throw new RequestError(0);
  } finally {
    BasicStore.activeRequests((x) => x - 1);
  }
}
function getBody<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  if (!contentType || contentType.startsWith('text'))
    return response.text() as Promise<T>;
  if (contentType.startsWith('application/json'))
    return response.json() as Promise<T>;
  return response.blob() as Promise<T>;
}

export const CacheContext = createContext<Map<string, unknown>>();

export function handleError(error: unknown) {
  let title = 'Unknown error';
  if (error instanceof RequestError) {
    if (error.code === 0 || error.code >= 500) BasicStore.online(false);
    if (error.body) title = findErrorText(error.body) ?? title;
    else title = error.message;
  } else title = findErrorText(error) ?? title;
  BasicStore.notify({
    title,
    type: NotificationType.Error,
    timeout: 10000,
  });
  console.error(error);
}

export const formatDBDate = (d: Date) =>
  `${d.getUTCFullYear()}-${`${d.getUTCMonth() + 1}`.padStart(2, '0')}-${d
    .getUTCDate()
    .toString()
    .padStart(2, '0')} ${d.getUTCHours().toString().padStart(2, '0')}:${d
    .getUTCMinutes()
    .toString()
    .padStart(2, '0')}:${d.getUTCSeconds().toString().padStart(2, '0')}`;
