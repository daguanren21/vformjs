import {
  createForm,
  deepClone,
  diffChangedPaths,
  DRAFT_SNAPSHOT_VERSION,
  type ConditionalRules,
  type CreateFormOptions,
  type FieldOptionsState,
  type FieldArrayApi,
  type FieldArrayOptions,
  type FieldPath,
  type FormApi,
  type FormEvent,
  type FormErrors,
  type FormItemBinding,
  type FormResult,
  type FormRulesInput,
  type FormRulesMap,
  type GetValuesMode,
  type LinkageRule,
  type OptionsSource,
  type RuleInput,
  type RulePatternContext,
  type RulesSource,
  type SubmitAction,
  type SubmitResult,
  type TypedFieldPath,
  type TypedFieldValue,
} from '@vformjs/core'
import type {
  ComputedRef,
  Ref,
  WritableComputedRef,
} from 'vue-demi'
import {
  computed,
  getCurrentScope,
  onScopeDispose,
  reactive,
  ref,
  shallowRef,
  toRaw,
  watch,
} from 'vue-demi'

export { diffChangedPaths, DRAFT_SNAPSHOT_VERSION }

/** Unified form modes: create / edit / detail all share useForm. */
export type FormMode = 'create' | 'edit' | 'detail'
export type ModelTracking = 'deep' | 'explicit'

/**
 * Runtime shape after `reactive()` unwrap. Docs/examples use:
 * `form.mode === 'edit'`, `form.submitting` as boolean.
 */
export interface UseFormReturn<
  T extends object,
  TSubmitError = never,
  TOutput extends object = T,
> {
  /** @internal Type-only marker used by form composition inference. */
  readonly __vformjsTypes?: {
    input: T
    output: TOutput
  }
  model: T
  rules: FormRulesMap
  /**
   * Bind any supported host form in one shot:
   * `<el-form v-bind="form.host" />`
   *
   * Also carries any adapter-supplied host props, so quirks like element's
   * `validate-on-rule-change` are neutralized without caller boilerplate.
   */
  host: {
    ref: (instance: unknown) => void
    model: T
    rules: FormRulesMap
  } & FormItemBinding
  /** Host-specific form-item props (`prop`, `path`, or `name`) plus errors. */
  item: (path: FieldPath) => FormItemBinding
  /**
   * Path-aware writable computed. Use with modelTracking: 'explicit' to avoid
   * full-model watch/clone work on large forms.
   */
  field: {
    <Path extends TypedFieldPath<T>>(
      path: Path,
    ): WritableComputedRef<TypedFieldValue<T, Path>>
    <TValue = unknown>(path: FieldPath): WritableComputedRef<TValue>
  }
  validating: boolean
  submitting: boolean
  /** Logical submit attempts since the last reset or load. */
  submitCount: number
  /** Whether the latest completed submit attempt succeeded. */
  submitOk: boolean
  /** Reactive snapshot of core and server-side field errors. */
  errors: Readonly<FormErrors>
  /** True when the model differs from the current reset baseline. */
  dirty: boolean
  /** Dotted leaf paths that differ from the current reset baseline. */
  changedPaths: ReadonlyArray<FieldPath>

  /** create | edit | detail */
  mode: FormMode
  /** detail => true */
  readonly: boolean
  /** create | edit => true */
  editable: boolean

  setMode: (mode: FormMode) => void
  /**
   * Load form state for create / edit / detail.
   * Call this **inside the dialog component or page**, not from the list page.
   *
   * - create: `form.load('create')`
   * - edit:   `form.load('edit', detail)`
   * - detail: `form.load('detail', detail)`
   */
  load: (mode: FormMode, values?: Partial<T>) => void

  submit: FormApi<T, TSubmitError, TOutput>['submit']
  validate: FormApi<T, TSubmitError, TOutput>['validate']
  validateField: FormApi<T, TSubmitError, TOutput>['validateField']
  reset: FormApi<T, TSubmitError, TOutput>['reset']
  setFieldValue: FormApi<T, TSubmitError, TOutput>['setFieldValue']
  getFieldValue: FormApi<T, TSubmitError, TOutput>['getFieldValue']
  setValues: FormApi<T, TSubmitError, TOutput>['setValues']
  getValues: FormApi<T, TSubmitError, TOutput>['getValues']
  setErrors: FormApi<T, TSubmitError, TOutput>['setErrors']
  setFieldError: FormApi<T, TSubmitError, TOutput>['setFieldError']
  clearErrors: FormApi<T, TSubmitError, TOutput>['clearErrors']
  scrollToFirstError: FormApi<T, TSubmitError, TOutput>['scrollToFirstError']
  clearValidate: FormApi<T, TSubmitError, TOutput>['clearValidate']
  notifyChange: FormApi<T, TSubmitError, TOutput>['notifyChange']
  rebaseDefaults: FormApi<T, TSubmitError, TOutput>['rebaseDefaults']
  snapshotDraft: FormApi<T, TSubmitError, TOutput>['snapshotDraft']
  restoreDraft: FormApi<T, TSubmitError, TOutput>['restoreDraft']
  getMeta: FormApi<T, TSubmitError, TOutput>['getMeta']
  subscribe: FormApi<T, TSubmitError, TOutput>['subscribe']
  fieldArray: FormApi<T, TSubmitError, TOutput>['fieldArray']
  hidden: (path: FieldPath) => ComputedRef<boolean>
  /** Reactive load state for an `optionSources` entry. */
  options: (path: FieldPath) => ComputedRef<FieldOptionsState>
  reloadOptions: FormApi<T, TSubmitError, TOutput>['reloadOptions']
  list: <TItem extends object = Record<string, unknown>>(
    path: FieldPath,
    opts?: FieldArrayOptions<TItem>,
  ) => FieldArrayApi<TItem>
  raw: FormApi<T, TSubmitError, TOutput>
}

/** One field's conditional rule, evaluated with its materialized path context. */
export type ApplicationConditionalRule<T extends object> = (
  context: RulePatternContext<T>,
) => RuleInput

/**
 * One flat rule map accepts both ordinary rule inputs and conditional fields.
 * A top-level function remains the whole-form dynamic-rules form.
 */
export type ApplicationRules<T extends object> =
  | Record<string, RuleInput | ApplicationConditionalRule<T>>
  | ((values: T) => FormRulesInput)

/** Type-safe whole-form and dotted-field reads behind one method name. */
export interface ApplicationFormGet<T extends object> {
  (options?: { hidden?: GetValuesMode }): T
  <Path extends TypedFieldPath<T>>(path: Path): TypedFieldValue<T, Path>
}

/** Type-safe whole-form and dotted-field writes behind one method name. */
export interface ApplicationFormSet<T extends object> {
  (
    values: Parameters<FormApi<T>['setValues']>[0],
    options?: Parameters<FormApi<T>['setValues']>[1],
  ): void
  <Path extends TypedFieldPath<T>>(
    path: Path,
    value: TypedFieldValue<T, Path>,
  ): void
}

/**
 * Internal runtime access for packages that extend the application facade.
 * Deliberately symbol-keyed so it never pollutes normal form autocomplete.
 *
 * @internal
 */
export const applicationFormRuntime: unique symbol = Symbol(
  'vformjs.application-form-runtime',
)

/**
 * Application form used by official UI packages.
 *
 * Lifecycle and advanced operations share one flat surface. `get` / `set`
 * overload whole-form and dotted-field operations; no secondary facade or
 * namespace is involved.
 */
export type UseApplicationFormReturn<
  T extends object,
  TSubmitError = never,
  TOutput extends object = T,
> = Pick<
  UseFormReturn<T, TSubmitError, TOutput>,
  | '__vformjsTypes'
  | 'model'
  | 'host'
  | 'item'
  | 'field'
  | 'validating'
  | 'submitting'
  | 'submitCount'
  | 'submitOk'
  | 'errors'
  | 'dirty'
  | 'changedPaths'
  | 'mode'
  | 'readonly'
  | 'editable'
  | 'load'
  | 'submit'
  | 'reset'
  | 'hidden'
  | 'reloadOptions'
  | 'list'
  | 'validate'
  | 'validateField'
  | 'subscribe'
  | 'clearValidate'
  | 'setErrors'
  | 'setFieldError'
  | 'clearErrors'
  | 'scrollToFirstError'
  | 'snapshotDraft'
  | 'restoreDraft'
> & {
  get: ApplicationFormGet<T>
  set: ApplicationFormSet<T>
  rebase: UseFormReturn<T, TSubmitError, TOutput>['rebaseDefaults']
  notify: UseFormReturn<T, TSubmitError, TOutput>['notifyChange']
  /** Stable, getter-backed option state; no `.value` required. */
  options: (path: FieldPath) => Readonly<FieldOptionsState>
  /** @internal */
  readonly [applicationFormRuntime]: FormApi<T, TSubmitError, TOutput>
}

export type UseFormOptions<
  T extends object,
  TSubmitError = never,
  TOutput extends object = T,
> = CreateFormOptions<T, TSubmitError, TOutput> & {
  /** Initial mode. Default create. */
  mode?: FormMode
  /**
   * deep tracks direct form.model mutations; explicit tracks form methods and
   * field(path) only, avoiding whole-model clone/diff work. Default deep.
   */
  modelTracking?: ModelTracking
}

/**
 * Flat application options shared by `useElForm`, `useNaiveForm`, and
 * `useAntdForm`.
 */
export type UseApplicationFormOptions<
  T extends object,
  TSubmitError = never,
  TOutput extends object = T,
> = Pick<
  UseFormOptions<T, TSubmitError, TOutput>,
  | 'defaultValues'
  | 'model'
  | 'valuePolicy'
  | 'adapter'
  | 'resolver'
  | 'mode'
  | 'scrollToError'
  | 'trimOnSuccess'
  | 'onSubmit'
  | 'onInvalid'
> & {
  tracking?: ModelTracking
  rules?: ApplicationRules<T>
  when?: UseFormOptions<T, TSubmitError, TOutput>['when']
  linkage?: UseFormOptions<T, TSubmitError, TOutput>['linkage']
  options?: Record<string, OptionsSource<T>>
  hiddenValues?: UseFormOptions<T, TSubmitError, TOutput>['hiddenValues']
  submitPolicy?: UseFormOptions<T, TSubmitError, TOutput>['submitPolicy']
  throwOnInvalid?: UseFormOptions<T, TSubmitError, TOutput>['throwOnInvalid']
}

export function useForm<
  T extends object,
  TSubmitError = never,
  TOutput extends object = T,
>(
  options: UseFormOptions<T, TSubmitError, TOutput>,
): UseFormReturn<T, TSubmitError, TOutput> {
  const {
    mode: initialMode = 'create',
    modelTracking = 'deep',
    ...formOptions
  } = options

  const form = createForm<T, TSubmitError, TOutput>({
    ...formOptions,
    ...(formOptions.model === undefined && formOptions.createState === undefined
      ? { createState: (initial: T) => reactive(initial) as T }
      : {}),
  })

  const rules = ref(form.getRules()) as Ref<FormRulesMap>
  const validating = ref(false)
  const submitting = ref(false)
  const submitCount = ref(form.submitCount)
  const submitOk = ref(form.submitOk)
  const errors = shallowRef<FormErrors>(form.getErrors())
  const dirty = shallowRef(form.dirty)
  const changedPaths = shallowRef<ReadonlyArray<FieldPath>>(form.changedPaths)
  const mode = ref<FormMode>(initialMode)
  const metaVersion = ref(0)
  let snapshot = modelTracking === 'deep'
    ? deepClone(toRaw(form.model), formOptions.valuePolicy) as T
    : form.model

  const readonly = computed(() => mode.value === 'detail')
  const editable = computed(() => mode.value !== 'detail')


  const setHost = (instance: unknown) => {
    form.bindHost(instance ?? null)
  }

  const host = computed(() => ({
    ...(formOptions.adapter?.hostProps?.() ?? {}),
    ref: setHost,
    model: form.model,
    rules: readonly.value ? {} : rules.value,
  }))

  const syncRules = () => {
    rules.value = form.getRules()
  }

  const refreshSnapshot = () => {
    if (modelTracking === 'deep')
      snapshot = deepClone(toRaw(form.model), formOptions.valuePolicy) as T
  }

  let modelSyncQueued = false
  let flushingModelSync = false
  const observedCorePaths = new Set<FieldPath>()

  const pathsOverlap = (left: FieldPath, right: FieldPath) =>
    left === right
    || left.startsWith(`${right}.`)
    || right.startsWith(`${left}.`)

  const flushModelSync = () => {
    modelSyncQueued = false
    const next = deepClone(toRaw(form.model), formOptions.valuePolicy) as T
    const paths = diffChangedPaths(
      snapshot,
      next,
      '',
      [],
      formOptions.valuePolicy,
    )
    snapshot = next

    const externalPaths = paths.filter((path) => {
      for (const observed of observedCorePaths) {
        if (pathsOverlap(path, observed))
          return false
      }
      return true
    })
    observedCorePaths.clear()
    if (!externalPaths.length)
      return

    flushingModelSync = true
    try {
      form.notifyChange(externalPaths)
    }
    finally {
      flushingModelSync = false
    }
  }

  const scheduleModelSync = () => {
    if (modelSyncQueued)
      return
    modelSyncQueued = true
    queueMicrotask(flushModelSync)
  }

  const unsub = form.subscribe({
    callback(event: FormEvent) {
      // Do NOT resync rules on every values event — Element validateOnRuleChange
      // would revalidate the whole form on each keystroke.
      if (event.type === 'rules' || event.type === 'reset')
        syncRules()
      if (event.type === 'meta' || event.type === 'reset')
        metaVersion.value += 1
      if (event.type === 'values') {
        if (modelSyncQueued) {
          for (const path of event.paths)
            observedCorePaths.add(path)
        }
        else if (!flushingModelSync) {
          refreshSnapshot()
        }
      }
      if (event.type === 'reset')
        refreshSnapshot()
      if (event.type === 'errors')
        errors.value = form.getErrors()
      if (event.type === 'validate-start')
        validating.value = true
      if (event.type === 'validate-end')
        validating.value = false
      if (event.type === 'dirty') {
        dirty.value = form.dirty
        changedPaths.value = form.changedPaths
      }
      if (event.type === 'submit-start')
        submitting.value = true
      if (event.type === 'submit-end')
        submitting.value = false
      if (event.type === 'submit-state') {
        submitCount.value = form.submitCount
        submitOk.value = form.submitOk
      }
    },
  })

  const stopModelWatch = modelTracking === 'deep'
    ? watch(
        () => form.model,
        scheduleModelSync,
        { deep: true, flush: 'sync' },
      )
    : () => {}


  if (getCurrentScope()) {
    onScopeDispose(() => {
      unsub()
      stopModelWatch()
    })
  }

  queueMicrotask(syncRules)

  const hidden = (path: FieldPath) => computed(() => {
    void metaVersion.value
    return form.getMeta(path).hidden
  })

  const optionsCache = new Map<FieldPath, ComputedRef<FieldOptionsState>>()
  const fieldOptions = (path: FieldPath) => {
    const cached = optionsCache.get(path)
    if (cached)
      return cached
    const binding = computed(() => {
      void metaVersion.value
      return form.getOptionsState(path)
    })
    optionsCache.set(path, binding)
    return binding
  }

  const item = (path: FieldPath): FormItemBinding => {
    void errors.value
    return form.getItemProps(path)
  }

  const fieldCache = new Map<FieldPath, WritableComputedRef<unknown>>()
  const field = ((path: FieldPath) => {
    const cached = fieldCache.get(path)
    if (cached)
      return cached
    const binding = computed({
      get: () => form.getFieldValue(path),
      set: value => form.setFieldValue(path, value),
    })
    fieldCache.set(path, binding)
    return binding
  }) as UseFormReturn<T, TSubmitError, TOutput>['field']

  const list = <TItem extends object = Record<string, unknown>>(
    path: FieldPath,
    opts?: FieldArrayOptions<TItem>,
  ): FieldArrayApi<TItem> => form.fieldArray<TItem>(path, opts)

  const setMode = (next: FormMode) => {
    mode.value = next
  }

  const load = (next: FormMode, values?: Partial<T>) => {
    mode.value = next
    if (next === 'create') {
      form.resetToCreateDefaults()
      refreshSnapshot()
      return
    }

    // edit / detail: start from factory defaults, then apply payload
    form.resetSubmit()
    const createDefaults = form.getCreateDefaults()
    const nextValues = Object.assign(
      {},
      createDefaults,
      values ?? {},
    ) as T
    form.setValues(nextValues, { merge: false })
    form.clearValidate()
    // A loaded record is the clean baseline in both edit and detail modes.
    form.rebaseDefaults(nextValues)
    refreshSnapshot()
  }

  const submit: FormApi<T, TSubmitError, TOutput>['submit'] = async <
    TActionError = never,
  >(
    handler?: SubmitAction<TOutput, TActionError, T, TSubmitError>,
  ): Promise<SubmitResult<TOutput, TSubmitError | TActionError, T>> => {
    if (mode.value === 'detail') {
      return {
        ok: false,
        values: form.getValues(),
        errors: { _form: ['detail mode is read-only'] },
      }
    }
    return form.submit(handler)
  }

  return reactive({
    model: form.model,
    rules,
    host,
    item,
    field,
    validating,
    submitting,
    submitCount,
    submitOk,
    errors,
    dirty,
    changedPaths,
    mode,
    readonly,
    editable,
    setMode,
    load,
    submit,
    validate: form.validate,
    validateField: form.validateField,
    reset: form.reset,
    setFieldValue: form.setFieldValue,
    getFieldValue: form.getFieldValue,
    subscribe: form.subscribe,
    setValues: form.setValues,
    getValues: form.getValues,
    setErrors: form.setErrors,
    setFieldError: form.setFieldError,
    clearErrors: form.clearErrors,
    scrollToFirstError: form.scrollToFirstError,
    clearValidate: form.clearValidate,
    notifyChange: form.notifyChange,
    rebaseDefaults: form.rebaseDefaults,
    snapshotDraft: form.snapshotDraft,
    restoreDraft: form.restoreDraft,
    getMeta: form.getMeta,
    fieldArray: form.fieldArray,
    hidden,
    options: fieldOptions,
    reloadOptions: form.reloadOptions,
    list,
    raw: form,
  }) as unknown as UseFormReturn<T, TSubmitError, TOutput>
}

function splitApplicationRules<T extends object>(
  source: ApplicationRules<T> | undefined,
): {
  rules?: RulesSource<T>
  whenRules?: Record<string, ConditionalRules<T>>
} {
  if (source === undefined)
    return {}
  if (typeof source === 'function')
    return { rules: source }

  const rules: FormRulesInput = {}
  const whenRules: Record<string, ConditionalRules<T>> = {}
  for (const [path, input] of Object.entries(source)) {
    if (typeof input === 'function') {
      whenRules[path] = (_values, context) => input(context)
    }
    else {
      rules[path] = input
    }
  }

  return {
    ...(Object.keys(rules).length ? { rules } : {}),
    ...(Object.keys(whenRules).length ? { whenRules } : {}),
  }
}

/**
 * Application-facing form used by official UI packages.
 *
 * It adapts concise application names to the lower-level runtime once, then
 * exposes lifecycle, value, field, validation, and draft operations directly.
 */
export function useApplicationForm<
  T extends object,
  TSubmitError = never,
  TOutput extends object = T,
>(
  options: UseApplicationFormOptions<T, TSubmitError, TOutput>,
): UseApplicationFormReturn<T, TSubmitError, TOutput> {
  const {
    tracking,
    rules: authoredRules,
    when,
    linkage,
    options: optionSources,
    hiddenValues,
    submitPolicy,
    throwOnInvalid,
    ...baseOptions
  } = options
  const resolvedRules = splitApplicationRules(authoredRules)
  const form = useForm<T, TSubmitError, TOutput>({
    ...baseOptions,
    ...(tracking === undefined ? {} : { modelTracking: tracking }),
    ...(resolvedRules.rules === undefined
      ? {}
      : { rules: resolvedRules.rules }),
    ...(resolvedRules.whenRules === undefined
      ? {}
      : { whenRules: resolvedRules.whenRules }),
    ...(when === undefined ? {} : { when }),
    ...(linkage === undefined ? {} : { linkage }),
    ...(optionSources === undefined ? {} : { optionSources }),
    ...(hiddenValues === undefined ? {} : { hiddenValues }),
    ...(submitPolicy === undefined ? {} : { submitPolicy }),
    ...(throwOnInvalid === undefined ? {} : { throwOnInvalid }),
  })

  const get = ((target?: FieldPath | { hidden?: GetValuesMode }) =>
    typeof target === 'string'
      ? form.getFieldValue(target)
      : form.getValues(target)) as ApplicationFormGet<T>

  const set = ((
    target: FieldPath | Parameters<FormApi<T>['setValues']>[0],
    valueOrOptions?: unknown,
  ) => {
    if (typeof target === 'string') {
      form.setFieldValue(target, valueOrOptions)
      return
    }
    form.setValues(
      target,
      valueOrOptions as Parameters<FormApi<T>['setValues']>[1],
    )
  }) as ApplicationFormSet<T>

  const optionBindings = new Map<FieldPath, Readonly<FieldOptionsState>>()
  const readOptions = (path: FieldPath): Readonly<FieldOptionsState> => {
    const cached = optionBindings.get(path)
    if (cached)
      return cached

    const source = form.options(path)
    const binding: Readonly<FieldOptionsState> = {
      get items() {
        return source.value.items
      },
      get loading() {
        return source.value.loading
      },
      get error() {
        return source.value.error
      },
      get loaded() {
        return source.value.loaded
      },
    }
    optionBindings.set(path, binding)
    return binding
  }

  const facade = {
    model: form.model,
    get host() {
      return form.host
    },
    item: form.item,
    field: form.field,
    get validating() {
      return form.validating
    },
    get submitting() {
      return form.submitting
    },
    get submitCount() {
      return form.submitCount
    },
    get submitOk() {
      return form.submitOk
    },
    get errors() {
      return form.errors
    },
    get dirty() {
      return form.dirty
    },
    get changedPaths() {
      return form.changedPaths
    },
    get mode() {
      return form.mode
    },
    subscribe: form.subscribe,
    get readonly() {
      return form.readonly
    },
    get editable() {
      return form.editable
    },
    load: form.load,
    submit: form.submit,
    reset: form.reset,
    get,
    set,
    rebase: form.rebaseDefaults,
    notify: form.notifyChange,
    hidden: form.hidden,
    options: readOptions,
    reloadOptions: form.reloadOptions,
    list: form.list,
    validate: form.validate,
    validateField: form.validateField,
    clearValidate: form.clearValidate,
    setErrors: form.setErrors,
    setFieldError: form.setFieldError,
    clearErrors: form.clearErrors,
    scrollToFirstError: form.scrollToFirstError,
    snapshotDraft: form.snapshotDraft,
    restoreDraft: form.restoreDraft,
  }

  Object.defineProperty(facade, applicationFormRuntime, {
    value: form.raw,
  })

  return facade as unknown as UseApplicationFormReturn<
    T,
    TSubmitError,
    TOutput
  >
}

export { createForm }
export type {
  CreateFormOptions,
  FormApi,
  FormResult,
  FormErrors,
  FieldArrayApi,
  LinkageRule,
}
