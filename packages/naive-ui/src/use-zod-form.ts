import type { UseZodFormOptions, UseZodFormReturn } from '@vformjs/zod'
import { useZodForm as useZodFormBase } from '@vformjs/zod'
import type { ZodType } from 'zod'
import { createNaiveAdapter } from './create-adapter'

/** Zod form with the Naive UI host adapter already configured. */
export function useZodForm<S extends ZodType<Record<string, unknown>>>(
  options: Omit<UseZodFormOptions<S>, 'adapter'>,
): UseZodFormReturn<S> {
  return useZodFormBase({
    ...options,
    adapter: createNaiveAdapter(),
  })
}

export type { UseZodFormOptions, UseZodFormReturn } from '@vformjs/zod'
