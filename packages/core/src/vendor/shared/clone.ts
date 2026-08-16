import { isObjectLike } from './path'

export interface FormValueContext {
  /** Dotted model path; empty string denotes the root. */
  path: string
}

export interface FormValuePolicy {
  /**
   * Return true to treat a value as opaque, false to traverse it, or undefined
   * to use the default (arrays/plain records are traversed; other objects are opaque).
   */
  isAtomic?: (
    value: unknown,
    context: FormValueContext,
  ) => boolean | undefined
  /** Clone values explicitly marked atomic by isAtomic. */
  clone?: (value: unknown, context: FormValueContext) => unknown
  /** Return undefined to use the default comparison. */
  equal?: (
    previous: unknown,
    next: unknown,
    context: FormValueContext,
  ) => boolean | undefined
}

function childPath(base: string, segment: string | number): string {
  return base ? `${base}.${segment}` : String(segment)
}

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!isObjectLike(value))
    return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

export function isAtomicValue(
  value: unknown,
  policy?: FormValuePolicy,
  path = '',
): boolean {
  if (!isObjectLike(value))
    return false
  const configured = policy?.isAtomic?.(value, { path })
  if (configured !== undefined)
    return configured
  return !Array.isArray(value) && !isPlainRecord(value)
}

function cloneRecursive<T>(
  value: T,
  policy: FormValuePolicy | undefined,
  path: string,
  seen: WeakMap<object, unknown>,
): T {
  if (value === null || typeof value !== 'object')
    return value

  const existing = seen.get(value)
  if (existing !== undefined)
    return existing as T

  const configuredAtomic = policy?.isAtomic?.(value, { path })
  if (configuredAtomic === true) {
    const cloned = policy?.clone
      ? policy.clone(value, { path })
      : value
    seen.set(value, cloned)
    return cloned as T
  }

  if (Array.isArray(value)) {
    const cloned: unknown[] = []
    seen.set(value, cloned)
    for (let index = 0; index < value.length; index++) {
      cloned.push(cloneRecursive(
        value[index],
        policy,
        childPath(path, index),
        seen,
      ))
    }
    return cloned as T
  }
  if (value instanceof Date)
    return new Date(value.getTime()) as T
  if (value instanceof RegExp)
    return new RegExp(value.source, value.flags) as T
  if (value instanceof Map) {
    let index = 0
    const cloned = new Map<unknown, unknown>()
    seen.set(value, cloned)
    for (const [key, item] of value) {
      cloned.set(
        cloneRecursive(key, policy, childPath(path, `$key${index}`), seen),
        cloneRecursive(item, policy, childPath(path, index), seen),
      )
      index += 1
    }
    return cloned as T
  }
  if (value instanceof Set) {
    let index = 0
    const cloned = new Set<unknown>()
    seen.set(value, cloned)
    for (const item of value) {
      cloned.add(cloneRecursive(item, policy, childPath(path, index), seen))
      index += 1
    }
    return cloned as T
  }

  if (configuredAtomic !== false && !isPlainRecord(value))
    return value

  const source = value as Record<string, unknown>
  const out: Record<string, unknown> = Object.create(Object.getPrototypeOf(value))
  seen.set(value, out)
  for (const key of Object.keys(source)) {
    out[key] = cloneRecursive(
      source[key],
      policy,
      childPath(path, key),
      seen,
    )
  }
  return out as T
}

export function deepClone<T>(
  value: T,
  policy?: FormValuePolicy,
  path = '',
): T {
  return cloneRecursive(value, policy, path, new WeakMap())
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
}

/** Deep-merge `patch` into `target` in place. Arrays are replaced, not merged by index. */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  patch: DeepPartial<T>,
  policy?: FormValuePolicy,
  basePath = '',
): T {
  for (const key of Object.keys(patch) as (keyof T)[]) {
    const pv = patch[key]
    if (pv === undefined)
      continue
    const tv = target[key]
    const path = childPath(basePath, String(key))
    if (
      isObjectLike(pv)
      && !Array.isArray(pv)
      && !isAtomicValue(pv, policy, path)
      && isObjectLike(tv)
      && !Array.isArray(tv)
      && !isAtomicValue(tv, policy, path)
    ) {
      deepMerge(
        tv as Record<string, unknown>,
        pv as DeepPartial<Record<string, unknown>>,
        policy,
        path,
      )
    }
    else {
      target[key] = deepClone(pv, policy, path) as T[keyof T]
    }
  }
  return target
}

/**
 * Restore an array element-wise, reusing the existing element objects at each
 * surviving position. Keeps row identity stable across `reset` / `setValues`,
 * which is what dynamic-array row keys and Vue's `v-for` patching depend on.
 *
 * Only `splice`/`push` are used: Vue 2 patches those, but cannot observe
 * `arr.length = n` or `arr[i] = v`, so index assignment would silently fail to
 * re-render a Vue 2.7 host.
 */
function restoreArrayInPlace(
  target: unknown[],
  baseline: ReadonlyArray<unknown>,
  policy: FormValuePolicy | undefined,
  basePath: string,
): void {
  if (target.length > baseline.length)
    target.splice(baseline.length)

  for (let index = 0; index < baseline.length; index++) {
    const b = baseline[index]
    const path = childPath(basePath, index)
    const bAtomic = isAtomicValue(b, policy, path)

    if (index >= target.length) {
      target.push(deepClone(b, policy, path))
      continue
    }

    const t = target[index]
    const tAtomic = isAtomicValue(t, policy, path)
    if (
      isObjectLike(b) && !Array.isArray(b) && !bAtomic
      && isObjectLike(t) && !Array.isArray(t) && !tAtomic
    ) {
      restoreInPlace(
        t as Record<string, unknown>,
        b as Record<string, unknown>,
        policy,
        path,
      )
      continue
    }
    if (Array.isArray(b) && Array.isArray(t) && !bAtomic && !tAtomic) {
      restoreArrayInPlace(t, b, policy, path)
      continue
    }
    target.splice(index, 1, deepClone(b, policy, path))
  }
}

/**
 * Restore `target` to the shape/value of `baseline` in place:
 * - nested records merged recursively
 * - arrays restored element-wise, reusing surviving element objects
 * - atomic values replaced
 * - extra keys on target deleted
 */
export function restoreInPlace<T extends Record<string, unknown>>(
  target: T,
  baseline: T,
  policy?: FormValuePolicy,
  basePath = '',
): T {
  const baseKeys = new Set(Object.keys(baseline))
  for (const key of Object.keys(target)) {
    if (!baseKeys.has(key))
      delete target[key as keyof T]
  }
  for (const key of baseKeys) {
    const b = baseline[key as keyof T]
    const t = target[key as keyof T]
    const path = childPath(basePath, key)
    if (
      isObjectLike(b)
      && !Array.isArray(b)
      && !isAtomicValue(b, policy, path)
      && isObjectLike(t)
      && !Array.isArray(t)
      && !isAtomicValue(t, policy, path)
    ) {
      restoreInPlace(
        t as Record<string, unknown>,
        b as Record<string, unknown>,
        policy,
        path,
      )
    }
    else if (
      Array.isArray(b)
      && Array.isArray(t)
      && !isAtomicValue(b, policy, path)
      && !isAtomicValue(t, policy, path)
    ) {
      restoreArrayInPlace(t, b, policy, path)
    }
    else {
      target[key as keyof T] = deepClone(b, policy, path) as T[keyof T]
    }
  }
  return target
}
