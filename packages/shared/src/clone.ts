import { isObjectLike } from './path'

export function deepClone<T>(value: T): T {
  if (value === null || typeof value !== 'object')
    return value
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value)
    }
    catch {
      // fall through for non-cloneable values
    }
  }
  if (Array.isArray(value))
    return value.map(item => deepClone(item)) as T
  if (value instanceof Date)
    return new Date(value.getTime()) as T
  if (value instanceof Map) {
    return new Map(
      [...value.entries()].map(([k, v]) => [deepClone(k), deepClone(v)]),
    ) as T
  }
  if (value instanceof Set)
    return new Set([...value].map(v => deepClone(v))) as T

  const out: Record<string, unknown> = {}
  for (const key of Object.keys(value as object))
    out[key] = deepClone((value as Record<string, unknown>)[key])
  return out as T
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
}

/** Deep-merge `patch` into `target` in place. Arrays are replaced, not merged by index. */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  patch: DeepPartial<T>,
): T {
  for (const key of Object.keys(patch) as (keyof T)[]) {
    const pv = patch[key]
    if (pv === undefined)
      continue
    const tv = target[key]
    if (
      isObjectLike(pv)
      && !Array.isArray(pv)
      && isObjectLike(tv)
      && !Array.isArray(tv)
      && !(pv instanceof Date)
    ) {
      deepMerge(tv as Record<string, unknown>, pv as DeepPartial<Record<string, unknown>>)
    }
    else {
      target[key] = deepClone(pv) as T[keyof T]
    }
  }
  return target
}

/**
 * Restore `target` to the shape/value of `baseline` in place:
 * - nested objects merged recursively
 * - arrays replaced
 * - extra keys on target deleted
 */
export function restoreInPlace<T extends Record<string, unknown>>(
  target: T,
  baseline: T,
): T {
  const baseKeys = new Set(Object.keys(baseline))
  for (const key of Object.keys(target)) {
    if (!baseKeys.has(key))
      delete target[key as keyof T]
  }
  for (const key of baseKeys) {
    const b = baseline[key as keyof T]
    const t = target[key as keyof T]
    if (Array.isArray(b)) {
      target[key as keyof T] = deepClone(b) as T[keyof T]
    }
    else if (
      isObjectLike(b)
      && !(b instanceof Date)
      && isObjectLike(t)
      && !Array.isArray(t)
      && !(t instanceof Date)
    ) {
      restoreInPlace(
        t as Record<string, unknown>,
        b as Record<string, unknown>,
      )
    }
    else {
      target[key as keyof T] = deepClone(b) as T[keyof T]
    }
  }
  return target
}
