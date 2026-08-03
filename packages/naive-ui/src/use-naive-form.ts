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
 * // <n-form v-bind="form.host">
 * ```
 */
export type UseNaiveFormOptions<
  T extends object,
  TSubmitError = never,
> = Omit<UseFormOptions<T, TSubmitError>, 'defaultValues' | 'adapter'> & {
    /** 初始值（必填），推断模型类型 */
    defaults: T | (() => T)
  }

export function useNaiveForm<
  T extends object,
  TSubmitError = never,
>(
  options: UseNaiveFormOptions<T, TSubmitError>,
): UseFormReturn<T, TSubmitError> {
  const { defaults, ...rest } = options
  return useForm({
    ...rest,
    defaultValues: defaults,
    adapter: createNaiveAdapter(),
  })
}
