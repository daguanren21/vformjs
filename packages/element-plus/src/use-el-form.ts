import type { UseFormOptions, UseFormReturn } from '@vformjs/vue'
import { useForm } from '@vformjs/vue'
import { createElementPlusAdapter } from './create-adapter'

/**
 * Vue3 + element-plus 入口。
 *
 * `defaults` 必填，TypeScript 会从它推断 `form.model` / `onSubmit(values)` 的类型，
 * 无需手写泛型或 `values: any`。
 *
 * @example
 * ```ts
 * const form = useElForm({
 *   defaults: { name: '', age: 0 },
 *   rules: { name: [r.required()] },
 *   onSubmit: async (values) => {
 *     // values: { name: string, age: number }
 *     await api.save(values)
 *   },
 * })
 * ```
 * ```vue
 * <el-form v-bind="form.el">...</el-form>
 * <el-button @click="form.submit()">提交</el-button>
 * ```
 */
export type UseElFormOptions<T extends Record<string, unknown>> =
  Omit<UseFormOptions<T>, 'defaultValues' | 'adapter'> & {
    /**
     * 初始值（必填）。推断表单模型类型 `T` 的主要来源。
     * 也可用 `() => T` 惰性创建。
     */
    defaults: T | (() => T)
  }

export function useElForm<T extends Record<string, unknown>>(
  options: UseElFormOptions<T>,
): UseFormReturn<T> {
  const { defaults, ...rest } = options
  return useForm({
    ...rest,
    defaultValues: defaults,
    adapter: createElementPlusAdapter(),
  })
}
