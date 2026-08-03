import type { SubmitHandlerResult } from '@vformjs/core'
import type { UseFormOptions, UseFormReturn } from '@vformjs/vue'
import { useForm } from '@vformjs/vue'
import type { z, ZodType } from 'zod'
import { createZodResolver } from './resolver'
import {
  arrayLengthSignature,
  createSharedZodParser,
  zodToRules,
} from './to-rules'

type ZodInput<S extends ZodType> = z.input<S> & Record<string, unknown>
type ZodOutput<S extends ZodType> = z.output<S> & Record<string, unknown>

export interface UseZodFormOptions<
  S extends ZodType<Record<string, unknown>>,
  TSubmitError = never,
> extends Omit<
  UseFormOptions<ZodInput<S>, TSubmitError, ZodOutput<S>>,
  'rules' | 'defaultValues' | 'onSubmit' | 'resolver'
> {
  schema: S
  /**
   * Initial values. Required.
   * Prefer shapes matching `z.input<S>` (pre-transform / pre-coerce).
   */
  defaults: z.input<S> | (() => z.input<S>)
  /** Receives parsed `z.output<S>` values after validation succeeds. */
  onSubmit?: (
    values: ZodOutput<S>,
    ctx: {
      form: UseFormReturn<
        ZodInput<S>,
        TSubmitError,
        ZodOutput<S>
      >['raw']
    },
  ) => SubmitHandlerResult<TSubmitError>
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

export type UseZodFormReturn<
  S extends ZodType<Record<string, unknown>>,
  TSubmitError = never,
> = UseFormReturn<ZodInput<S>, TSubmitError, ZodOutput<S>> & {
  schema: S
}


/**
 * Schema-driven form. Core owns the validate/submit pipeline; generated rules
 * only let a bound UI host trigger that same resolver during field interaction.
 */
export function useZodForm<
  S extends ZodType<Record<string, unknown>>,
  TSubmitError = never,
>(
  options: UseZodFormOptions<S, TSubmitError>,
): UseZodFormReturn<S, TSubmitError> {
  type TInput = ZodInput<S>
  type TOutput = ZodOutput<S>

  const {
    schema,
    defaults,
    deep,
    arrays = true,
    ...formOptions
  } = options
  if (defaults == null) {
    throw new Error(
      '[vformjs/zod] `defaults` is required. '
      + 'Pass initial values matching your schema input type.',
    )
  }
  const defaultValues = (
    typeof defaults === 'function'
      ? (defaults as () => z.input<S>)()
      : defaults
  ) as TInput

  // Late-bound so host field validators always read the live model.
  let getValues: () => Record<string, unknown> = () =>
    defaultValues as Record<string, unknown>
  const parser = createSharedZodParser(schema, () => getValues())

  const buildRules = () => {
    const ruleOptions: Parameters<typeof zodToRules>[1] = {
      getValues: () => getValues(),
      arrays,
      parser,
    }
    if (deep != null)
      ruleOptions.deep = deep
    return zodToRules(schema, ruleOptions)
  }

  let rules = buildRules()
  let firstRulePath = Object.keys(rules)[0]
  let lastArraySignature = arrayLengthSignature(
    schema,
    defaultValues as Record<string, unknown>,
  )
  const resolver = createZodResolver(schema, {
    parser,
    fallbackPath: () => firstRulePath,
  })

  const form = useForm<TInput, TSubmitError, TOutput>({
    ...formOptions,
    defaultValues,
    rules,
    resolver,
  })
  getValues = () => form.getValues() as Record<string, unknown>

  const resyncArrayRulesIfNeeded = () => {
    if (!arrays)
      return
    const live = form.getValues() as Record<string, unknown>
    const signature = arrayLengthSignature(schema, live)
    if (signature === lastArraySignature)
      return
    lastArraySignature = signature
    rules = buildRules()
    firstRulePath = Object.keys(rules)[0]
    form.raw.setRules(rules)
  }

  form.raw.subscribe((event) => {
    if (event.type === 'values' || event.type === 'reset') {
      parser.invalidate()
      resyncArrayRulesIfNeeded()
    }
  })

  // Mutate the reactive form object; spreading would unwrap Vue refs.
  return Object.assign(form, { schema }) as UseZodFormReturn<S, TSubmitError>
}
