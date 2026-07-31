import type { UseZodFormOptions, UseZodFormReturn } from '@vformjs/zod'
import { useZodForm as useZodFormBase } from '@vformjs/zod'
import type { ZodType } from 'zod'
import { createElementPlusAdapter } from './create-adapter'

/**
 * Zod + Element Plus — one import, no manual adapter.
 *
 * ```ts
 * import { useZodForm } from '@vformjs/element-plus/zod'
 * // or from package root if re-exported
 *
 * const form = useZodForm({
 *   schema,
 *   defaults: { name: '', email: '' },
 *   onSubmit: async (v) => api.save(v),
 * })
 * ```
 * ```vue
 * <el-form v-bind="form.el">...</el-form>
 * ```
 */
export function useZodForm<S extends ZodType<Record<string, unknown>>>(
  options: Omit<UseZodFormOptions<S>, 'adapter'>,
): UseZodFormReturn<S> {
  return useZodFormBase({
    ...options,
    adapter: createElementPlusAdapter(),
  })
}

export type { UseZodFormOptions, UseZodFormReturn } from '@vformjs/zod'
