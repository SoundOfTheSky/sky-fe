import {
  Accessor,
  createEffect,
  createRenderEffect,
  createResource,
  createSignal,
  InitializedResourceOptions,
  InitializedResourceReturn,
  NoInfer,
  onCleanup,
  ResourceFetcher,
  ResourceOptions,
  ResourceReturn,
  ResourceSource,
  Setter,
  SignalOptions,
} from 'solid-js';

import * as broadcastChannel from '@/services/broadcast-channel';
import { createDebouncedFunction, deepEquals, log } from 'sky-utils';

// === Reactive ===
export type Atom<in out T> = (setTo?: Parameters<Setter<T>>[0]) => T;
export function atomize<T>([state, setState]: [
  Accessor<T>,
  Setter<T>,
]): Atom<T> {
  return (...arguments_) =>
    arguments_.length === 1 ? setState(arguments_[0]!) : state();
}
export function atom<T>(): Atom<T | undefined>;
export function atom<T>(value: T, options?: SignalOptions<T>): Atom<T>;
export function atom<T>(value?: T, options: SignalOptions<T> = {}): Atom<T> {
  options.equals ??= deepEquals;
  // eslint-disable-next-line solid/reactivity
  return atomize(createSignal<T>(value as T, options));
}
const tabSynchedAtomMap = new Map<string, Atom<unknown>>();
export function tabSynchedAtom<T>(key: string): Atom<T | undefined>;
export function tabSynchedAtom<T>(key: string, initialValue: T): Atom<T>;
export function tabSynchedAtom<T>(key: string, initialValue?: T): Atom<T> {
  if (tabSynchedAtomMap.has(key)) return tabSynchedAtomMap.get(key) as Atom<T>;
  const [state, setState] = createSignal<T>(initialValue as T, {
    equals: deepEquals,
  });
  broadcastChannel.send(`queryAtom_${key}`);
  // eslint-disable-next-line solid/reactivity
  broadcastChannel.on(`queryAtom_${key}`, () => {
    broadcastChannel.send(`atom_${key}`, JSON.stringify(state()));
  });
  broadcastChannel.on(`atom_${key}`, (data) => {
    try {
      setState(JSON.parse(data!) as Parameters<Setter<T>>[0]);
    } catch {
      setState(undefined as Parameters<Setter<T>>[0]);
    }
  });
  const atom: Atom<T> = (...arguments_) => {
    if (arguments_.length === 0) return state();
    const data = setState(arguments_[0]!);
    broadcastChannel.send(`atom_${key}`, JSON.stringify(data));
    return data;
  };
  tabSynchedAtomMap.set(key, atom as Atom<unknown>);
  return atom;
}
export function persistentAtom<T>(key: string, initialValue: T): Atom<T> {
  const rawData = localStorage.getItem(key);
  const state = tabSynchedAtom<T>(
    key,
    !rawData || rawData === 'undefined'
      ? initialValue
      : (JSON.parse(rawData) as T),
  );
  createEffect(() => {
    localStorage.setItem(key, JSON.stringify(state()));
  });
  return state;
}
/** Isn't called untill subscribed */
export function createLazyResource<T, R = unknown>(
  fetcher: ResourceFetcher<true, T, R>,
  options: InitializedResourceOptions<NoInfer<T>, true>,
): InitializedResourceReturn<T, R>;
export function createLazyResource<T, R = unknown>(
  fetcher: ResourceFetcher<true, T, R>,
  options?: ResourceOptions<NoInfer<T>, true>,
): ResourceReturn<T, R>;
export function createLazyResource<T, S, R = unknown>(
  source: ResourceSource<S>,
  fetcher: ResourceFetcher<S, T, R>,
  options: InitializedResourceOptions<NoInfer<T>, S>,
): InitializedResourceReturn<T, R>;
export function createLazyResource<T, S, R = unknown>(
  source: ResourceSource<S>,
  fetcher: ResourceFetcher<S, T, R>,
  options?: ResourceOptions<NoInfer<T>, S>,
): ResourceReturn<T, R>;
export function createLazyResource<T, S, R = unknown>(
  ...args: unknown[]
): ResourceReturn<T, R> | InitializedResourceReturn<T, R> {
  let resource: ResourceReturn<T, R> | undefined;
  const getResource = () => {
    if (!resource)
      resource = createResource<T, S, R>(
        ...(args as Parameters<typeof createResource<T, S, R>>),
      );
    return resource;
  };
  return [
    () => getResource()[0](),
    {
      mutate: (...args: Parameters<ResourceReturn<T, R>['1']['mutate']>) =>
        getResource()[1].mutate(...args),
      refetch: (...args: Parameters<ResourceReturn<T, R>['1']['refetch']>) =>
        getResource()[1].refetch(...args),
    },
  ] as ResourceReturn<T, R>;
}
/** Is recalced after some time */
export function createDebouncedMemo<T>(
  fn: (last: T | undefined) => T,
  time: number,
) {
  const memoValue = atom<T>();
  const debounced = createDebouncedFunction(fn, time);
  createEffect<T | undefined>((lastVal) => {
    try {
      const newVal = debounced(lastVal);
      memoValue(newVal as Setter<T>);
      return newVal;
    } catch {
      return lastVal;
    }
  });
  return memoValue;
}

// === Auto disposable ===
export function useInterval(handler: () => unknown, time: number) {
  const interval = setInterval(handler, time);
  onCleanup(() => {
    clearInterval(interval);
  });
  return interval;
}
export function useTimeout(handler: () => unknown, time: number) {
  const timeout = setTimeout(handler, time);
  onCleanup(() => {
    clearTimeout(timeout);
  });
  return timeout;
}
export function useGlobalEvent<K extends keyof DocumentEventMap>(
  type: K,
  listener: (this: Document, ev: DocumentEventMap[K]) => unknown,
  options?: boolean | AddEventListenerOptions,
) {
  document.addEventListener(type, listener, options);
  onCleanup(() => {
    document.removeEventListener(type, listener);
  });
}
export function debugReactive(data: Record<string, () => unknown>) {
  const initial = Symbol('initial');
  for (const [title, accessor] of Object.entries(data)) {
    let lastVal: unknown = initial;
    createEffect(() => {
      const newVal = accessor();
      if (lastVal === initial) log(`[DEBUG] ${title}`, newVal);
      else
        log(
          `[DEBUG] ${title}`,
          structuredClone(lastVal),
          '>>>',
          structuredClone(newVal),
        );
      lastVal = newVal;
    });
  }
}

// === Use directives ===
export function resizeTextToFit(
  element: HTMLElement,
  accessor: () => [number, ...unknown[]],
) {
  const mounted = atom(false);
  onMounted(element, () => () => mounted(true));
  createRenderEffect(() => {
    let [fontSize] = accessor();
    if (!mounted()) return;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        do {
          element.style.fontSize = `${fontSize}px`;
          fontSize--;
        } while (element.scrollHeight !== element.clientHeight && fontSize > 3);
      }),
    );
  });
}
export function onOutside(
  element: HTMLElement,
  accessor: () => [string, () => unknown],
) {
  const [eventName, handler] = accessor();
  const onClick = (event_: Event) => {
    if (!element.contains(event_.target as HTMLElement)) handler();
  };
  document.body.addEventListener(eventName, onClick);
  onCleanup(() => {
    document.body.removeEventListener(eventName, onClick);
  });
}
export function onMounted(
  element: HTMLElement,
  accessor: () => (element: HTMLElement) => unknown,
) {
  const handler = accessor();
  if (element.isConnected) handler(element);
  else {
    const observer = new MutationObserver(() => {
      if (!element.isConnected) return;
      observer.disconnect();
      handler(element);
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
    onCleanup(() => {
      observer.disconnect();
    });
  }
}

declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
    interface Directives {
      onOutside: ReturnType<Parameters<typeof onOutside>[1]>;
      resizeTextToFit: ReturnType<Parameters<typeof resizeTextToFit>[1]>;
      onMounted: ReturnType<Parameters<typeof onMounted>[1]>;
    }
  }
}
