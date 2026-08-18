import type {
  FormErrors,
  FormResult,
  FormValidationResult,
  SubmitPolicy,
} from '@vformjs/core'
import { computed, reactive, ref } from 'vue-demi'
import type { FormMode } from './use-form'

/** Reactive state and lifecycle shared by low-level and application forms. */
export interface FormGroupMemberState<TInput extends object = object> {
  readonly model: TInput
  readonly errors: Readonly<FormErrors>
  readonly dirty: boolean
  readonly changedPaths: ReadonlyArray<string>
  readonly submitting: boolean
  readonly validating: boolean
  reset: () => void
  /**
   * Present on Vue form members. The group forwards mode switches and record
   * payloads when available, so every section switches together.
   */
  load?: (mode: FormMode, values?: Partial<TInput>) => void
  readonly mode?: FormMode
}

/** Low-level `useForm` controls. */
export interface LowLevelFormGroupControls<
  TInput extends object = object,
  TOutput extends object = TInput,
> {
  getValues: () => TInput
  setErrors: (errors: FormErrors) => void
  scrollToFirstError: () => string | undefined
  validate: () => Promise<
    FormValidationResult<TInput, TOutput> | FormResult<TInput>
  >
}

/** Official application-form controls. */
export interface ApplicationFormGroupControls<
  TInput extends object = object,
  TOutput extends object = TInput,
> {
  get: () => TInput
  setErrors: (errors: FormErrors) => void
  scrollToFirstError: () => string | undefined
  validate: () => Promise<
    FormValidationResult<TInput, TOutput> | FormResult<TInput>
  >
}

export type FormGroupMember<
  TInput extends object = object,
  TOutput extends object = TInput,
> = FormGroupMemberState<TInput> & (
  | LowLevelFormGroupControls<TInput, TOutput>
  | ApplicationFormGroupControls<TInput, TOutput>
)

export type FormGroupMap = Record<string, FormGroupMember>

type MemberInput<TMember> =
  TMember extends { get: () => infer TInput extends object }
    ? TInput
    : TMember extends { getValues: () => infer TInput extends object }
      ? TInput
      : never

type MemberValidation<TMember> =
  TMember extends { validate: () => Promise<infer TResult> }
    ? TResult
    : never
type MemberOutput<TMember> = TMember extends {
  readonly __vformjsTypes?: { output: infer TOutput extends object }
}
  ? TOutput
  : Extract<
      MemberValidation<TMember>,
      { ok: true }
    > extends { values: infer TOutput extends object }
    ? TOutput
    : never

export type FormGroupInput<TForms extends FormGroupMap> = {
  [TKey in keyof TForms]: MemberInput<TForms[TKey]>
}

export type FormGroupOutput<TForms extends FormGroupMap> = {
  [TKey in keyof TForms]: MemberOutput<TForms[TKey]>
}

export type FormGroupErrors<TForms extends FormGroupMap> = Partial<{
  [TKey in keyof TForms]: FormErrors
}>

export type FormGroupValidationResult<TForms extends FormGroupMap> =
  | {
      ok: true
      values: FormGroupOutput<TForms>
      errors?: undefined
    }
  | {
      ok: false
      values: FormGroupInput<TForms>
      errors: FormGroupErrors<TForms>
    }

export type FormGroupSubmitOutcome<
  TForms extends FormGroupMap,
  TError = never,
> =
  | { ok: true, error?: undefined, errors?: undefined }
  | { ok: false, error: TError, errors?: FormGroupErrors<TForms> }

export type FormGroupSubmitHandlerResult<
  TForms extends FormGroupMap,
  TError = never,
> =
  | void
  | FormGroupSubmitOutcome<TForms, TError>
  | Promise<void | FormGroupSubmitOutcome<TForms, TError>>

export type FormGroupSubmitFailure<
  TForms extends FormGroupMap,
  TError,
> = {
  ok: false
  values: FormGroupOutput<TForms>
  submitError: TError
  errors?: FormGroupErrors<TForms>
}

export type FormGroupSubmitResult<
  TForms extends FormGroupMap,
  TError = never,
> =
  | FormGroupValidationResult<TForms>
  | ([TError] extends [never]
      ? never
      : FormGroupSubmitFailure<TForms, TError>)

export type FormGroupSubmitHandler<
  TForms extends FormGroupMap,
  TError = never,
> = (
  values: FormGroupOutput<TForms>,
  context: { group: UseFormGroupReturn<TForms> },
) => FormGroupSubmitHandlerResult<TForms, TError>

export interface UseFormGroupOptions {
  /** Scroll the first invalid member after validate/submit fails. Default true. */
  scrollToError?: boolean
  /** Concurrent group submit behavior. Default join. */
  submitPolicy?: SubmitPolicy
}

export interface UseFormGroupReturn<TForms extends FormGroupMap> {
  readonly forms: TForms
  readonly model: FormGroupInput<TForms>
  readonly errors: FormGroupErrors<TForms>
  readonly dirty: boolean
  readonly changedPaths: ReadonlyArray<string>
  readonly validating: boolean
  readonly submitting: boolean
  /** Logical group submit attempts since the last reset or load. */
  readonly submitCount: number
  /** Whether the latest completed group submit attempt succeeded. */
  readonly submitOk: boolean
  /** Mode of the first member that reports one. `group.load` keeps them aligned. */
  readonly mode: FormMode
  /**
   * Switch every member's mode and hand each one its slice of the record:
   * `group.load('edit', { base: detail.base, fees: detail.fees })`.
   * Members without `load` are skipped.
   */
  load: (
    mode: FormMode,
    values?: Partial<FormGroupInput<TForms>>,
  ) => void
  validate: () => Promise<FormGroupValidationResult<TForms>>
  submit: <TError = never>(
    handler: FormGroupSubmitHandler<TForms, TError>,
  ) => Promise<FormGroupSubmitResult<TForms, TError>>
  reset: () => void
  setErrors: (errors: FormGroupErrors<TForms>) => void
  scrollToFirstError: () => string | undefined
}

function cloneErrors(errors: Readonly<FormErrors>): FormErrors {
  const cloned: FormErrors = {}
  for (const [path, messages] of Object.entries(errors)) {
    if (messages.length)
      cloned[path] = [...messages]
  }
  return cloned
}

function getMemberValues(form: FormGroupMember): object {
  return 'get' in form ? form.get() : form.getValues()
}

function setMemberErrors(form: FormGroupMember, errors: FormErrors): void {
  form.setErrors(errors)
}

function scrollMemberToFirstError(form: FormGroupMember): string | undefined {
  return form.scrollToFirstError()
}

function validateMember(form: FormGroupMember) {
  return form.validate()
}

/** Compose multiple independently hosted forms into one reactive lifecycle. */
export function useFormGroup<const TForms extends FormGroupMap>(
  forms: TForms,
  options: UseFormGroupOptions = {},
): UseFormGroupReturn<TForms> {
  const entries = Object.entries(forms) as Array<[string, FormGroupMember]>
  const localSubmissionCount = ref(0)
  const submitCount = ref(0)
  const submitOk = ref(false)
  let submitSequence = 0
  let latestSubmitId = 0
  let joinedSubmission:
    | Promise<FormGroupSubmitResult<TForms, unknown>>
    | undefined
  let group!: UseFormGroupReturn<TForms>

  const collectInputs = (): FormGroupInput<TForms> => {
    const values: Record<string, object> = {}
    for (const [name, form] of entries)
      values[name] = getMemberValues(form)
    return values as FormGroupInput<TForms>
  }

  const model = computed(() => {
    const values: Record<string, object> = {}
    for (const [name, form] of entries)
      values[name] = form.model
    return values as FormGroupInput<TForms>
  })

  const errors = computed(() => {
    const grouped: Record<string, FormErrors> = {}
    for (const [name, form] of entries) {
      if (Object.keys(form.errors).length)
        grouped[name] = cloneErrors(form.errors)
    }
    return grouped as FormGroupErrors<TForms>
  })
  const validating = computed(() =>
    entries.some(([, form]) => form.validating),
  )

  const dirty = computed(() => entries.some(([, form]) => form.dirty))
  const submitting = computed(() =>
    localSubmissionCount.value > 0
    || entries.some(([, form]) => form.submitting),
  )
  const changedPaths = computed(() => {
    const paths: string[] = []
    for (const [name, form] of entries) {
      for (const path of form.changedPaths)
        paths.push(`${name}.${path}`)
    }
    return paths
  })

  const mode = computed<FormMode>(() => {
    for (const [, form] of entries) {
      if (form.mode)
        return form.mode
    }
    return 'create'
  })

  const load = (
    next: FormMode,
    values?: Partial<FormGroupInput<TForms>>,
  ) => {
    submitCount.value = 0
    submitOk.value = false
    latestSubmitId = 0
    joinedSubmission = undefined
    for (const [name, form] of entries) {
      form.load?.(
        next,
        values?.[name as keyof FormGroupInput<TForms>] as
          | Partial<object>
          | undefined,
      )
    }
  }

  const setErrors = (next: FormGroupErrors<TForms>) => {
    for (const [name, form] of entries)
      setMemberErrors(form, next[name as keyof TForms] ?? {})
  }

  const scrollToFirstError = (): string | undefined => {
    for (const [name, form] of entries) {
      const path = scrollMemberToFirstError(form)
      if (path)
        return `${name}.${path}`
    }
    return undefined
  }

  const validate = async (): Promise<FormGroupValidationResult<TForms>> => {
    const results = await Promise.all(entries.map(([, form]) => validateMember(form)))
    const output: Record<string, object> = {}
    const groupedErrors: Record<string, FormErrors> = {}
    let valid = true

    for (let index = 0; index < entries.length; index++) {
      const [name] = entries[index]!
      const result = results[index]!
      if (result.ok)
        output[name] = result.values
      else {
        valid = false
        groupedErrors[name] = cloneErrors(result.errors)
      }
    }

    if (valid) {
      return {
        ok: true,
        values: output as FormGroupOutput<TForms>,
      }
    }

    if (options.scrollToError !== false)
      scrollToFirstError()
    return {
      ok: false,
      values: collectInputs(),
      errors: groupedErrors as FormGroupErrors<TForms>,
    }
  }

  const submit = <TError = never>(
    handler: FormGroupSubmitHandler<TForms, TError>,
  ): Promise<FormGroupSubmitResult<TForms, TError>> => {
    if ((options.submitPolicy ?? 'join') === 'join' && joinedSubmission) {
      return joinedSubmission as Promise<
        FormGroupSubmitResult<TForms, TError>
      >
    }

    let submission!: Promise<FormGroupSubmitResult<TForms, TError>>
    submission = (async (): Promise<
      FormGroupSubmitResult<TForms, TError>
    > => {
      const submitId = ++submitSequence
      latestSubmitId = submitId
      submitCount.value += 1
      submitOk.value = false
      let attemptOk = false
      localSubmissionCount.value += 1
      try {
        const validation = await validate()
        if (!validation.ok)
          return validation

        const outcome = await handler(validation.values, { group })
        if (outcome && !outcome.ok) {
          if (outcome.errors !== undefined) {
            setErrors(outcome.errors)
            if (options.scrollToError !== false)
              scrollToFirstError()
            return {
              ok: false,
              values: validation.values,
              submitError: outcome.error,
              errors: outcome.errors,
            } as FormGroupSubmitResult<TForms, TError>
          }
          return {
            ok: false,
            values: validation.values,
            submitError: outcome.error,
          } as FormGroupSubmitResult<TForms, TError>
        }

        attemptOk = true
        return validation
      }
      finally {
        if (submitId === latestSubmitId)
          submitOk.value = attemptOk
        localSubmissionCount.value -= 1
        if (
          (options.submitPolicy ?? 'join') === 'join'
          && joinedSubmission === submission
        ) {
          joinedSubmission = undefined
        }
      }
    })()

    if ((options.submitPolicy ?? 'join') === 'join') {
      joinedSubmission = submission as Promise<
        FormGroupSubmitResult<TForms, unknown>
      >
    }
    return submission
  }

  const reset = () => {
    submitCount.value = 0
    submitOk.value = false
    latestSubmitId = 0
    joinedSubmission = undefined
    for (const [, form] of entries)
      form.reset()
  }

  group = reactive({
    forms,
    model,
    errors,
    dirty,
    changedPaths,
    validating,
    submitting,
    submitCount,
    submitOk,
    mode,
    load,
    validate,
    submit,
    reset,
    setErrors,
    scrollToFirstError,
  }) as unknown as UseFormGroupReturn<TForms>

  return group
}
