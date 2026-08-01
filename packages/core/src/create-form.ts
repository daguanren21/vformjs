import {
  deepClone,
  deepMerge,
  getByPath,
  isObjectLike,
  restoreInPlace,
  setByPath,
  type DeepPartial,
} from './vendor/shared'
import { createFieldArray } from './field-array'
import { createLinkageEngine, type LinkageEngine } from './linkage'
import {
  mergeFieldRules,
  normalizeRuleInput,
  resolveRulesSource,
} from './rules'
import type {
  CreateFormOptions,
  FieldMeta,
  FieldPath,
  FormApi,
  FormErrors,
  FormEvent,
  FormHostAdapter,
  FormResult,
  FormRulesMap,
  LinkageCtx,
  LinkageRule,
  RulesSource,
} from './types'

function buildDeclarativeLinkage<T extends Record<string, unknown>>(
  options: CreateFormOptions<T>,
): LinkageRule<T>[] {
  const rules: LinkageRule<T>[] = []
  const when = options.when
  if (when) {
    const paths = Object.keys(when)
    if (paths.length) {
      rules.push({
        // predicates read arbitrary fields (e.g. needInvoice) — re-run on any change
        deps: '*',
        run: ({ setHidden, setFieldRules, clearValidate, values }) => {
          for (const path of paths) {
            const visible = Boolean(when[path]?.(values))
            setHidden(path, !visible)
            if (!visible) {
              setFieldRules(path, null)
              clearValidate(path)
            }
            else if (!options.whenRules?.[path]) {
              // drop override so base rules apply again when shown
              setFieldRules(path, undefined)
            }
          }
        },
      })
    }
  }
  const whenRules = options.whenRules
  if (whenRules) {
    const paths = Object.keys(whenRules)
    if (paths.length) {
      rules.push({
        deps: '*',
        run: ({ setFieldRules, values }) => {
          for (const path of paths) {
            if (when?.[path] && !when[path]!(values)) {
              setFieldRules(path, null)
              continue
            }
            const next = whenRules[path]?.(values) ?? null
            setFieldRules(path, next)
          }
        },
      })
    }
  }
  return rules
}

function trimTopLevelStrings<T extends Record<string, unknown>>(values: T): T {
  const out = deepClone(values)
  for (const key of Object.keys(out)) {
    const v = out[key]
    if (typeof v === 'string')
      (out as Record<string, unknown>)[key] = v.trim()
  }
  return out
}

function defaultMeta(): FieldMeta {
  return { hidden: false, disabled: false }
}
function cloneErrors(source: FormErrors): FormErrors {
  const cloned: FormErrors = {}
  for (const [path, messages] of Object.entries(source)) {
    if (messages.length)
      cloned[path] = [...messages]
  }
  return cloned
}

function pathsOverlap(left: FieldPath, right: FieldPath): boolean {
  return left === right
    || left.startsWith(`${right}.`)
    || right.startsWith(`${left}.`)
}


/** Diff two form snapshots and return changed dotted leaf paths. */
export function diffChangedPaths(
  previous: unknown,
  next: unknown,
  base = '',
  out: FieldPath[] = [],
): FieldPath[] {
  if (Object.is(previous, next))
    return out

  if (previous instanceof Date || next instanceof Date) {
    if (
      (!(previous instanceof Date) || !(next instanceof Date) || previous.getTime() !== next.getTime())
      && base
    ) {
      out.push(base)
    }
    return out
  }

  if (previous instanceof RegExp || next instanceof RegExp) {
    if (
      (!(previous instanceof RegExp)
        || !(next instanceof RegExp)
        || previous.source !== next.source
        || previous.flags !== next.flags)
      && base
    ) {
      out.push(base)
    }
    return out
  }

  if (previous instanceof Map || next instanceof Map) {
    const nested: FieldPath[] = []
    if (previous instanceof Map && next instanceof Map)
      diffChangedPaths([...previous.entries()], [...next.entries()], '$', nested)
    if ((!(previous instanceof Map) || !(next instanceof Map) || nested.length) && base)
      out.push(base)
    return out
  }

  if (previous instanceof Set || next instanceof Set) {
    const nested: FieldPath[] = []
    if (previous instanceof Set && next instanceof Set)
      diffChangedPaths([...previous.values()], [...next.values()], '$', nested)
    if ((!(previous instanceof Set) || !(next instanceof Set) || nested.length) && base)
      out.push(base)
    return out
  }

  if (Array.isArray(previous) || Array.isArray(next)) {
    if (
      !Array.isArray(previous)
      || !Array.isArray(next)
      || previous.length !== next.length
    ) {
      if (base)
        out.push(base)
      return out
    }
    for (let index = 0; index < next.length; index++) {
      const path = base ? `${base}.${index}` : String(index)
      diffChangedPaths(previous[index], next[index], path, out)
    }
    return out
  }

  if (isObjectLike(previous) && isObjectLike(next)) {
    const keys = new Set([...Object.keys(previous), ...Object.keys(next)])
    for (const key of keys) {
      const path = base ? `${base}.${key}` : key
      if (!(key in previous) || !(key in next)) {
        out.push(path)
        continue
      }
      diffChangedPaths(previous[key], next[key], path, out)
    }
    return out
  }

  if (base)
    out.push(base)
  return out
}


export function createForm<T extends Record<string, unknown>>(
  options: CreateFormOptions<T>,
): FormApi<T> {
  const initial = deepClone(
    typeof options.defaultValues === 'function'
      ? options.defaultValues()
      : options.defaultValues,
  )
  let baseline = deepClone(initial)
  /** Immutable create-mode factory defaults (never rebased by edit). */
  const createDefaults = deepClone(initial)
  const rawValues = deepClone(initial) as T
  const values = options.createState
    ? options.createState(rawValues)
    : rawValues

  let rulesSource: RulesSource<T> | undefined = options.rules
  const fieldRuleOverrides = new Map<string, ReturnType<typeof normalizeRuleInput> | null>()
  const metaMap = new Map<string, FieldMeta>()
  let errors: FormErrors = {}
  let changedPaths: FieldPath[] = []
  let adapter: FormHostAdapter | undefined = options.adapter
  let submitting = false
  let form!: FormApi<T>

  const listeners = new Set<(event: FormEvent) => void>()
  const emit = (event: FormEvent) => {
    for (const listener of listeners)
      listener(event)
  }

  const getMeta = (path: FieldPath): FieldMeta => {
    const existing = metaMap.get(path)
    if (existing)
      return existing
    const created = defaultMeta()
    metaMap.set(path, created)
    return created
  }

  const computeRules = (): FormRulesMap => {
    const base = resolveRulesSource(rulesSource, values)
    return mergeFieldRules(base, fieldRuleOverrides)
  }

  const snapshotValues = (hiddenMode?: 'keep' | 'omit'): T => {
    const mode = hiddenMode ?? options.hiddenValues ?? 'keep'
    const cloned = deepClone(values)
    if (mode === 'omit') {
      for (const [path, meta] of metaMap) {
        if (meta.hidden)
          setByPath(cloned, path, undefined)
      }
    }
    return cloned
  }

  let linkageEngine: LinkageEngine | undefined

  const setErrorState = (next: FormErrors) => {
    errors = cloneErrors(next)
    emit({ type: 'errors' })
  }

  const deleteErrorsForPaths = (paths?: ReadonlyArray<FieldPath>): boolean => {
    const keys = Object.keys(errors)
    if (!keys.length)
      return false
    if (!paths || paths.includes('*')) {
      errors = {}
      return true
    }
    let changed = false
    for (const key of keys) {
      if (key !== '_form' && paths.some(path => pathsOverlap(key, path))) {
        delete errors[key]
        changed = true
      }
    }
    return changed
  }

  const refreshChangedState = () => {
    const next = diffChangedPaths(baseline, values)
    if (
      changedPaths.length === next.length
      && changedPaths.every((path, index) => path === next[index])
    )
      return
    changedPaths = next
    emit({ type: 'dirty' })
  }

  const notifyValues = (paths: FieldPath[]) => {
    if (deleteErrorsForPaths(paths))
      emit({ type: 'errors' })
    refreshChangedState()
    emit({ type: 'values', paths })
    linkageEngine?.schedule(paths)
  }

  const clearErrorsInternal = (paths?: FieldPath | FieldPath[]) => {
    if (paths == null) {
      setErrorState({})
      return
    }
    const list = Array.isArray(paths) ? paths : [paths]
    if (deleteErrorsForPaths(list))
      emit({ type: 'errors' })
  }

  const invalidResult = (resultErrors: FormErrors): FormResult<T> => {
    const result: FormResult<T> = {
      ok: false,
      values: snapshotValues(),
      errors: cloneErrors(resultErrors),
    }
    if (options.throwOnInvalid)
      throw Object.assign(new Error('form invalid'), result)
    options.onInvalid?.(result.errors, { form })
    return result
  }

  const createCtx = (): LinkageCtx<T> => ({
    get: path => getByPath(values, path),
    values: values as Readonly<T>,
    set: (path, value) => {
      setByPath(values, path, value)
      notifyValues([path])
    },
    patch: (partial) => {
      deepMerge(
        values as Record<string, unknown>,
        partial as DeepPartial<Record<string, unknown>>,
      )
      notifyValues(Object.keys(partial as object))
    },
    setHidden: (path, hidden) => {
      getMeta(path).hidden = hidden
      emit({ type: 'meta', path })
    },
    setDisabled: (path, disabled) => {
      getMeta(path).disabled = disabled
      emit({ type: 'meta', path })
    },
    setFieldRules: (path, rules) => {
      // undefined = drop override so base rules apply; null = force-clear field rules
      if (rules === undefined)
        fieldRuleOverrides.delete(path)
      else if (rules == null)
        fieldRuleOverrides.set(path, null)
      else
        fieldRuleOverrides.set(path, normalizeRuleInput(rules))
      emit({ type: 'rules' })
    },
    setOptions: (path, opts) => {
      getMeta(path).options = opts
      emit({ type: 'meta', path })
    },
    clearValidate: (paths) => {
      form.clearValidate(paths)
    },
    getMeta,
  })

  const allLinkage = [
    ...buildDeclarativeLinkage(options),
    ...(options.linkage ?? []),
  ]
  if (allLinkage.length) {
    linkageEngine = createLinkageEngine({
      rules: allLinkage,
      createCtx,
      onError: (error, index) => {
        if (typeof console !== 'undefined')
          console.error(`[vformjs] linkage[${index}] failed`, error)
      },
    })
  }

  form = {
    get values() {
      return values
    },
    get model() {
      return values
    },
    get submitting() {
      return submitting
    },
    get dirty() {
      return changedPaths.length > 0
    },
    get changedPaths() {
      return [...changedPaths]
    },


    getValues(opts) {
      return snapshotValues(opts?.hidden)
    },

    setValues(partial, opts) {
      if (opts?.merge === false) {
        restoreInPlace(
          values as Record<string, unknown>,
          deepClone(partial) as Record<string, unknown>,
        )
      }
      else {
        deepMerge(
          values as Record<string, unknown>,
          partial as DeepPartial<Record<string, unknown>>,
        )
      }
      notifyValues(Object.keys(partial as object))
    },

    setFieldValue(path, value) {
      setByPath(values, path, value)
      notifyValues([path])
    },

    getFieldValue<V = unknown>(path: FieldPath) {
      return getByPath<V>(values, path)
    },

    reset(paths) {
      if (paths == null) {
        restoreInPlace(
          values as Record<string, unknown>,
          baseline as Record<string, unknown>,
        )
        setErrorState({})
        emit({ type: 'reset' })
        notifyValues(['*'])
        adapter?.afterModelReset?.()
        adapter?.clearValidate?.()
        return
      }
      const list = Array.isArray(paths) ? paths : [paths]
      for (const path of list)
        setByPath(values, path, deepClone(getByPath(baseline, path)))
      clearErrorsInternal(list)
      notifyValues(list)
      adapter?.clearValidate?.(list)
    },

    rebaseDefaults(next) {
      baseline = deepClone(next ?? values)
      refreshChangedState()
    },

    getCreateDefaults() {
      return deepClone(createDefaults)
    },

    /** Restore factory defaults + baseline (for load('create')). */
    resetToCreateDefaults() {
      baseline = deepClone(createDefaults)
      restoreInPlace(
        values as Record<string, unknown>,
        createDefaults as Record<string, unknown>,
      )
      setErrorState({})
      emit({ type: 'reset' })
      notifyValues(['*'])
      adapter?.afterModelReset?.()
      adapter?.clearValidate?.()
    },

    getRules() {
      return computeRules()
    },

    setRules(rules) {
      rulesSource = rules
      emit({ type: 'rules' })
    },

    setFieldRules(path, rules) {
      // undefined = drop override (restore base rules)
      // null = force-clear field rules
      if (rules === undefined)
        fieldRuleOverrides.delete(path)
      else if (rules == null)
        fieldRuleOverrides.set(path, null)
      else
        fieldRuleOverrides.set(path, normalizeRuleInput(rules))
      emit({ type: 'rules' })
    },

    getMeta,
    setHidden(path, hidden) {
      getMeta(path).hidden = hidden
      emit({ type: 'meta', path })
    },
    setDisabled(path, disabled) {
      getMeta(path).disabled = disabled
      emit({ type: 'meta', path })
    },
    setOptions(path, opts) {
      getMeta(path).options = opts
      emit({ type: 'meta', path })
    },

    getErrors() {
      return cloneErrors(errors)
    },

    setFieldError(path, messages) {
      const list = Array.isArray(messages) ? messages : [messages]
      if (list.length)
        errors[path] = [...list]
      else
        delete errors[path]
      emit({ type: 'errors' })
    },

    setErrors(next) {
      setErrorState(next)
    },

    scrollToFirstError() {
      const path = Object.keys(errors).find(key => key !== '_form')
      if (path)
        adapter?.scrollToField?.(path)
      return path
    },

    clearErrors: clearErrorsInternal,

    clearValidate(paths) {
      clearErrorsInternal(paths)
      const list = paths == null
        ? undefined
        : Array.isArray(paths) ? paths : [paths]
      adapter?.clearValidate?.(list)
    },

    async validate(paths) {
      const list = paths == null
        ? undefined
        : Array.isArray(paths) ? paths : [paths]

      if (!adapter) {
        const localKeys = Object.keys(errors)
        const relevant = list
          ? localKeys.filter(key => list.some(path => pathsOverlap(key, path)))
          : localKeys
        if (relevant.length) {
          const filtered: FormErrors = {}
          for (const key of relevant)
            filtered[key] = [...errors[key]!]
          return invalidResult(filtered)
        }

        const hasUnboundRules = Object.entries(computeRules()).some(([path, rules]) =>
          rules.length > 0 && (!list || list.some(target => pathsOverlap(path, target))),
        )
        if (hasUnboundRules) {
          return invalidResult({
            _form: [
              '[vformjs] Form validation host is not bound. '
              + 'Pass an adapter, use a UI package, or use useZodForm().',
            ],
          })
        }

        let vals = snapshotValues()
        if (options.trimOnSuccess)
          vals = trimTopLevelStrings(vals)
        return { ok: true, values: vals }
      }

      const host = await adapter.validate(list)
      if (!host.valid) {
        const hostErrors = cloneErrors(
          host.errors ?? { _form: ['Form validation failed'] },
        )
        if (list) {
          const merged = cloneErrors(errors)
          for (const key of Object.keys(merged)) {
            if (key !== '_form' && list.some(path => pathsOverlap(key, path)))
              delete merged[key]
          }
          Object.assign(merged, hostErrors)
          setErrorState(merged)
        }
        else {
          setErrorState(hostErrors)
        }
        return invalidResult(hostErrors)
      }

      if (list)
        clearErrorsInternal(list)
      else if (Object.keys(errors).length)
        setErrorState({})

      let vals = snapshotValues()
      if (options.trimOnSuccess)
        vals = trimTopLevelStrings(vals)
      return { ok: true, values: vals }
    },

    async validateField(paths) {
      return form.validate(paths)
    },

    async submit(handler) {
      emit({ type: 'submit-start' })
      submitting = true
      try {
        const result = await form.validate()
        if (!result.ok)
          return result
        const run = handler ?? options.onSubmit
        if (run)
          await run(result.values, { form })
        return result
      }
      finally {
        submitting = false
        emit({ type: 'submit-end' })
      }
    },

    fieldArray(path, opts) {
      return createFieldArray(
        {
          values,
          notifyValues,
          clearValidate: paths => form.clearValidate(paths),
          runLinkage: paths => linkageEngine?.schedule(paths),
        },
        path,
        opts,
      )
    },

    notifyChange(paths) {
      if (paths == null) {
        notifyValues(['*'])
        return
      }
      const list = Array.isArray(paths) ? paths : [paths]
      notifyValues(list.length ? list : ['*'])
    },

    bindAdapter(next) {
      adapter = next
    },

    bindHost(instance) {
      adapter?.bind?.(instance)
    },

    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },

    getFormProps() {
      return {
        model: values,
        rules: computeRules(),
      }
    },
  }

  void linkageEngine?.runInit()

  return form
}
