import { defineAdapter } from '@vformjs/core'
import type { FormInstance } from 'ant-design-vue/es/form'
import type { NamePath } from 'ant-design-vue/es/form/interface'

/**
 * Ant Design Vue a-form adapter（defineAdapter）。
 *
 * validateFields 失败 throw ValidateErrorEntity：
 * { errorFields: [{ name: NamePath, errors: string[] }] }
 * → core.normalizeHostErrors 已支持 errorFields。
 */
export const createAntdAdapter = defineAdapter<FormInstance>({
  name: 'ant-design-vue',

  async validate(host, { paths }) {
    if (paths?.length) {
      await host.validateFields(paths as NamePath[])
      return
    }
    await host.validateFields()
  },

  clearValidate(host, paths) {
    if (paths?.length) {
      for (const p of paths)
        host.clearValidate(p as NamePath)
      return
    }
    host.clearValidate()
  },

  scrollToField(host, path) {
    host.scrollToField(path as NamePath)
  },

  afterModelReset(host) {
    host.clearValidate()
  },
})
