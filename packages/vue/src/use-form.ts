import {
  createForm,
  deepClone,
  diffChangedPaths,
  DRAFT_SNAPSHOT_VERSION,
  type CreateFormOptions,
  type FieldArrayApi,
  type FieldPath,
  type FormApi,
  type FormEvent,
  type FormErrors,
  type FormItemBinding,
  type FormResult,
  type FormRulesMap,
  type LinkageRule,
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
   */
  host: {
    ref: (instance: unknown) => void
    model: T
    rules: FormRulesMap
  }
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
  submitting: boolean
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
  fieldArray: FormApi<T, TSubmitError, TOutput>['fieldArray']
  hidden: (path: FieldPath) => ComputedRef<boolean>
  list: <TItem extends object = Record<string, unknown>>(
    path: FieldPath,
    opts?: { defaultItem?: () => TItem, keyName?: string },
  ) => FieldArrayApi<TItem>
  raw: FormApi<T, TSubmitError, TOutput>
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
  const submitting = ref(false)
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

  const unsub = form.subscribe((event: FormEvent) => {
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
    if (event.type === 'dirty') {
      dirty.value = form.dirty
      changedPaths.value = form.changedPaths
    }
    if (event.type === 'submit-start')
      submitting.value = true
    if (event.type === 'submit-end')
      submitting.value = false
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
    opts?: { defaultItem?: () => TItem, keyName?: string },
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
    // so omitted keys from record B never leak values from record A
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
    submitting,
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
    list,
    raw: form,
  }) as unknown as UseFormReturn<T, TSubmitError, TOutput>
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
