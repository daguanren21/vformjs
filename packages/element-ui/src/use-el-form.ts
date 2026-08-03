import type { UseFormOptions, UseFormReturn } from '@vformjs/vue'
import { useForm } from '@vformjs/vue'
import { createElementUiAdapter } from './create-adapter'

/**
 * Vue2.7 + element-ui 入口。
 *
 * `defaults` 必填，TypeScript 从它推断 `form.model` / `onSubmit(values)`。
 *
 * @example
 * ```ts
 * const form = useElForm({
 *   defaults: { name: '' },
 *   rules: { name: [r.required()] },
 *   onSubmit: async (values) => api.save(values),
 * })
 * ```
 */
export type UseElFormOptions<
  T extends object,
  TSubmitError = never,
> = Omit<UseFormOptions<T, TSubmitError>, 'defaultValues' | 'adapter'> & {
    /**
     * 初始值（必填）。推断表单模型类型 `T` 的主要来源。
     */
    defaults: T | (() => T)
  }

export function useElForm<
  T extends object,
  TSubmitError = never,
>(
  options: UseElFormOptions<T, TSubmitError>,
): UseFormReturn<T, TSubmitError> {
  const { defaults, ...rest } = options
  return useForm({
    ...rest,
    defaultValues: defaults,
    adapter: createElementUiAdapter(),
  })
}
