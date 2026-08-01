import type { UseFormOptions, UseFormReturn } from '@vformjs/vue'
import { useForm } from '@vformjs/vue'
import { createNaiveAdapter } from './create-adapter'

/**
 * Vue3 + Naive UI 入口。
 *
 * `defaults` 必填，用于推断 `onSubmit(values)` / `form.model` 类型。
 *
 * @example
 * ```ts
 * const form = useNaiveForm({
 *   defaults: { name: '' },
 *   rules: { name: [r.required()] },
 *   onSubmit: async (values) => api.save(values),
 * })
 * // <n-form :ref="i => form.bindHost(i)" :model="form.model" :rules="form.rules">
 * ```
 */
export type UseNaiveFormOptions<T extends Record<string, unknown>> =
  Omit<UseFormOptions<T>, 'defaultValues' | 'adapter'> & {
    /** 初始值（必填），推断模型类型 */
    defaults: T | (() => T)
  }

export function useNaiveForm<T extends Record<string, unknown>>(
  options: UseNaiveFormOptions<T>,
): UseFormReturn<T> {
  const { defaults, ...rest } = options
  return useForm({
    ...rest,
    defaultValues: defaults,
    adapter: createNaiveAdapter(),
  })
}
