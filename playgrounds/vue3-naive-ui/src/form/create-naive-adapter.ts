import { defineAdapter } from '@veform/core'
import type { FormInst, FormItemRule } from 'naive-ui'

/**
 * Naive UI n-form adapter — defineAdapter 写法。
 *
 * 开发者只写「怎么调 n-form」：
 * - validate 成功 resolve，失败 throw（Naive 原生行为）
 * - 错误形状由 core.normalizeHostErrors 自动解析
 * - bind / 未绑定提示 / clear 生命周期框架处理
 *
 * @see https://www.naiveui.com/
 */
export const createNaiveAdapter = defineAdapter<FormInst>({
  name: 'naive-ui',

  async validate(host, { paths }) {
    if (paths?.length) {
      const set = new Set(paths)
      // Naive 局部校验：第二参数 shouldRuleBeApplied
      await host.validate(undefined, (rule: FormItemRule) => {
        const field = String(
          (rule as { key?: string }).key
          ?? (rule as { field?: string }).field
          ?? '',
        )
        if (!field)
          return true
        if (set.has(field))
          return true
        for (const p of set) {
          if (field === p || field.startsWith(`${p}.`) || p.startsWith(`${field}.`))
            return true
        }
        return false
      })
      return
    }
    await host.validate()
  },

  clearValidate(host) {
    host.restoreValidation()
  },

  afterModelReset(host) {
    host.restoreValidation()
  },
})
