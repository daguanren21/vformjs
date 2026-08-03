import { defineAdapter, type DefineAdapterFactory } from '@vformjs/core'
import type { FormInstance } from 'ant-design-vue/es/form'
import type { NamePath } from 'ant-design-vue/es/form/interface'

function toNamePath(path: string): NamePath {
  return path.split('.').map(segment =>
    segment !== '' && String(Number(segment)) === segment
      ? Number(segment)
      : segment,
  )
}

/**
 * Ant Design Vue a-form adapter（defineAdapter）。
 *
 * validateFields 失败 throw ValidateErrorEntity：
 * { errorFields: [{ name: NamePath, errors: string[] }] }
 * → core.normalizeHostErrors 已支持 errorFields。
 */
export const createAntdAdapter: DefineAdapterFactory<FormInstance> = defineAdapter<FormInstance>({
  name: 'ant-design-vue',

  async validate(host, { paths }) {
    if (paths?.length) {
      await host.validateFields(paths.map(toNamePath))
      return
    }
    await host.validateFields()
  },

  clearValidate(host, paths) {
    if (paths?.length) {
      for (const p of paths)
        host.clearValidate(toNamePath(p))
      return
    }
    host.clearValidate()
  },

  scrollToField(host, path) {
    host.scrollToField(toNamePath(path))
  },

  itemProps(path, error) {
    return {
      name: toNamePath(path),
      validateStatus: error ? 'error' : undefined,
      help: error,
      'data-vform-path': path,
    }
  },

  afterModelReset(host) {
    host.clearValidate()
  },
})
