import {
  createId,
  deepClone,
  getByPath,
  setByPath,
} from './vendor/shared'
import type {
  FieldArrayActionOptions,
  FieldArrayApi,
  FieldArrayOptions,
  FieldPath,
  RuleInput,
} from './types'

/**
 * A structural array mutation, so the host can shift per-row state (errors,
 * host validation) with the rows instead of wiping the whole array.
 */
export type FieldArrayOp =
  | { type: 'insert', index: number }
  | { type: 'remove', indexes: ReadonlyArray<number> }
  | { type: 'move', from: number, to: number }
  | { type: 'replace', index: number }
  | { type: 'clear' }

/**
 * Where row `index` ends up after `op`, or `undefined` when its state is gone.
 * Indices are pre-mutation, so callers can remap state they captured before the
 * splice.
 */
export function shiftRowIndex(
  index: number,
  op: FieldArrayOp,
): number | undefined {
  switch (op.type) {
    case 'insert':
      return index >= op.index ? index + 1 : index
    case 'remove':
      if (op.indexes.includes(index))
        return undefined
      return index - op.indexes.filter(removed => removed < index).length
    case 'move':
      if (index === op.from)
        return op.to
      if (op.from < op.to)
        return index > op.from && index <= op.to ? index - 1 : index
      return index >= op.to && index < op.from ? index + 1 : index
    case 'replace':
      return index === op.index ? undefined : index
    case 'clear':
      return undefined
  }
}

export interface FieldArrayHost<T extends object> {
  values: T
  /** Structural change: shift row state, then notify. */
  notifyArray: (path: FieldPath, op: FieldArrayOp) => void
  /** Value-only change (`update`): notify the touched leaf paths. */
  notifyValues: (paths: FieldPath[]) => void
  setRules?: (path: FieldPath, rules: RuleInput) => void
  focusField?: (path: FieldPath) => void
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
  if (opts.rules !== undefined)
    form.setRules?.(path, opts.rules)

  const focusRow = (
    index: number,
    options?: FieldArrayActionOptions,
  ) => {
    const relativePath = options?.focus === false
      ? undefined
      : options?.focus ?? opts.focus
    const focusField = form.focusField
    if (!relativePath || !focusField)
      return
    const target = `${path}.${index}.${relativePath}`
    queueMicrotask(() => focusField(target))
  }
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

  return {
    get fields() {
      return snapshotFields()
    },
    append(item, options) {
      const list = ensureArray<TItem, T>(form, path)
      const index = list.length
      list.push(materialize(item, `${path}.${index}`))
      form.notifyArray(path, { type: 'insert', index })
      focusRow(index, options)
    },
    prepend(item, options) {
      const list = ensureArray<TItem, T>(form, path)
      list.unshift(materialize(item, `${path}.0`))
      form.notifyArray(path, { type: 'insert', index: 0 })
      focusRow(0, options)
    },
    insert(index, item, options) {
      const list = ensureArray<TItem, T>(form, path)
      const i = Math.max(0, Math.min(index, list.length))
      list.splice(i, 0, materialize(item, `${path}.${i}`))
      form.notifyArray(path, { type: 'insert', index: i })
      focusRow(i, options)
    },
    remove(index) {
      const list = ensureArray<TItem, T>(form, path)
      const indexes = (Array.isArray(index) ? index : [index])
        .filter(i => i >= 0 && i < list.length)
        .sort((a, b) => b - a)
      if (!indexes.length)
        return
      for (const i of indexes)
        list.splice(i, 1)
      form.notifyArray(path, { type: 'remove', indexes })
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
      form.notifyArray(path, { type: 'move', from, to })
    },
    replace(index, item) {
      const list = ensureArray<TItem, T>(form, path)
      if (index < 0 || index >= list.length)
        return
      list[index] = materialize(item, `${path}.${index}`)
      form.notifyArray(path, { type: 'replace', index })
    },
    update(index, partial) {
      const list = ensureArray<TItem, T>(form, path)
      if (index < 0 || index >= list.length)
        return
      const cur = list[index]!
      const patch = cloneValue(partial, `${path}.${index}`) as Record<string, unknown>
      Object.assign(cur, patch)
      // Value-only: touch just the assigned leaves so sibling rows keep their errors.
      form.notifyValues(Object.keys(patch).map(key => `${path}.${index}.${key}`))
    },
    clear() {
      setByPath(form.values, path, [])
      form.notifyArray(path, { type: 'clear' })
    },
  }
}
