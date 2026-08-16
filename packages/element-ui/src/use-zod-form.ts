import type { UseZodFormOptions, UseZodFormReturn } from '@vformjs/zod'
import { useZodForm as useZodFormBase } from '@vformjs/zod'
import type { ZodType } from 'zod'
import { createElementUiAdapter } from './create-adapter'

/** Zod + element-ui with the same flat application-form API. */
export function useZodForm<
  S extends ZodType<Record<string, unknown>>,
  TSubmitError = never,
>(
  options: Omit<UseZodFormOptions<S, TSubmitError>, 'adapter'>,
): UseZodFormReturn<S, TSubmitError> {
  return useZodFormBase({
    ...options,
    adapter: createElementUiAdapter(),
  })
}

export type { UseZodFormOptions, UseZodFormReturn } from '@vformjs/zod'
