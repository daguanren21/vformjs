import {
  createId,
  deepClone,
  getByPath,
  setByPath,
} from './vendor/shared'
import type { FieldArrayApi, FieldPath } from './types'

export interface FieldArrayOptions<TItem extends Record<string, unknown>> {
  defaultItem?: () => TItem
  keyName?: string
}

export interface FieldArrayHost<T extends Record<string, unknown>> {
  values: T
  notifyValues: (paths: FieldPath[]) => void
  clearValidate: (paths?: FieldPath | FieldPath[]) => void
  runLinkage: (changed: FieldPath[]) => void
}

function ensureArray<TItem, T extends Record<string, unknown>>(
  form: FieldArrayHost<T>,
  path: FieldPath,
): TItem[] {
  const current = getByPath(form.values, path)
  if (Array.isArray(current))
    return current as TItem[]
  const next: TItem[] = []
  setByPath(form.values, path, next)
  return next
}

function readKeys(
  list: Record<string, unknown>[],
  keyName: string,
  cache: string[],
): Array<{ key: string, index: number }> {
  const fields: Array<{ key: string, index: number }> = []
  for (let i = 0; i < list.length; i++) {
    const row = list[i]!
    let key = row[keyName]
    if (typeof key !== 'string' || !key) {
      key = cache[i] ?? createId('row')
      row[keyName] = key
    }
    cache[i] = key as string
    fields.push({ key: key as string, index: i })
  }
  cache.length = list.length
  return fields
}

export function createFieldArray<
  T extends Record<string, unknown>,
  TItem extends Record<string, unknown> = Record<string, unknown>,
>(
  form: FieldArrayHost<T>,
  path: FieldPath,
  opts: FieldArrayOptions<TItem> = {},
): FieldArrayApi<TItem> {
  const keyName = opts.keyName ?? 'key'
  const keyCache: string[] = []

  const defaultItem = (): TItem => {
    if (opts.defaultItem)
      return deepClone(opts.defaultItem())
    return { [keyName]: createId('row') } as TItem
  }

  const materialize = (item?: Partial<TItem> | TItem): TItem => {
    const base = defaultItem()
    const merged = {
      ...base,
      ...(item ? deepClone(item) : {}),
    } as TItem
    if (typeof (merged as Record<string, unknown>)[keyName] !== 'string')
      (merged as Record<string, unknown>)[keyName] = createId('row')
    return merged
  }

  const snapshotFields = () => {
    const list = ensureArray<TItem, T>(form, path) as unknown as Record<string, unknown>[]
    return readKeys(list, keyName, keyCache)
  }

  const touch = () => {
    form.notifyValues([path])
    form.clearValidate(path)
    form.runLinkage([path])
  }

  return {
    get fields() {
      return snapshotFields()
    },
    append(item) {
      const list = ensureArray<TItem, T>(form, path)
      list.push(materialize(item))
      touch()
    },
    prepend(item) {
      const list = ensureArray<TItem, T>(form, path)
      list.unshift(materialize(item))
      touch()
    },
    insert(index, item) {
      const list = ensureArray<TItem, T>(form, path)
      const i = Math.max(0, Math.min(index, list.length))
      list.splice(i, 0, materialize(item))
      touch()
    },
    remove(index) {
      const list = ensureArray<TItem, T>(form, path)
      const indexes = (Array.isArray(index) ? index : [index])
        .filter(i => i >= 0 && i < list.length)
        .sort((a, b) => b - a)
      for (const i of indexes)
        list.splice(i, 1)
      touch()
    },
    move(from, to) {
      const list = ensureArray<TItem, T>(form, path)
      if (
        from < 0
        || to < 0
        || from >= list.length
        || to >= list.length
        || from === to
      ) {
        return
      }
      const [row] = list.splice(from, 1)
      list.splice(to, 0, row!)
      touch()
    },
    replace(index, item) {
      const list = ensureArray<TItem, T>(form, path)
      if (index < 0 || index >= list.length)
        return
      list[index] = materialize(item)
      touch()
    },
    update(index, partial) {
      const list = ensureArray<TItem, T>(form, path)
      if (index < 0 || index >= list.length)
        return
      const cur = list[index]!
      list[index] = { ...cur, ...deepClone(partial) }
      touch()
    },
    clear() {
      setByPath(form.values, path, [])
      keyCache.length = 0
      touch()
    },
  }
}
