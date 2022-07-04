import { createContext, useContext } from 'solid-js';

import BasicStore, { NotificationType } from '@/services/basic.store';

export class RequestError<T = unknown> extends Error {
  code;
  body;
  constructor(code: number, body: T) {
    super(typeof body === 'string' ? body : '');
    this.name = 'RequestError';
    this.code = code;
    this.body = body;
  }
}
export const MAIN_URL = location.origin;

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  raw?: boolean;
  query?: Record<string, string>;
  useCache?: Map<string, unknown>;
};
export type SimpleRequestOptions = Omit<RequestOptions, 'raw'>;

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
export async function request<T>(url: string, options: RequestOptions = {}): Promise<T | Response> {
  BasicStore.activeRequests((x) => x + 1);
  try {
    options.useCache ??= useContext(CacheContext);
    if (typeof options.body === 'object') options.body = JSON.stringify(options.body);
    if (options.query) url += `?${new URLSearchParams(options.query).toString()}`;
    let key: string;
    if (options.useCache) {
      key = `${url}|${options.raw ? 1 : 0}|${options.body as string}`;
      const val = options.useCache.get(key) as T | undefined;
      if (val) return val;
    }
    const response = await fetch(url, options as RequestInit);
    if (options.raw) {
      if (options.useCache) options.useCache.set(key!, response);
      return response;
    }
    const body = await getBody<T>(response);
    if (!response.ok) throw new RequestError(response.status, body);
    if (options.useCache) options.useCache.set(key!, body);
    return body;
  } finally {
    BasicStore.activeRequests((x) => x - 1);
  }
}
function getBody<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  if (!contentType || contentType.startsWith('text')) return response.text() as Promise<T>;
  if (contentType.startsWith('application/json')) return response.json() as Promise<T>;
  return response.blob() as Promise<T>;
}

export const CacheContext = createContext<Map<string, unknown>>();

export function showError(error: unknown) {
  let title = 'Unknown error';
  if (error instanceof RequestError) title = typeof error.body === 'string' ? error.body : error.message;
  else if (error instanceof Error) title = error.message;
  else if (typeof error === 'string') title = error;
  else if (typeof error === 'object' && error !== null) return showError(Object.values(error)[0]);
  BasicStore.notify({
    title,
    type: NotificationType.Error,
    timeout: 5000,
  });
}
