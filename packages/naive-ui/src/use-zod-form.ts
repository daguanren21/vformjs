import type { UseZodFormOptions, UseZodFormReturn } from '@vformjs/zod'
import { useZodForm as useZodFormBase } from '@vformjs/zod'
import type { ZodType } from 'zod'
import { createNaiveAdapter } from './create-adapter'

/** Zod + Naive UI with the same flat application-form API. */
export function useZodForm<
  S extends ZodType<Record<string, unknown>>,
  TSubmitError = never,
>(
  options: Omit<UseZodFormOptions<S, TSubmitError>, 'adapter'>,
): UseZodFormReturn<S, TSubmitError> {
  return useZodFormBase({
    ...options,
    adapter: createNaiveAdapter(),
  })
}

export type { UseZodFormOptions, UseZodFormReturn } from '@vformjs/zod'
