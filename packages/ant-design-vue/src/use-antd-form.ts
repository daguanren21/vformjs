import type { UseFormOptions, UseFormReturn } from '@vformjs/vue'
import { useForm } from '@vformjs/vue'
import { createAntdAdapter } from './create-adapter'

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
 * // <a-form v-bind="form.host">
 * ```
 */
export type UseAntdFormOptions<
  T extends object,
  TSubmitError = never,
> = Omit<UseFormOptions<T, TSubmitError>, 'defaultValues' | 'adapter'> & {
    /** 初始值（必填），推断模型类型 */
    defaults: T | (() => T)
  }

export function useAntdForm<
  T extends object,
  TSubmitError = never,
>(
  options: UseAntdFormOptions<T, TSubmitError>,
): UseFormReturn<T, TSubmitError> {
  const { defaults, ...rest } = options
  return useForm({
    ...rest,
    defaultValues: defaults,
    adapter: createAntdAdapter(),
  })
}
