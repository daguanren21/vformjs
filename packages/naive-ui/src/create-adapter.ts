import { defineAdapter, type DefineAdapterFactory } from '@vformjs/core'
import type { FormInst, FormItemRule } from 'naive-ui'

interface NaiveFormHost extends FormInst {
  $el?: ParentNode
}

function findPathTarget(host: NaiveFormHost, path: string): Element | undefined {
  if (!host.$el)
    return undefined
  for (const item of host.$el.querySelectorAll<HTMLElement>('[data-vform-path]')) {
    if (item.dataset.vformPath === path)
      return item
  }
  return undefined
}

function findScrollTarget(host: NaiveFormHost, path: string): Element | undefined {
  const target = findPathTarget(host, path)
  if (target)
    return target
  const invalid = host.$el?.querySelector<HTMLElement>('.n-form-item-blank--error')
  return invalid?.closest('.n-form-item') ?? invalid ?? undefined
}

function focusFirst(root?: Element): void {
  root?.querySelector<HTMLElement>(
    'input:not([disabled]),textarea:not([disabled]),select:not([disabled]),button:not([disabled]),[tabindex]:not([tabindex="-1"])',
  )?.focus()
}

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
export const createNaiveAdapter: DefineAdapterFactory<NaiveFormHost> = defineAdapter<NaiveFormHost>({
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

  scrollToField(host, path) {
    findScrollTarget(host, path)?.scrollIntoView({ block: 'center' })
  },

  focusField(host, path) {
    focusFirst(findPathTarget(host, path))
  },

  itemProps(path, error) {
    return {
      path,
      feedback: error,
      validationStatus: error ? 'error' : undefined,
      'data-vform-path': path,
    }
  },

  afterModelReset(host) {
    host.restoreValidation()
  },
})
