import {
  createForm,
  deepClone,
  diffChangedPaths,
  type CreateFormOptions,
  type FieldArrayApi,
  type FieldPath,
  type FormApi,
  type FormEvent,
  type FormErrors,
  type FormResult,
  type FormRulesMap,
  type LinkageRule,
} from '@vformjs/core'
import type { ComputedRef, Ref } from 'vue-demi'
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

export { diffChangedPaths }

/** Unified form modes: create / edit / detail all share useForm. */
export type FormMode = 'create' | 'edit' | 'detail'

/**
 * Runtime shape after `reactive()` unwrap. Docs/examples use:
 * `form.mode === 'edit'`, `form.submitting` as boolean.
 */
export interface UseFormReturn<T extends Record<string, unknown>> {
  model: T
  rules: FormRulesMap
  formProps: { model: T, rules: FormRulesMap }
  /**
   * Bind host form in one shot:
   * `<el-form v-bind="form.el" />`
   */
  el: {
    ref: (instance: unknown) => void
    model: T
    rules: FormRulesMap
  }
  formRef: unknown
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

  submit: FormApi<T>['submit']
  validate: FormApi<T>['validate']
  validateField: FormApi<T>['validateField']
  reset: FormApi<T>['reset']
  setFieldValue: FormApi<T>['setFieldValue']
  getFieldValue: FormApi<T>['getFieldValue']
  setValues: FormApi<T>['setValues']
  getValues: FormApi<T>['getValues']
  setErrors: FormApi<T>['setErrors']
  setFieldError: FormApi<T>['setFieldError']
  clearErrors: FormApi<T>['clearErrors']
  scrollToFirstError: FormApi<T>['scrollToFirstError']
  clearValidate: FormApi<T>['clearValidate']
  notifyChange: FormApi<T>['notifyChange']
  rebaseDefaults: FormApi<T>['rebaseDefaults']
  bindHost: (instance?: unknown) => void
  getMeta: FormApi<T>['getMeta']
  fieldArray: FormApi<T>['fieldArray']
  hidden: (path: FieldPath) => ComputedRef<boolean>
  list: <TItem extends Record<string, unknown> = Record<string, unknown>>(
    path: FieldPath,
    opts?: { defaultItem?: () => TItem, keyName?: string },
  ) => Omit<FieldArrayApi<TItem>, 'fields'> & {
    fields: ComputedRef<ReadonlyArray<{ key: string, index: number }>>
  }
  raw: FormApi<T>
}


export type UseFormOptions<T extends Record<string, unknown>> = CreateFormOptions<T> & {
  /** Initial mode. Default create. */
  mode?: FormMode
}

export function useForm<T extends Record<string, unknown>>(
  options: UseFormOptions<T>,
): UseFormReturn<T> {
  const { mode: initialMode = 'create', ...formOptions } = options

  const form = createForm({
    ...formOptions,
    createState: (initial: T) => reactive(initial) as T,
  })

  const formRef = shallowRef<unknown>()
  const rules = ref(form.getRules()) as Ref<FormRulesMap>
  const submitting = ref(false)
  const errors = shallowRef<FormErrors>(form.getErrors())
  const dirty = shallowRef(form.dirty)
  const changedPaths = shallowRef<ReadonlyArray<FieldPath>>(form.changedPaths)
  const mode = ref<FormMode>(initialMode)
  const metaVersion = ref(0)
  const arrayVersion = ref(0)
  let snapshot = deepClone(toRaw(form.model)) as T

  const readonly = computed(() => mode.value === 'detail')
  const editable = computed(() => mode.value !== 'detail')

  const formProps = computed(() => ({
    model: form.model,
    rules: readonly.value ? {} : rules.value,
  }))

  const setHost = (instance: unknown) => {
    formRef.value = instance
    // Always forward — null clears adapter when el-form unmounts (v-if detail)
    form.bindHost(instance ?? null)
  }

  const el = computed(() => ({
    ref: setHost,
    model: form.model,
    rules: readonly.value ? {} : rules.value,
  }))

  const syncRules = () => {
    rules.value = form.getRules()
  }

  const refreshSnapshot = () => {
    snapshot = deepClone(toRaw(form.model)) as T
  }

  const unsub = form.subscribe((event: FormEvent) => {
    // Do NOT resync rules on every values event — Element validateOnRuleChange
    // would revalidate the whole form on each keystroke.
    if (event.type === 'rules' || event.type === 'reset')
      syncRules()
    if (event.type === 'meta' || event.type === 'reset')
      metaVersion.value += 1
    if (event.type === 'values')
      arrayVersion.value += 1
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

  const stopModelWatch = watch(
    () => form.model,
    () => {
      const next = deepClone(toRaw(form.model)) as T
      const paths = diffChangedPaths(snapshot, next)
      snapshot = next
      if (paths.length)
        form.notifyChange(paths)
    },
    { deep: true, flush: 'sync' },
  )

  watch(
    formRef,
    (instance) => {
      form.bindHost(instance ?? null)
    },
    { flush: 'post' },
  )

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

  const list = <TItem extends Record<string, unknown> = Record<string, unknown>>(
    path: FieldPath,
    opts?: { defaultItem?: () => TItem, keyName?: string },
  ) => {
    const arr = form.fieldArray<TItem>(path, opts)
    const fields = computed(() => {
      void arrayVersion.value
      return arr.fields
    })
    return {
      ...arr,
      fields,
    }
  }

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
    form.setValues(nextValues as Partial<T> & Record<string, unknown>, { merge: false })
    form.clearValidate()
    // A loaded record is the clean baseline in both edit and detail modes.
    form.rebaseDefaults(nextValues)
    refreshSnapshot()
  }

  const submit: FormApi<T>['submit'] = async (
    handler?: (values: T) => void | Promise<void>,
  ) => {
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
    formProps,
    el,
    formRef,
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
    bindHost: (instance?: unknown) => form.bindHost(instance ?? formRef.value),
    getMeta: form.getMeta,
    fieldArray: form.fieldArray,
    hidden,
    list,
    raw: form,
  }) as unknown as UseFormReturn<T>
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
