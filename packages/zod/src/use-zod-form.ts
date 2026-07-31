import type { FormResult } from '@vformjs/core'
import { deepClone } from '@vformjs/core'
import type { UseFormOptions, UseFormReturn } from '@vformjs/vue'
import { useForm } from '@vformjs/vue'
import type { z, ZodType } from 'zod'
import {
  arrayLengthSignature,
  createSharedZodParser,
  zodIssuesToFormErrors,
  zodToRules,
} from './to-rules'

type ZodInput<S extends ZodType> = z.input<S> & Record<string, unknown>
type ZodOutput<S extends ZodType> = z.output<S> & Record<string, unknown>

export interface UseZodFormOptions<S extends ZodType<Record<string, unknown>>>
  extends Omit<UseFormOptions<ZodInput<S>>, 'rules' | 'defaultValues'> {
  schema: S
  /**
   * Initial values. Required.
   * Prefer shapes matching `z.input<S>` (pre-transform / pre-coerce).
   */
  defaults: z.input<S> | (() => z.input<S>)
  /** @deprecated use `defaults` */
  defaultValues?: z.input<S> | (() => z.input<S>)
  /**
   * Expand nested objects into dotted props (`profile.email`).
   * Default: auto-detect when nested ZodObject exists.
   */
  deep?: boolean
  /**
   * Expand `z.array(z.object(...))` to `list.i.field` rules.
   * Rebuilt when array lengths change. Default true.
   */
  arrays?: boolean
}

export type UseZodFormReturn<S extends ZodType<Record<string, unknown>>> =
  Omit<UseFormReturn<ZodInput<S>>, 'submit' | 'validate'> & {
    schema: S
    /**
     * Validate. On success, `values` are **parsed output** (`z.output`).
     * On failure, `values` remain the live model (**input** shape).
     */
    validate: (
      paths?: Parameters<UseFormReturn<ZodInput<S>>['validate']>[0],
    ) => Promise<FormResult<ZodOutput<S>> | FormResult<ZodInput<S>>>
    /**
     * Submit with parsed output values on success.
     */
    submit: (
      handler?: (
        values: ZodOutput<S>,
        ctx: { form: UseFormReturn<ZodInput<S>>['raw'] },
      ) => void | Promise<void>,
    ) => Promise<FormResult<ZodOutput<S>> | FormResult<ZodInput<S>>>
  }

function resolveDefaults<S extends ZodType<Record<string, unknown>>>(
  options: UseZodFormOptions<S>,
): z.input<S> {
  const raw = options.defaults ?? options.defaultValues
  if (raw == null) {
    throw new Error(
      '[vformjs/zod] `defaults` is required. '
      + 'Pass initial values matching your schema input type.',
    )
  }
  if (typeof raw === 'function')
    return (raw as () => z.input<S>)()
  return raw as z.input<S>
}

function isDetailMode(mode: unknown): boolean {
  if (mode === 'detail')
    return true
  if (mode && typeof mode === 'object' && 'value' in (mode as object))
    return (mode as { value: unknown }).value === 'detail'
  return false
}

function isHostUnboundError(errors: Record<string, string[]> | undefined): boolean {
  const msg = errors?._form?.[0]
  return typeof msg === 'string' && msg.includes('not bound')
}

/**
 * Schema-driven form for Element hosts.
 *
 * Field rules run **full Zod parse** (refine/superRefine appear on the matching prop).
 * Whole-form validation shares one `safeParse` across fields via a wave cache.
 *
 * Prefer the adapter entry so you never pass `adapter` yourself:
 * ```ts
 * import { useZodForm } from '@vformjs/element-plus'
 * ```
 */
export function useZodForm<S extends ZodType<Record<string, unknown>>>(
  options: UseZodFormOptions<S>,
): UseZodFormReturn<S> {
  type TIn = ZodInput<S>
  type TOut = ZodOutput<S>

  const { schema, deep, arrays = true, onSubmit, ...rest } = options
  const defaultValues = resolveDefaults(options) as TIn

  // Late-bound so validators always read the live model
  let getValues: () => Record<string, unknown> = () =>
    deepClone(defaultValues) as Record<string, unknown>

  const parser = createSharedZodParser(schema, () => getValues())

  const buildRules = () => {
    const opts: Parameters<typeof zodToRules>[1] = {
      getValues: () => getValues(),
      arrays,
      parser,
    }
    if (deep != null)
      opts.deep = deep
    return zodToRules(schema, opts)
  }

  let rules = buildRules()
  let firstRulePath = Object.keys(rules)[0]
  let lastArraySig = arrayLengthSignature(schema, defaultValues as Record<string, unknown>)

  const form = useForm<TIn>({
    ...rest,
    defaultValues,
    rules,
  })

  getValues = () => deepClone(form.getValues()) as Record<string, unknown>

  const hostValidate = form.validate.bind(form)

  /** Rebuild rules when array lengths change (form.list append/remove). */
  const resyncArrayRulesIfNeeded = () => {
    if (!arrays)
      return
    const live = form.getValues() as Record<string, unknown>
    const sig = arrayLengthSignature(schema, live)
    if (sig === lastArraySig)
      return
    lastArraySig = sig
    rules = buildRules()
    firstRulePath = Object.keys(rules)[0]
    form.raw.setRules(rules)
  }

  // Watch model changes: drop parse cache + rebuild array rules when lengths change
  form.raw.subscribe((event) => {
    if (event.type === 'values' || event.type === 'reset') {
      parser.invalidate()
      resyncArrayRulesIfNeeded()
    }
  })

  const surfaceZodErrors = async (errors: Record<string, string[]>) => {
    for (const [path, messages] of Object.entries(errors))
      form.raw.setFieldError(path, messages)

    let errorPaths = Object.keys(errors).filter(p => p !== '_form')
    if (!errorPaths.length && firstRulePath)
      errorPaths = [firstRulePath]
    if (errorPaths.length)
      await hostValidate(errorPaths).catch(() => undefined)
  }

  const parseLive = (
    live: TIn,
  ): FormResult<TOut> | FormResult<TIn> => {
    const parsed = schema.safeParse(live)
    if (parsed.success)
      return { ok: true, values: parsed.data as TOut }
    const errors = zodIssuesToFormErrors(parsed.error, firstRulePath ?? '_form')
    return { ok: false, values: live, errors }
  }

  const validate = async (
    paths?: Parameters<typeof form.validate>[0],
  ): Promise<FormResult<TOut> | FormResult<TIn>> => {
    resyncArrayRulesIfNeeded()
    parser.invalidate()

    // Always clear previous core error map so headless re-validate is not sticky
    form.raw.clearErrors()

    const fieldResult = await hostValidate(paths)

    // Host unbound (or headless): fall back to schema-only validation
    if (!fieldResult.ok && isHostUnboundError(fieldResult.errors)) {
      const live = form.getValues()
      const result = parseLive(live)
      if (!result.ok) {
        for (const [path, messages] of Object.entries(result.errors))
          form.raw.setFieldError(path, messages)
      }
      return result
    }

    if (!fieldResult.ok)
      return fieldResult as FormResult<TIn>

    // Partial validate — field rules already ran full-schema for those props
    if (paths != null)
      return fieldResult as FormResult<TIn>

    // Prefer host-trimmed values when available (trimOnSuccess)
    const live = (fieldResult.values ?? form.getValues()) as TIn
    const result = parseLive(live)
    if (!result.ok) {
      for (const [path, messages] of Object.entries(result.errors))
        form.raw.setFieldError(path, messages)
      await surfaceZodErrors(result.errors)
    }
    return result
  }

  const submit = async (
    handler?: (
      values: TOut,
      ctx: { form: typeof form.raw },
    ) => void | Promise<void>,
  ): Promise<FormResult<TOut> | FormResult<TIn>> => {
    if (isDetailMode(form.mode)) {
      return {
        ok: false,
        values: form.getValues(),
        errors: { _form: ['detail mode is read-only'] },
      }
    }

    // reactive() unwrap: UseFormReturn.submitting is boolean
    form.submitting = true
    try {
      const result = await validate()
      if (!result.ok)
        return result

      const run = handler ?? (onSubmit as typeof handler | undefined)
      if (run)
        await run(result.values as TOut, { form: form.raw })
      return result
    }
    finally {
      form.submitting = false
    }
  }

  // Mutate the reactive form object — do NOT spread (would unwrap refs)
  return Object.assign(form, {
    validate,
    submit,
    schema,
  }) as UseZodFormReturn<S>
}
