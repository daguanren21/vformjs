import type { UseFormOptions, UseFormReturn } from '@veform/vue'
import { useForm } from '@veform/vue'
import { createAntdAdapter } from './create-antd-adapter'

/**
 * Vue3 + Ant Design Vue 入口。
 *
 * `defaults` 必填，用于推断 `onSubmit(values)` / `form.model` 类型。
 *
 * @example
 * ```ts
 * const form = useAntdForm({
 *   defaults: { name: '', email: '' },
 *   rules: { name: [r.required()] },
 *   onSubmit: async (values) => {
 *     // values: { name: string, email: string }
 *     await api.save(values)
 *   },
 * })
 * // <a-form :ref="i => form.bindHost(i)" :model="form.model" :rules="form.rules">
 * ```
 */
export type UseAntdFormOptions<T extends Record<string, unknown>> =
  Omit<UseFormOptions<T>, 'defaultValues' | 'adapter'> & {
    /** 初始值（必填），推断模型类型 */
    defaults: T | (() => T)
  }

export function useAntdForm<T extends Record<string, unknown>>(
  options: UseAntdFormOptions<T>,
): UseFormReturn<T> {
  const { defaults, ...rest } = options
  return useForm({
    ...rest,
    defaultValues: defaults,
    adapter: createAntdAdapter(),
  })
}
