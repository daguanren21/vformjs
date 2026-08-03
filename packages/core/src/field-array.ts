import {
  createId,
  deepClone,
  getByPath,
  setByPath,
} from './vendor/shared'
import type { FieldArrayApi, FieldPath } from './types'

export interface FieldArrayOptions<TItem extends object> {
  defaultItem?: () => TItem
  keyName?: string
}

export interface FieldArrayHost<T extends object> {
  values: T
  notifyValues: (paths: FieldPath[]) => void
  clearValidate: (paths?: FieldPath | FieldPath[]) => void
  cloneValue?: <V>(value: V, path?: FieldPath) => V
}

function ensureArray<TItem, T extends object>(
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
  keys: WeakMap<object, string>,
): Array<{ key: string, index: number }> {
  return list.map((row, index) => {
    const explicitKey = row[keyName]
    if (typeof explicitKey === 'string' && explicitKey)
      return { key: explicitKey, index }

    let key = keys.get(row)
    if (!key) {
      key = createId('row')
      keys.set(row, key)
    }
    return { key, index }
  })
}

export function createFieldArray<
  T extends object,
  TItem extends object = Record<string, unknown>,
>(
  form: FieldArrayHost<T>,
  path: FieldPath,
  opts: FieldArrayOptions<TItem> = {},
): FieldArrayApi<TItem> {
  const keyName = opts.keyName ?? 'key'
  const keys = new WeakMap<object, string>()
  const cloneValue = <V>(value: V, itemPath?: FieldPath): V =>
    form.cloneValue?.(value, itemPath) ?? deepClone(value)

  const defaultItem = (itemPath?: FieldPath): TItem => {
    if (opts.defaultItem)
      return cloneValue(opts.defaultItem(), itemPath)
    return {} as TItem
  }

  const materialize = (
    item?: Partial<TItem> | TItem,
    itemPath?: FieldPath,
  ): TItem => ({
    ...defaultItem(itemPath),
    ...(item ? cloneValue(item, itemPath) : {}),
  }) as TItem

  const snapshotFields = () => {
    const list = ensureArray<TItem, T>(form, path) as unknown as Record<string, unknown>[]
    return readKeys(list, keyName, keys)
  }

  const touch = () => {
    form.notifyValues([path])
    form.clearValidate(path)
  }

  return {
    get fields() {
      return snapshotFields()
    },
    append(item) {
      const list = ensureArray<TItem, T>(form, path)
      list.push(materialize(item, `${path}.${list.length}`))
      touch()
    },
    prepend(item) {
      const list = ensureArray<TItem, T>(form, path)
      list.unshift(materialize(item, `${path}.0`))
      touch()
    },
    insert(index, item) {
      const list = ensureArray<TItem, T>(form, path)
      const i = Math.max(0, Math.min(index, list.length))
      list.splice(i, 0, materialize(item, `${path}.${i}`))
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
      list[index] = materialize(item, `${path}.${index}`)
      touch()
    },
    update(index, partial) {
      const list = ensureArray<TItem, T>(form, path)
      if (index < 0 || index >= list.length)
        return
      const cur = list[index]!
      Object.assign(cur, cloneValue(partial, `${path}.${index}`))
      touch()
    },
    clear() {
      setByPath(form.values, path, [])
      touch()
    },
  }
}
