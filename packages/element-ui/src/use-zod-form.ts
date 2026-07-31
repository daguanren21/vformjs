import type { UseZodFormOptions, UseZodFormReturn } from '@veform/zod'
import { useZodForm as useZodFormBase } from '@veform/zod'
import type { ZodType } from 'zod'
import { createElementUiAdapter } from './create-adapter'

/**
 * Zod + element-ui (Vue 2.7) — one import, no manual adapter.
 */
export function useZodForm<S extends ZodType<Record<string, unknown>>>(
  options: Omit<UseZodFormOptions<S>, 'adapter'>,
): UseZodFormReturn<S> {
  return useZodFormBase({
    ...options,
    adapter: createElementUiAdapter(),
  })
}

export type { UseZodFormOptions, UseZodFormReturn } from '@veform/zod'
