import type { DeepPartial, FormValuePolicy } from './vendor/shared'

/** Dotted field path, e.g. `profile.email` or `domains.0.value`. */
export type FieldPath = string

export type FormErrors = Record<string, string[]>

/** Version tag written into every draft snapshot. */
export const DRAFT_SNAPSHOT_VERSION = 1

/** A versioned, JSON-serializable capture of form values (for drafts). */
export interface FormDraftSnapshot {
  version: number
  savedAt: string
  values: Record<string, unknown>
}

/**
 * 'restored' — draft matched the current baseline shape exactly.
 * 'healed'   — draft applied after dropping unknown paths / filling missing ones.
 * 'fresh'    — draft rejected; form keeps its current values untouched.
 */
export type DraftRestoreStatus = 'restored' | 'healed' | 'fresh'

/** Structured reason a draft was rejected (decided at the source, never parsed from messages). */
export type DraftRestoreReason = 'empty' | 'malformed' | 'unsupported-version'

export interface DraftRestoreResult {
  status: DraftRestoreStatus
  reason?: DraftRestoreReason
  /** Draft paths dropped because they do not exist in the current baseline shape. */
  droppedPaths: FieldPath[]
  /** Paths filled from baseline values because the draft lacked them (or structurally mismatched). */
  filledPaths: FieldPath[]
}

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
  /**
   * Extra props merged into `form.host`. Lets an adapter neutralize host quirks,
   * e.g. element's `validate-on-rule-change`, which would otherwise validate a
   * pristine form the first time vformjs publishes its rules.
   */
  hostProps?: () => FormItemBinding
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

export interface OptionsLoadContext<T extends object> {
  values: Readonly<T>
  get: (path: FieldPath) => unknown
  /** Aborted when a newer load for the same field supersedes this one. */
  signal: AbortSignal
  /** Materialized field path being loaded; wildcards are already expanded. */
  path: FieldPath
  /** Segments matched by `*`, in declaration order. */
  wildcards: ReadonlyArray<string>
}

/**
 * Declarative remote (or computed) options for one field path.
 * Patterns may use `*` for array rows, e.g. `rows.*.city`.
 */
export interface OptionsSource<T extends object> {
  /**
   * Field paths whose change reloads this source. A dep change also resets the
   * field's own value to its factory default unless `resetValue: false`.
   */
  deps?: FieldPath[]
  /**
   * Cache identity. Sources resolving to the same key share one in-flight
   * request and one resolved payload. Return `null` to bypass the cache.
   * Default: the materialized field path plus the current dep values, so
   * sibling array rows stay distinct.
   */
  key?: (values: Readonly<T>, context: OptionsLoadContext<T>) => unknown
  load: (context: OptionsLoadContext<T>) => unknown | Promise<unknown>
  /**
   * Pick this field's slice out of the loaded payload. Runs per field, after
   * (and outside) the cache, so one endpoint returning many lists can feed many
   * fields from a single request:
   * `{ key: () => 'nextOpts', load: fetchAll, select: p => p.truckingNumberOpts }`
   */
  select?: (payload: unknown, context: OptionsLoadContext<T>) => unknown
  /** Reset the field's own value when deps change. Default true when `deps` is set. */
  resetValue?: boolean
  /** Skip the load that runs on form creation. Dep changes still load. Default false. */
  lazy?: boolean
}

export interface FieldOptionsState {
  /**
   * Resolved options for this field — `select(payload)` when declared, otherwise
   * whatever `load` returned. Mirrored into `getMeta(path).options`.
   */
  items: unknown
  loading: boolean
  error: unknown
  /** A load has completed for the current key. */
  loaded: boolean
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
  /**
   * Remote or computed field options. Key = field path (or `rows.*.city`).
   * Loads on creation, reloads when `deps` change, shares one request per
   * cache key, and aborts superseded loads.
   */
  optionSources?: Record<string, OptionsSource<T>>
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

  /** Capture current values as a versioned, JSON-serializable draft snapshot. */
  snapshotDraft: () => FormDraftSnapshot
  /**
   * Restore a draft snapshot against the current baseline shape.
   * Never throws on bad input: unknown paths are dropped, missing paths are
   * filled from the baseline, and unusable snapshots leave values untouched
   * ('fresh' + structured reason). Baseline is NOT rebased — a restored
   * draft is unsaved user input, so `dirty`/`changedPaths` reflect it.
   */
  restoreDraft: (snapshot: unknown) => DraftRestoreResult

  getRules: () => FormRulesMap
  setRules: (rules: RulesSource<T>) => void
  /** Pass `null` to clear field rules; pass `undefined` to drop override and restore base `rules`. */
  setFieldRules: (path: FieldPath, rules: RuleInput) => void

  getMeta: (path: FieldPath) => FieldMeta
  setHidden: (path: FieldPath, hidden: boolean) => void
  setDisabled: (path: FieldPath, disabled: boolean) => void
  setOptions: (path: FieldPath, options: unknown) => void
  /** Load state for a declarative `optionSources` entry. */
  getOptionsState: (path: FieldPath) => FieldOptionsState
  /** Drop cached payloads and load again. Omit paths to reload every source. */
  reloadOptions: (paths?: FieldPath | FieldPath[]) => void

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
