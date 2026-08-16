import type { UseZodFormOptions, UseZodFormReturn } from '@vformjs/zod'
import { useZodForm as useZodFormBase } from '@vformjs/zod'
import type { ZodType } from 'zod'
import { createElementPlusAdapter } from './create-adapter'

/** Zod + Element Plus with the same flat application-form API. */
export function useZodForm<
  S extends ZodType<Record<string, unknown>>,
  TSubmitError = never,
>(
  options: Omit<UseZodFormOptions<S, TSubmitError>, 'adapter'>,
): UseZodFormReturn<S, TSubmitError> {
  return useZodFormBase({
    ...options,
    adapter: createElementPlusAdapter(),
  })
}

export type { UseZodFormOptions, UseZodFormReturn } from '@vformjs/zod'
