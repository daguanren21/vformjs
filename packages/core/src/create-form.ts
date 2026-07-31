import {
  deepClone,
  deepMerge,
  getByPath,
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

  const notifyValues = (paths: FieldPath[]) => {
    emit({ type: 'values', paths })
    linkageEngine?.schedule(paths)
  }

  const clearErrorsInternal = (paths?: FieldPath | FieldPath[]) => {
    if (paths == null) {
      errors = {}
      emit({ type: 'errors' })
      return
    }
    const list = Array.isArray(paths) ? paths : [paths]
    for (const p of list)
      delete errors[p]
    emit({ type: 'errors' })
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
          console.error(`[veform] linkage[${index}] failed`, error)
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
        errors = {}
        emit({ type: 'reset' })
        emit({ type: 'errors' })
        notifyValues(['*'])
        adapter?.afterModelReset?.()
        adapter?.clearValidate?.()
        return
      }
      const list = Array.isArray(paths) ? paths : [paths]
      for (const p of list) {
        setByPath(values, p, deepClone(getByPath(baseline, p)))
        delete errors[p]
      }
      emit({ type: 'errors' })
      notifyValues(list)
      adapter?.clearValidate?.(list)
    },

    rebaseDefaults(next) {
      baseline = deepClone(next ?? values)
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
      errors = {}
      emit({ type: 'reset' })
      emit({ type: 'errors' })
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
      return { ...errors }
    },

    setFieldError(path, messages) {
      errors[path] = Array.isArray(messages) ? messages : [messages]
      emit({ type: 'errors' })
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
          ? localKeys.filter(k => list.some(p => k === p || k.startsWith(`${p}.`)))
          : localKeys
        if (relevant.length) {
          const filtered: FormErrors = {}
          for (const k of relevant)
            filtered[k] = errors[k]!
          const result: FormResult<T> = {
            ok: false,
            values: snapshotValues(),
            errors: filtered,
          }
          if (options.throwOnInvalid)
            throw Object.assign(new Error('form invalid'), result)
          options.onInvalid?.(filtered, { form })
          return result
        }
        let vals = snapshotValues()
        if (options.trimOnSuccess)
          vals = trimTopLevelStrings(vals)
        return { ok: true, values: vals }
      }

      const host = await adapter.validate(list)
      if (!host.valid) {
        errors = host.errors ?? errors
        emit({ type: 'errors' })
        const result: FormResult<T> = {
          ok: false,
          values: snapshotValues(),
          errors: host.errors ?? errors,
        }
        if (options.throwOnInvalid)
          throw Object.assign(new Error('form invalid'), result)
        options.onInvalid?.(result.errors, { form })
        return result
      }

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
