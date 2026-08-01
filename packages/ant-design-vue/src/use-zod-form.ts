import type { UseZodFormOptions, UseZodFormReturn } from '@vformjs/zod'
import { useZodForm as useZodFormBase } from '@vformjs/zod'
import type { ZodType } from 'zod'
import { createAntdAdapter } from './create-adapter'

/** Zod form with the Ant Design Vue host adapter already configured. */
export function useZodForm<S extends ZodType<Record<string, unknown>>>(
  options: Omit<UseZodFormOptions<S>, 'adapter'>,
): UseZodFormReturn<S> {
  return useZodFormBase({
    ...options,
    adapter: createAntdAdapter(),
  })
}

export type { UseZodFormOptions, UseZodFormReturn } from '@vformjs/zod'
