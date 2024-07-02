/**
 * Collection of pure utils for my code.
 */

// === Types ===
export type MakeOptional<Type, Key extends keyof Type> = Omit<Type, Key> & Partial<Pick<Type, Key>>;
// === Contst ===
export const DAY_MS = 86400000;
export const HOUR_MS = 3600000;
// === Formatting and logging ===
/** Milliseconds to human readable time. Minimum accuracy, if set to 1000 will stop at seconds  */
export function formatTime(time: number, min = 1) {
  const ranges = [
    [31_536_000_000, 'y'],
    [86_400_000, 'd'],
    [3_600_000, 'h'],
    [60_000, 'm'],
    [1000, 's'],
    [1, 'ms'],
  ] as const;
  let output = '';
  for (const [ms, title] of ranges) {
    if (min && time < min) break;
    if (time < ms) continue;
    const val = Math.floor(time / ms);
    if (val !== 0) output += ` ${val}${title}`;
    time %= ms;
  }
  return output;
}
/** thisCase to this-case */
export const camelToSnakeCase = (str: string) => str.replaceAll(/[A-Z]+/g, (letter) => `_${letter.toLowerCase()}`);
/**Bytes to KB,MB,GB,TB */
export function formatBytes(bytes: number) {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  if (!bytes) return `0B`;
  const pow = Math.floor(Math.log(bytes) / Math.log(1024));
  const maxPow = Math.min(pow, sizes.length - 1);
  return `${Number.parseFloat((bytes / Math.pow(1024, maxPow)).toFixed(2))}${sizes[maxPow]}`;
}
/** Logger (adds date to log)*/
export function log(...agrs: unknown[]) {
  console.log(new Date().toLocaleString('ru'), ...agrs);
}
/** Find substring between two strings */
export function findAllStringBetween(str: string, a: string, b: string) {
  const results = [];
  let startI = 0;
  while (true) {
    const i = str.indexOf(a, startI);
    if (i === -1) break;
    const i2 = str.indexOf(b, i + a.length);
    if (i2 === -1) break;
    results.push(str.slice(i + a.length, i2));
    startI = i2 + b.length;
  }
  return results;
}

// === Arrays ===
/** Random number between min and max. May enable float */
export function random(min: number, max: number, float?: boolean): number {
  const number_ = Math.random() * (max - min) + min;
  return float ? number_ : Math.round(number_);
}
export function randomFromArray<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}
/** Create new shuffled array */
export function shuffleArray<T>(arr: T[]): T[] {
  const array = [...arr];
  for (let i = 0; i < array.length; i++) {
    const i2 = Math.floor(Math.random() * array.length);
    const buf = array[i2];
    array[i2] = array[i];
    array[i] = buf;
  }
  return array;
}
/** Swap two elements in array */
export function swap<T>(arr: T[], i: number, i2: number) {
  const temp = arr[i2];
  arr[i2] = arr[i]!;
  arr[i] = temp;
  return arr;
}
/**
 * Binary search in sorted array.
 * Compare function should compare your needed value with value on index passed to it.
 * If compare returns 0 it means we found target.
 * If compare returns >0 it means we have to cut out bigger side of array.
 * If compare returns <0 it means we have to cut out smaller side of array.
 */
export function binarySearch(size: number, compare: (index: number) => number) {
  let low = 0;
  let high = size - 1;
  let position = -1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const compared = compare(mid);
    if (compared === 0) {
      position = mid;
      break;
    } else if (compared > 0) high = mid - 1;
    else low = mid + 1;
  }
  return position;
}
/**
 * All possible combinations of items in array
 */
export function allPossibleCombinations<T>(arr: T[]): T[][] {
  const combinations = [];
  const amount = 1 << arr.length;
  for (let i = 1; i < amount; i++) combinations.push(arr.filter((_, j) => (1 << j) & i));
  return combinations;
}

// === Control ===
/**
 * Creates cached function. All arguments/results are cached.
 * Returns [
 *  fn [cached function],
 *  delete [delete cached result for arguments]
 *  hash
 * ]
 */
export function createCashedFunction<T, V extends unknown[]>(fn: (...args: V) => T) {
  const hash = new Map<string, T>();
  return [
    (...args: V) => {
      const key = JSON.stringify(args);
      const value = hash.get(key);
      if (value) return value;
      const newValue = fn(...args);
      hash.set(key, newValue);
      return newValue;
    },
    (...args: V) => hash.delete(JSON.stringify(args)),
    hash,
  ] as const;
}
/**
 * Creates cached function. All arguments/results are cached. Will store in cache resolved data.
 * Returns [
 *  fn [cached function],
 *  delete [delete cached result for arguments]
 *  hash
 * ]
 */
export function createCashedAsyncFunction<T, V extends unknown[]>(fn: (...args: V) => Promise<T>) {
  const hash = new Map<string, T>();
  return [
    async (...args: V) => {
      const key = JSON.stringify(args);
      const value = hash.get(key);
      if (value) return value;
      const newValue = await fn(...args);
      hash.set(key, newValue);
      return newValue;
    },
    (...args: V) => hash.delete(JSON.stringify(args)),
    hash,
  ] as const;
}
/** Retry async function */
export async function retry<T>(fn: () => Promise<T>, retries: number, interval: number | number[] = 0): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    await wait(Array.isArray(interval) ? interval[interval.length - retries] : interval);
    return retry(fn, retries - 1, interval);
  }
}
/** setTimeout promisify */
export const wait = (time: number) => new Promise((r) => setTimeout(r, time));
/** Empty function that does nothing */
export const noop = () => {};
/** Find error in complex object */
const isTypeboxError = (e: unknown): e is { message: string; path: string } =>
  !!e &&
  typeof e === 'object' &&
  typeof e['message' as keyof typeof e] === 'string' &&
  typeof e['path' as keyof typeof e] === 'string';
const typeboxErrorToText = (e: { message: string; path: string }) => `${e.message} at ${e.path}`;
export function findErrorText(
  error: unknown,
  priorityErrorKeys = [
    'message',
    'messages',
    'msg',
    'msgs',
    'text',
    'txt',
    'error',
    'errors',
    'err',
    'body',
    'payload',
    'e',
  ],
): string | undefined {
  if (!error) return;
  if (typeof error === 'string') {
    try {
      return findErrorText(JSON.parse(error), priorityErrorKeys);
    } catch {
      return error;
    }
  }
  if (isTypeboxError(error)) return typeboxErrorToText(error);
  if (Array.isArray(error) && error.every(isTypeboxError)) return error.map(typeboxErrorToText).join('.\n');
  if (typeof error === 'object') {
    const keys = Object.keys(error)
      .map((k) => [k, priorityErrorKeys.indexOf(k)] as const)
      .map(([k, v]) => [k, v === -1 ? Infinity : v] as const)
      .toSorted(([_, v], [_k, v2]) => v - v2)
      .map(([k]) => k);
    for (const key of keys) {
      const found = findErrorText(error[key as keyof typeof error], priorityErrorKeys);
      if (found) return found;
    }
  }
}
