import type { DeepPartial, FormValuePolicy } from './vendor/shared'

/** Dotted field path, e.g. `profile.email` or `domains.0.value`. */
export type FieldPath = string

export type FormErrors = Record<string, string[]>

/** Host-specific props for one field item (`prop`, `path`, `name`, error state). */
export type FormItemBinding = Record<string, unknown>

export type FormValidationResult<TInput, TOutput = TInput> =
  | { ok: true, values: TOutput, errors?: undefined }
  | { ok: false, values: TInput, errors: FormErrors }

/** Validation result when input and validated output have the same shape. */
export type FormResult<T> = FormValidationResult<T, T>

/** Result returned by an API submission handler after form validation succeeds. */
export type SubmitOutcome<TError = never> =
  | { ok: true, error?: undefined, errors?: undefined }
  | { ok: false, error: TError, errors?: FormErrors }

/** Return contract for configured and inline API submission handlers. */
export type SubmitHandlerResult<TError = never> =
  | void
  | SubmitOutcome<TError>
  | Promise<void | SubmitOutcome<TError>>

export interface FormValidationContext {
  /** Aborted when a newer validation or model change supersedes this run. */
  signal: AbortSignal
  /** Monotonically increasing identifier scoped to one form instance. */
  validationId: number
}

export interface FormResolverContext extends FormValidationContext {
  /** Omitted for whole-form validation. */
  paths?: ReadonlyArray<FieldPath>
}

/**
 * Source-of-truth validation pipeline. A resolver may also transform successful
 * values (for example, Zod coercion).
 */
export type FormResolver<
  TInput extends object,
  TOutput extends object = TInput,
> = (
  values: TInput,
  context: FormResolverContext,
) =>
  | FormValidationResult<TInput, TOutput>
  | FormResult<TInput>
  | Promise<FormValidationResult<TInput, TOutput> | FormResult<TInput>>

/** Configured API submission handler. */
export type SubmitHandler<
  TInput extends object,
  TError = never,
  TOutput extends object = TInput,
> = (
  values: TOutput,
  ctx: { form: FormApi<TInput, TError, TOutput> },
) => SubmitHandlerResult<TError>

/** One-off handler passed directly to `form.submit(handler)`. */
export type SubmitAction<
  TOutput extends object,
  TError = never,
  TInput extends object = TOutput,
  TSubmitError = never,
> = (
  values: TOutput,
  ctx: { form: FormApi<TInput, TSubmitError, TOutput> },
) => SubmitHandlerResult<TError>
/** API submission failure returned after form validation has succeeded. */
export type SubmitFailureResult<T, TError> = {
  ok: false
  values: T
  submitError: TError
  errors?: FormErrors
}

/**
 * Complete result of `form.submit()`.
 * With the default `TSubmitError = never`, this remains exactly `FormResult<T>`.
 */
export type SubmitResult<TOutput, TSubmitError = never, TInput = TOutput> =
  | FormValidationResult<TInput, TOutput>
  | ([TSubmitError] extends [never]
      ? never
      : SubmitFailureResult<TOutput, TSubmitError>)

export interface FieldMeta {
  hidden: boolean
  disabled: boolean
  options?: unknown
  /** Extra bag for adapters / renderers. */
  extra?: Record<string, unknown>
}

export type RuleItem = Record<string, unknown>
export type RuleInput = RuleItem | RuleItem[] | string | string[] | null | undefined
/** Normalized map used at runtime after sugar expansion. */
export type FormRulesMap = Record<string, RuleItem[]>
/**
 * Authoring-time rules: values may be RuleItem, string sugar (`'required'`), or arrays of either.
 * Normalized to FormRulesMap via normalizeRulesMap.
 */
export type FormRulesInput = Record<string, RuleInput>

export interface HostValidateResult {
  valid: boolean
  errors?: FormErrors
  /** True when validation could not run because no host instance is bound. */
  unbound?: boolean
}

/**
 * Host form bridge. Official adapters cover element-ui / element-plus;
 * other UI libraries implement this interface themselves.
 */
export interface FormHostAdapter {
  bind?: (instance: unknown) => void
  validate: (
    paths?: FieldPath[],
    context?: FormValidationContext,
  ) => Promise<HostValidateResult>
  clearValidate?: (paths?: FieldPath[]) => void
  scrollToField?: (path: FieldPath) => void
  getItemProps?: (path: FieldPath, error?: string) => FormItemBinding
  afterModelReset?: () => void
}

export type GetValuesMode = 'keep' | 'omit'

export interface LinkageCtx<T extends object> {
  get: (path: FieldPath) => unknown
  values: Readonly<T>
  set: (path: FieldPath, value: unknown) => void
  patch: (partial: DeepPartial<T>) => void
  setHidden: (path: FieldPath, hidden: boolean) => void
  setDisabled: (path: FieldPath, disabled: boolean) => void
  setFieldRules: (path: FieldPath, rules: RuleInput) => void
  setOptions: (path: FieldPath, options: unknown) => void
  clearValidate: (paths?: FieldPath | FieldPath[]) => void
  getMeta: (path: FieldPath) => FieldMeta
}

export interface LinkageRule<T extends object> {
  /** Dependency paths; `'*'` listens to every change. Supports `a.*.b` patterns. */
  deps: FieldPath[] | '*'
  when?: 'deps' | 'any' | 'init'
  run: (ctx: LinkageCtx<T>) => void | Promise<void>
}

export interface RulePatternContext<T extends object> {
  readonly values: Readonly<T>
  /** Authoring path, e.g. `members.*.name`. */
  readonly pattern: FieldPath
  /** Materialized host path, e.g. `members.1.name`. */
  readonly path: FieldPath
  /** Segments matched by `*`, in declaration order. */
  readonly wildcards: ReadonlyArray<string>
  /** Numeric value of the last wildcard, when it is an array index. */
  readonly index: number | undefined
  /** Object selected by the last wildcard (typically the current array row). */
  readonly item: unknown
  readonly value: unknown
}

export type FieldCondition<T extends object> = (
  values: T,
  context: RulePatternContext<T>,
) => boolean

export type ConditionalRules<T extends object> = (
  values: T,
  context: RulePatternContext<T>,
) => RuleInput

export type RulesSource<T extends object> =
  | FormRulesInput
  | ((values: T) => FormRulesInput)

export type SubmitPolicy = 'join' | 'parallel'

export interface CreateFormOptions<
  T extends object,
  TSubmitError = never,
  TOutput extends object = T,
> {
  defaultValues: T | (() => T)
  /**
   * Use an existing mutable model as the live form state.
   * Its identity is retained; reset/load mutate it in place.
   * Cannot be combined with createState.
   */
  model?: T
  /**
   * Wrap the live model (e.g. Vue `reactive`).
   * Receives a deep clone of defaultValues; return value becomes form.model.
   */
  createState?: (initial: T) => T
  /** Clone/equality semantics for opaque values such as File or value objects. */
  valuePolicy?: FormValuePolicy
  rules?: RulesSource<T>
  /**
   * Declarative show/hide. Key = field path, value = predicate of full values.
   * Hidden fields drop rules automatically and clear validation.
   */
  when?: Record<string, FieldCondition<T>>
  /**
   * Conditional rules. Key = field path, value returns rules or null to clear.
   * Re-evaluated when values change (via notifyChange / setFieldValue).
   */
  whenRules?: Record<string, ConditionalRules<T>>
  linkage?: LinkageRule<T>[]
  adapter?: FormHostAdapter
  /** Primary validation and optional value-transformation pipeline. */
  resolver?: FormResolver<T, TOutput>
  /**
   * When true, validate/submit throw on invalid.
   * Default false — invalid returns `{ ok: false }`.
   */
  throwOnInvalid?: boolean
  /** Scroll to the first invalid field after submit fails. Default true. */
  scrollToError?: boolean
  /** Omit hidden fields from getValues / submit snapshot. Default keep. */
  hiddenValues?: GetValuesMode
  /** Trim top-level string fields on successful validate/submit. */
  trimOnSuccess?: boolean
  /**
   * Concurrent submit behavior. join reuses the active submission promise;
   * parallel starts an independent handler. Default join.
   */
  submitPolicy?: SubmitPolicy
  onSubmit?: SubmitHandler<T, TSubmitError, TOutput>
  onInvalid?: (
    errors: FormErrors,
    ctx: { form: FormApi<T, TSubmitError, TOutput> },
  ) => void
}

export interface FieldArrayApi<TItem extends object = Record<string, unknown>> {
  fields: ReadonlyArray<{ key: string, index: number }>
  append: (item?: Partial<TItem> | TItem) => void
  prepend: (item?: Partial<TItem> | TItem) => void
  insert: (index: number, item?: Partial<TItem> | TItem) => void
  remove: (index: number | number[]) => void
  move: (from: number, to: number) => void
  replace: (index: number, item: TItem) => void
  update: (index: number, partial: Partial<TItem>) => void
  clear: () => void
}

export interface FormApi<
  T extends object,
  TSubmitError = never,
  TOutput extends object = T,
> {
  /** Mutable model root (same object identity for the form lifetime). */
  readonly values: T
  /** Alias for values — Element `:model` binding. */
  readonly model: T

  /** True when live values differ from the current reset baseline. */
  readonly dirty: boolean
  /** Dotted leaf paths that differ from the current reset baseline. */
  readonly changedPaths: ReadonlyArray<FieldPath>

  getValues: (opts?: { hidden?: GetValuesMode }) => T
  setValues: (partial: DeepPartial<T>, opts?: { merge?: boolean }) => void
  setFieldValue: (path: FieldPath, value: unknown) => void
  getFieldValue: <V = unknown>(path: FieldPath) => V | undefined

  reset: (paths?: FieldPath | FieldPath[]) => void
  rebaseDefaults: (values?: T) => void
  /** Original factory defaults (never mutated by edit rebase). */
  getCreateDefaults: () => T
  /** Restore model + baseline to factory defaults (create mode). */
  resetToCreateDefaults: () => void

  getRules: () => FormRulesMap
  setRules: (rules: RulesSource<T>) => void
  /** Pass `null` to clear field rules; pass `undefined` to drop override and restore base `rules`. */
  setFieldRules: (path: FieldPath, rules: RuleInput) => void

  getMeta: (path: FieldPath) => FieldMeta
  setHidden: (path: FieldPath, hidden: boolean) => void
  setDisabled: (path: FieldPath, disabled: boolean) => void
  setOptions: (path: FieldPath, options: unknown) => void

  getErrors: () => FormErrors
  setFieldError: (path: FieldPath, messages: string | string[]) => void
  /** Replace the complete core error map (for example, API field errors). */
  setErrors: (errors: FormErrors) => void
  /** Scroll the bound host to the first field error and return its path. */
  scrollToFirstError: () => FieldPath | undefined
  /** Resolve host-specific field-item props for a dotted path. */
  getItemProps: (path: FieldPath) => FormItemBinding
  clearErrors: (paths?: FieldPath | FieldPath[]) => void
  clearValidate: (paths?: FieldPath | FieldPath[]) => void

  validate: (
    paths?: FieldPath | FieldPath[]
  ) => Promise<FormValidationResult<T, TOutput> | FormResult<T>>
  validateField: (
    paths?: FieldPath | FieldPath[]
  ) => Promise<FormValidationResult<T, TOutput> | FormResult<T>>
  submit: <TActionError = never>(
    handler?: SubmitAction<TOutput, TActionError, T, TSubmitError>,
  ) => Promise<SubmitResult<TOutput, TSubmitError | TActionError, T>>

  fieldArray: <TItem extends object = Record<string, unknown>>(
    path: FieldPath,
    opts?: { defaultItem?: () => TItem, keyName?: string },
  ) => FieldArrayApi<TItem>

  bindAdapter: (adapter: FormHostAdapter) => void
  bindHost: (instance: unknown) => void

  /** Subscribe to value/meta/rules changes. Returns unsubscribe. */
  subscribe: (listener: (event: FormEvent) => void) => () => void

  /**
   * Notify that model paths changed outside setFieldValue
   * (e.g. direct v-model mutation). Triggers linkage.
   */
  notifyChange: (paths?: FieldPath | FieldPath[]) => void

  /** Props for host form: `{ model, rules }`. */
  getFormProps: () => { model: T, rules: FormRulesMap }

  readonly submitting: boolean
}

export type FormEvent =
  | { type: 'values', paths: FieldPath[] }
  | { type: 'meta', path: FieldPath }
  | { type: 'rules' }
  | { type: 'errors' }
  | { type: 'dirty' }
  | { type: 'reset' }
  | { type: 'submit-start' | 'submit-end' }
