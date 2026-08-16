import {
  deepClone,
  deepMerge,
  getByPath,
  isObjectLike,
  isAtomicValue,
  isPlainRecord,
  restoreInPlace,
  setByPath,
  type DeepPartial,
  type FormValuePolicy,
} from './vendor/shared'
import {
  createFieldArray,
  shiftRowIndex,
  type FieldArrayOp,
} from './field-array'
import { createLinkageEngine, type LinkageEngine } from './linkage'
import {
  createOptionsEngine,
  type OptionsEngine,
} from './options-source'
import {
  createRulePatternContext,
  expandPathPattern,
  materializeRulesMap,
  mergeFieldRules,
  normalizeRuleInput,
  resolveRulesSource,
} from './rules'
import { DRAFT_SNAPSHOT_VERSION } from './types'
import type {
  CreateFormOptions,
  DraftRestoreReason,
  DraftRestoreResult,
  FieldMeta,
  FieldPath,
  FormApi,
  FormErrors,
  FormEvent,
  FormHostAdapter,
  FormResult,
  FormValidationResult,
  FormRulesMap,
  LinkageCtx,
  LinkageRule,
  RulesSource,
  SubmitAction,
  SubmitFailureResult,
  SubmitOutcome,
  SubmitResult,
} from './types'

/** Explicit successful API submission outcome. Returning `void` is equivalent. */
export function submitOk(): SubmitOutcome<never> {
  return { ok: true }
}

/** Typed API submission failure, optionally carrying field errors for the form state. */
export function submitFail<TError>(
  error: TError,
  options?: { errors?: FormErrors },
): SubmitOutcome<TError> {
  if (options?.errors === undefined)
    return { ok: false, error }
  return { ok: false, error, errors: options.errors }
}

function buildDeclarativeLinkage<
  T extends object,
  TSubmitError,
  TOutput extends object,
>(
  options: CreateFormOptions<T, TSubmitError, TOutput>,
): LinkageRule<T>[] {
  const rules: LinkageRule<T>[] = []
  const when = options.when
  if (when) {
    const patterns = Object.keys(when)
    const activeByPattern = new Map<string, Set<string>>()
    if (patterns.length) {
      rules.push({
        // Predicates may read arbitrary fields — re-run on any change.
        deps: '*',
        run: ({ setHidden, setFieldRules, clearValidate, values }) => {
          for (const pattern of patterns) {
            const paths = expandPathPattern(values, pattern)
            const active = new Set(paths)
            for (const stale of activeByPattern.get(pattern) ?? []) {
              if (active.has(stale))
                continue
              setHidden(stale, false)
              setFieldRules(stale, undefined)
              clearValidate(stale)
            }
            activeByPattern.set(pattern, active)

            const predicate = when[pattern]!
            for (const path of paths) {
              const context = createRulePatternContext(values, pattern, path)
              const visible = Boolean(predicate(values, context))
              setHidden(path, !visible)
              if (!visible) {
                setFieldRules(path, null)
                clearValidate(path)
              }
              else if (!options.whenRules?.[pattern]) {
                // Drop override so materialized base rules apply again.
                setFieldRules(path, undefined)
              }
            }
          }
        },
      })
    }
  }

  const whenRules = options.whenRules
  if (whenRules) {
    const patterns = Object.keys(whenRules)
    const activeByPattern = new Map<string, Set<string>>()
    if (patterns.length) {
      rules.push({
        deps: '*',
        run: ({ setFieldRules, clearValidate, values }) => {
          for (const pattern of patterns) {
            const paths = expandPathPattern(values, pattern)
            const active = new Set(paths)
            for (const stale of activeByPattern.get(pattern) ?? []) {
              if (active.has(stale))
                continue
              setFieldRules(stale, undefined)
              clearValidate(stale)
            }
            activeByPattern.set(pattern, active)

            const predicate = when?.[pattern]
            const resolveRules = whenRules[pattern]!
            for (const path of paths) {
              const context = createRulePatternContext(values, pattern, path)
              if (predicate && !predicate(values, context)) {
                setFieldRules(path, null)
                continue
              }
              setFieldRules(path, resolveRules(values, context) ?? null)
            }
          }
        },
      })
    }
  }
  return rules
}

function trimTopLevelStrings<T extends object>(
  values: T,
  valuePolicy?: FormValuePolicy,
): T {
  const out = deepClone(values, valuePolicy)
  const record = out as Record<string, unknown>
  for (const key of Object.keys(record)) {
    if (typeof record[key] === 'string')
      record[key] = record[key].trim()
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

/**
 * Merge a draft into the baseline shape: unknown draft paths are dropped,
 * missing or structurally mismatched paths fall back to the baseline value.
 * Arrays and atomic values are leaves — taken from the draft verbatim.
 */
function healDraftValues(
  draft: Record<string, unknown>,
  shape: Record<string, unknown>,
  path: string,
  droppedPaths: FieldPath[],
  filledPaths: FieldPath[],
): Record<string, unknown> {
  const healed: Record<string, unknown> = {}
  for (const [key, shapeValue] of Object.entries(shape)) {
    const childPath = path ? `${path}.${key}` : key
    if (!(key in draft)) {
      healed[key] = shapeValue
      filledPaths.push(childPath)
      continue
    }
    const draftValue = draft[key]
    if (isPlainRecord(shapeValue) && isPlainRecord(draftValue)) {
      healed[key] = healDraftValues(draftValue, shapeValue, childPath, droppedPaths, filledPaths)
      continue
    }
    if (isPlainRecord(shapeValue) || Array.isArray(shapeValue) !== Array.isArray(draftValue)) {
      healed[key] = shapeValue
      filledPaths.push(childPath)
      continue
    }
    healed[key] = draftValue
  }
  for (const key of Object.keys(draft)) {
    if (!(key in shape))
      droppedPaths.push(path ? `${path}.${key}` : key)
  }
  return healed
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
  valuePolicy?: FormValuePolicy,
): FieldPath[] {
  const configuredEqual = valuePolicy?.equal?.(previous, next, { path: base })
  if (configuredEqual !== undefined) {
    if (!configuredEqual && base)
      out.push(base)
    return out
  }
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
      diffChangedPaths(
        [...previous.entries()],
        [...next.entries()],
        base || '$',
        nested,
        valuePolicy,
      )
    if ((!(previous instanceof Map) || !(next instanceof Map) || nested.length) && base)
      out.push(base)
    return out
  }

  if (previous instanceof Set || next instanceof Set) {
    const nested: FieldPath[] = []
    if (previous instanceof Set && next instanceof Set)
      diffChangedPaths(
        [...previous.values()],
        [...next.values()],
        base || '$',
        nested,
        valuePolicy,
      )
    if ((!(previous instanceof Set) || !(next instanceof Set) || nested.length) && base)
      out.push(base)
    return out
  }

  if (
    isAtomicValue(previous, valuePolicy, base)
    || isAtomicValue(next, valuePolicy, base)
  ) {
    if (base)
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
      diffChangedPaths(previous[index], next[index], path, out, valuePolicy)
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
      diffChangedPaths(previous[key], next[key], path, out, valuePolicy)
    }
    return out
  }

  if (base)
    out.push(base)
  return out
}


export function createForm<
  T extends object,
  TSubmitError = never,
  TOutput extends object = T,
>(
  options: CreateFormOptions<T, TSubmitError, TOutput>,
): FormApi<T, TSubmitError, TOutput> {
  if (options.model !== undefined && options.createState !== undefined) {
    throw new Error(
      '[vformjs] model and createState are mutually exclusive. '
      + 'Pass an existing model or a state factory, not both.',
    )
  }
  const valuePolicy = options.valuePolicy
  const submitPolicy = options.submitPolicy ?? 'join'

  const sourceDefaults = typeof options.defaultValues === 'function'
    ? options.defaultValues()
    : options.defaultValues
  const initial = deepClone(sourceDefaults, valuePolicy)
  let baseline = deepClone(initial, valuePolicy)
  /** Immutable create-mode factory defaults (never rebased by edit). */
  const createDefaults = deepClone(initial, valuePolicy)
  const rawValues = deepClone(initial, valuePolicy) as T
  const values = options.model
    ?? (options.createState ? options.createState(rawValues) : rawValues)

  let rulesSource: RulesSource<T> | undefined = options.rules
  const fieldRuleOverrides = new Map<string, ReturnType<typeof normalizeRuleInput> | null>()
  const metaMap = new Map<string, FieldMeta>()
  let errors: FormErrors = {}
  let changedPaths: FieldPath[] = diffChangedPaths(
    baseline,
    values,
    '',
    [],
    valuePolicy,
  )
  changedPaths.sort((left, right) => left < right ? -1 : left > right ? 1 : 0)
  const changedPathSet = new Set<FieldPath>(changedPaths)
  let adapter: FormHostAdapter | undefined = options.adapter
  let submitting = false
  let activeSubmissionCount = 0
  let joinedSubmission:
    | Promise<SubmitResult<TOutput, unknown, T>>
    | undefined
  let form!: FormApi<T, TSubmitError, TOutput>

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
    const base = materializeRulesMap(
      resolveRulesSource(rulesSource, values),
      values,
    )
    return mergeFieldRules(base, fieldRuleOverrides, values)
  }

  const snapshotValues = (hiddenMode?: 'keep' | 'omit'): T => {
    const mode = hiddenMode ?? options.hiddenValues ?? 'keep'
    const cloned = deepClone(values, valuePolicy)
    if (mode === 'omit') {
      for (const [path, meta] of metaMap) {
        if (meta.hidden)
          setByPath(cloned, path, undefined)
      }
    }
    return cloned
  }

  let linkageEngine: LinkageEngine | undefined
  let optionsEngine: OptionsEngine | undefined

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

  const refreshChangedState = (paths?: ReadonlyArray<FieldPath>) => {
    let next: FieldPath[]

    if (!paths || paths.includes('*')) {
      next = diffChangedPaths(baseline, values, '', [], valuePolicy)
      changedPathSet.clear()
      for (const path of next)
        changedPathSet.add(path)
    }
    else {
      const scopes: FieldPath[] = []
      for (const path of paths) {
        let scope = path
        for (const changed of changedPathSet) {
          if (path.startsWith(`${changed}.`)) {
            scope = changed
            break
          }
        }
        if (scopes.some(existing =>
          scope === existing || scope.startsWith(`${existing}.`),
        )) {
          continue
        }
        for (let index = scopes.length - 1; index >= 0; index--) {
          if (scopes[index]!.startsWith(`${scope}.`))
            scopes.splice(index, 1)
        }
        scopes.push(scope)
      }

      for (const scope of scopes) {
        for (const changed of changedPathSet) {
          if (pathsOverlap(changed, scope))
            changedPathSet.delete(changed)
        }
        const scoped = diffChangedPaths(
          getByPath(baseline, scope),
          getByPath(values, scope),
          scope,
          [],
          valuePolicy,
        )
        for (const path of scoped)
          changedPathSet.add(path)
      }
      next = [...changedPathSet]
    }

    next.sort((left, right) => left < right ? -1 : left > right ? 1 : 0)
    if (
      changedPaths.length === next.length
      && changedPaths.every((path, index) => path === next[index])
    )
      return
    changedPaths = next
    emit({ type: 'dirty' })
  }

  const invalidateValidation = () => {
    if (activeValidation && !activeValidation.settled)
      activeValidation.controller.abort()
  }

  const notifyValues = (paths: FieldPath[]) => {
    invalidateValidation()
    if (deleteErrorsForPaths(paths))
      emit({ type: 'errors' })
    refreshChangedState(paths)
    emit({ type: 'values', paths })
    linkageEngine?.schedule(paths)
    optionsEngine?.refresh(paths)
  }

  /**
   * Structural array change. Row-scoped errors follow their row instead of the
   * whole array being wiped: removing row 2 must not clear row 0's message.
   */
  const notifyArray = (path: FieldPath, op: FieldArrayOp) => {
    const prefix = `${path}.`
    const survivors: FormErrors = {}
    let lowestTouched = Number.POSITIVE_INFINITY

    if (op.type !== 'clear') {
      for (const key of Object.keys(errors)) {
        if (!key.startsWith(prefix))
          continue
        const rest = key.slice(prefix.length)
        const dot = rest.indexOf('.')
        const index = Number(dot === -1 ? rest : rest.slice(0, dot))
        if (!Number.isInteger(index))
          continue
        const tail = dot === -1 ? '' : rest.slice(dot)
        const next = shiftRowIndex(index, op)
        if (next === undefined)
          continue
        lowestTouched = Math.min(lowestTouched, index, next)
        survivors[`${prefix}${next}${tail}`] = [...errors[key]!]
      }
    }

    notifyValues([path])

    if (Object.keys(survivors).length) {
      Object.assign(errors, survivors)
      emit({ type: 'errors' })
    }
    // Only rows at or after the first shifted index can be showing stale host
    // messages; earlier rows keep theirs.
    adapter?.clearValidate?.(
      Number.isFinite(lowestTouched) ? [`${prefix}${lowestTouched}`, path] : [path],
    )
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

  const invalidResult = (
    resultErrors: FormErrors,
  ): FormValidationResult<T, TOutput> => {
    const result: FormValidationResult<T, TOutput> = {
      ok: false,
      values: snapshotValues(),
      errors: cloneErrors(resultErrors),
    }
    if (options.throwOnInvalid)
      throw Object.assign(new Error('form invalid'), result)
    options.onInvalid?.(result.errors, { form })
    return result
  }
  type ValidationResult =
    | FormValidationResult<T, TOutput>
    | FormResult<T>

  interface ValidationRun {
    id: number
    paths: FieldPath[] | undefined
    controller: AbortController
    settled: boolean
    promise: Promise<ValidationResult>
  }

  let validationSequence = 0
  let activeValidation: ValidationRun | undefined

  const isCurrentValidation = (run: ValidationRun) =>
    activeValidation === run && !run.controller.signal.aborted

  const commitValidationErrors = (
    nextErrors: FormErrors,
    paths?: ReadonlyArray<FieldPath>,
  ) => {
    if (!paths) {
      setErrorState(nextErrors)
      return
    }
    const merged = cloneErrors(errors)
    for (const key of Object.keys(merged)) {
      if (key !== '_form' && paths.some(path => pathsOverlap(key, path)))
        delete merged[key]
    }
    Object.assign(merged, nextErrors)
    setErrorState(merged)
  }

  function rerouteValidation(run: ValidationRun): Promise<ValidationResult> {
    if (activeValidation && activeValidation !== run)
      return activeValidation.promise
    return startValidation(run.paths)
  }

  function startValidation(paths?: FieldPath[]): Promise<ValidationResult> {
    if (activeValidation && !activeValidation.settled)
      activeValidation.controller.abort()

    const run: ValidationRun = {
      id: ++validationSequence,
      paths,
      controller: new AbortController(),
      settled: false,
      promise: undefined as unknown as Promise<ValidationResult>,
    }
    activeValidation = run
    run.promise = performValidation(run)
    return run.promise
  }

  async function performValidation(run: ValidationRun): Promise<ValidationResult> {
    const list = run.paths
    const validationContext = {
      signal: run.controller.signal,
      validationId: run.id,
    }

    try {
      let resolved: ValidationResult | undefined

      if (options.resolver) {
        let input = snapshotValues()
        if (options.trimOnSuccess)
          input = trimTopLevelStrings(input, valuePolicy)
        const resolverContext = list
          ? { ...validationContext, paths: list }
          : validationContext
        try {
          resolved = await options.resolver(input, resolverContext)
        }
        catch (error) {
          if (!isCurrentValidation(run))
            return rerouteValidation(run)
          throw error
        }
        if (!isCurrentValidation(run))
          return rerouteValidation(run)

        if (!resolved.ok) {
          const resolverErrors = cloneErrors(resolved.errors)

          // Resolver errors are authoritative. Ask the host to project them,
          // but never replace the resolver result with host-specific behavior.
          if (adapter) {
            const errorPaths = Object.keys(resolverErrors).filter(path => path !== '_form')
            await adapter.validate(
              errorPaths.length ? errorPaths : list,
              validationContext,
            ).catch(() => undefined)
            if (!isCurrentValidation(run))
              return rerouteValidation(run)
          }

          commitValidationErrors(resolverErrors, list)
          return invalidResult(resolverErrors)
        }
      }

      if (adapter) {
        let host
        try {
          host = await adapter.validate(list, validationContext)
        }
        catch (error) {
          if (!isCurrentValidation(run))
            return rerouteValidation(run)
          throw error
        }
        if (!isCurrentValidation(run))
          return rerouteValidation(run)

        if (!host.valid && !(options.resolver && host.unbound)) {
          const hostErrors = cloneErrors(
            host.errors ?? { _form: ['Form validation failed'] },
          )
          commitValidationErrors(hostErrors, list)
          return invalidResult(hostErrors)
        }
      }
      else if (!options.resolver) {
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
      }

      if (list)
        clearErrorsInternal(list)
      else if (Object.keys(errors).length)
        setErrorState({})

      if (resolved)
        return resolved

      let output = snapshotValues()
      if (options.trimOnSuccess)
        output = trimTopLevelStrings(output, valuePolicy)
      return {
        ok: true,
        values: output as unknown as TOutput,
      }
    }
    finally {
      if (activeValidation === run)
        run.settled = true
    }
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
        valuePolicy,
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

  const optionSources = options.optionSources
  if (optionSources && Object.keys(optionSources).length) {
    optionsEngine = createOptionsEngine<T>(optionSources, {
      values: () => values as Readonly<T>,
      get: path => getByPath(values, path),
      expand: pattern => expandPathPattern(values, pattern),
      commit: (path, state) => {
        getMeta(path).options = state.items
        emit({ type: 'meta', path })
      },
      resetValue: (path) => {
        let next = getByPath(createDefaults, path)
        if (next === undefined) {
          // Rows beyond the factory defaults have no default of their own; use
          // the first row's leaf default so a cleared cell matches its siblings
          // (`''`) instead of becoming `undefined`.
          const firstRow = path.replace(/\.\d+\./g, '.0.')
          if (firstRow !== path)
            next = getByPath(createDefaults, firstRow)
        }
        setByPath(values, path, next)
        notifyValues([path])
      },
      onError: (error, path) => {
        if (typeof console !== 'undefined')
          console.error(`[vformjs] optionSources["${path}"] failed`, error)
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
          deepClone(partial, valuePolicy) as Record<string, unknown>,
          valuePolicy,
        )
      }
      else {
        deepMerge(
          values as Record<string, unknown>,
          partial as DeepPartial<Record<string, unknown>>,
          valuePolicy,
        )
      }
      notifyValues(opts?.merge === false ? ['*'] : Object.keys(partial as object))
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
          valuePolicy,
        )
        setErrorState({})
        emit({ type: 'reset' })
        notifyValues(['*'])
        adapter?.afterModelReset?.()
        adapter?.clearValidate?.()
        return
      }
      const list = Array.isArray(paths) ? paths : [paths]
      for (const path of list) {
        setByPath(
          values,
          path,
          deepClone(getByPath(baseline, path), valuePolicy, path),
        )
      }
      clearErrorsInternal(list)
      notifyValues(list)
      adapter?.clearValidate?.(list)
    },

    rebaseDefaults(next) {
      baseline = deepClone(next ?? values, valuePolicy)
      refreshChangedState()
    },

    getCreateDefaults() {
      return deepClone(createDefaults, valuePolicy)
    },

    snapshotDraft() {
      return {
        version: DRAFT_SNAPSHOT_VERSION,
        savedAt: new Date().toISOString(),
        values: deepClone(values, valuePolicy) as Record<string, unknown>,
      }
    },

    restoreDraft(snapshot): DraftRestoreResult {
      const rejected = (reason: DraftRestoreReason): DraftRestoreResult => ({
        status: 'fresh',
        reason,
        droppedPaths: [],
        filledPaths: [],
      })
      if (snapshot == null)
        return rejected('empty')
      if (!isPlainRecord(snapshot))
        return rejected('malformed')
      if (snapshot.version !== DRAFT_SNAPSHOT_VERSION)
        return rejected('unsupported-version')
      if (!isPlainRecord(snapshot.values))
        return rejected('malformed')

      const droppedPaths: FieldPath[] = []
      const filledPaths: FieldPath[] = []
      const healed = healDraftValues(
        snapshot.values,
        baseline as Record<string, unknown>,
        '',
        droppedPaths,
        filledPaths,
      )
      restoreInPlace(
        values as Record<string, unknown>,
        deepClone(healed, valuePolicy),
        valuePolicy,
      )
      setErrorState({})
      emit({ type: 'reset' })
      notifyValues(['*'])
      adapter?.afterModelReset?.()
      adapter?.clearValidate?.()
      return {
        status: droppedPaths.length || filledPaths.length ? 'healed' : 'restored',
        droppedPaths,
        filledPaths,
      }
    },

    /** Restore factory defaults + baseline (for load('create')). */
    resetToCreateDefaults() {
      baseline = deepClone(createDefaults, valuePolicy)
      restoreInPlace(
        values as Record<string, unknown>,
        createDefaults as Record<string, unknown>,
        valuePolicy,
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
    getOptionsState(path) {
      return optionsEngine?.state(path) ?? {
        items: getMeta(path).options,
        loading: false,
        error: undefined,
        loaded: false,
      }
    },
    reloadOptions(paths) {
      if (paths == null) {
        optionsEngine?.reload()
        return
      }
      optionsEngine?.reload(Array.isArray(paths) ? paths : [paths])
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

    getItemProps(path) {
      return adapter?.getItemProps?.(path, errors[path]?.[0])
        ?? { 'data-vform-path': path }
    },

    clearErrors: clearErrorsInternal,

    clearValidate(paths) {
      clearErrorsInternal(paths)
      const list = paths == null
        ? undefined
        : Array.isArray(paths) ? paths : [paths]
      adapter?.clearValidate?.(list)
    },

    validate(paths?: FieldPath | FieldPath[]) {
      const list = paths == null
        ? undefined
        : Array.isArray(paths) ? paths : [paths]
      return startValidation(list)
    },

    async validateField(paths?: FieldPath | FieldPath[]) {
      return paths == null ? form.validate() : form.validate(paths)
    },

    submit<TActionError = never>(
      handler?: SubmitAction<TOutput, TActionError, T, TSubmitError>,
    ): Promise<SubmitResult<TOutput, TSubmitError | TActionError, T>> {
      if (submitPolicy === 'join' && joinedSubmission) {
        return joinedSubmission as Promise<
          SubmitResult<TOutput, TSubmitError | TActionError, T>
        >
      }

      const submission = (async (): Promise<
        SubmitResult<TOutput, TSubmitError | TActionError, T>
      > => {
        activeSubmissionCount += 1
        if (activeSubmissionCount === 1) {
          submitting = true
          emit({ type: 'submit-start' })
        }
        try {
          const result = await form.validate()
          if (!result.ok) {
            if (options.scrollToError !== false)
              form.scrollToFirstError()
            return result
          }

          const output = result.values as TOutput
          const outcome = handler
            ? await handler(output, { form })
            : await options.onSubmit?.(output, { form })

          if (outcome && !outcome.ok) {
            const failure: SubmitFailureResult<
              TOutput,
              TSubmitError | TActionError
            > = {
              ok: false,
              values: output,
              submitError: outcome.error,
            }
            if (outcome.errors !== undefined) {
              setErrorState(outcome.errors)
              if (options.scrollToError !== false)
                form.scrollToFirstError()
              return {
                ...failure,
                errors: cloneErrors(outcome.errors),
              } as SubmitResult<TOutput, TSubmitError | TActionError, T>
            }
            return failure as SubmitResult<TOutput, TSubmitError | TActionError, T>
          }

          return { ok: true, values: output }
        }
        finally {
          activeSubmissionCount -= 1
          if (activeSubmissionCount === 0) {
            submitting = false
            emit({ type: 'submit-end' })
          }
          if (submitPolicy === 'join')
            joinedSubmission = undefined
        }
      })()

      if (submitPolicy === 'join') {
        joinedSubmission = submission as Promise<
          SubmitResult<TOutput, unknown, T>
        >
      }
      return submission
    },

    fieldArray(path, opts) {
      return createFieldArray(
        {
          values,
          notifyArray,
          notifyValues,
          cloneValue: (value, valuePath) =>
            deepClone(value, valuePolicy, valuePath),
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
  optionsEngine?.refreshAll()

  return form
}
