import { describe, expect, it, vi } from 'vitest'
import { createAntdAdapter } from '../../../playgrounds/vue3-antd-vue/src/form/create-antd-adapter'
import { normalizeHostErrors } from '@veform/core'

describe('createAntdAdapter (defineAdapter)', () => {
  it('fails when host unbound', async () => {
    const adapter = createAntdAdapter()
    const res = await adapter.validate()
    expect(res.valid).toBe(false)
    expect(res.errors?._form?.[0]).toMatch(/ant-design-vue|not bound|bindHost/i)
  })

  it('maps errorFields entity from validateFields reject', async () => {
    const adapter = createAntdAdapter()
    adapter.bind?.({
      validateFields: async () => {
        throw {
          values: {},
          outOfDate: false,
          errorFields: [
            { name: ['email'], errors: ['邮箱不正确'] },
            { name: 'name', errors: ['请输入姓名'] },
          ],
        }
      },
      clearValidate: () => {},
      scrollToField: () => {},
    })
    const res = await adapter.validate()
    expect(res.valid).toBe(false)
    expect(res.errors?.email?.[0]).toBe('邮箱不正确')
    expect(res.errors?.name?.[0]).toBe('请输入姓名')
  })

  it('passes name list for partial validate', async () => {
    const validateFields = vi.fn(async () => ({}))
    const adapter = createAntdAdapter()
    adapter.bind?.({
      validateFields,
      clearValidate: () => {},
      scrollToField: () => {},
    })
    const res = await adapter.validate(['email', 'name'])
    expect(res.valid).toBe(true)
    expect(validateFields).toHaveBeenCalledWith(['email', 'name'])
  })

  it('clearValidate / afterModelReset / scrollToField', () => {
    const clearValidate = vi.fn()
    const scrollToField = vi.fn()
    const adapter = createAntdAdapter()
    adapter.bind?.({
      validateFields: async () => ({}),
      clearValidate,
      scrollToField,
    })
    adapter.clearValidate?.(['email'])
    adapter.afterModelReset?.()
    adapter.scrollToField?.('name')
    expect(clearValidate).toHaveBeenCalled()
    expect(scrollToField).toHaveBeenCalledWith('name')
  })
})

describe('normalizeHostErrors ant design', () => {
  it('joins nested name path', () => {
    const errors = normalizeHostErrors({
      errorFields: [{ name: ['user', 'email'], errors: ['x'] }],
    })
    expect(errors['user.email']).toEqual(['x'])
  })
})
