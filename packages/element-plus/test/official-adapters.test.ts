import { describe, expect, it, vi } from 'vitest'
import { createAntdAdapter } from '../../ant-design-vue/src/create-adapter'
import { createElementUiAdapter } from '../../element-ui/src/create-adapter'
import { createNaiveAdapter } from '../../naive-ui/src/create-adapter'
import { createElementPlusAdapter } from '../src/create-adapter'

describe('official host adapter contract', () => {
  it('Element Plus supports partial validate, clear, reset, and scroll', async () => {
    const validateField = vi.fn((_paths: string[], callback: (valid: boolean) => void) => {
      callback(true)
      return Promise.resolve()
    })
    const clearValidate = vi.fn()
    const scrollToField = vi.fn()
    const adapter = createElementPlusAdapter()
    adapter.bind?.({
      fields: [{ prop: 'email' }],
      validateField,
      clearValidate,
      scrollToField,
    })

    expect(await adapter.validate(['email'])).toEqual({ valid: true })
    adapter.clearValidate?.(['email'])
    adapter.afterModelReset?.()
    adapter.scrollToField?.('email')

    expect(validateField).toHaveBeenCalledWith(['email'], expect.any(Function))
    expect(clearValidate).toHaveBeenNthCalledWith(1, ['email'])
    expect(clearValidate).toHaveBeenNthCalledWith(2)
    expect(scrollToField).toHaveBeenCalledWith('email')
  })

  it('element-ui supports partial validate, clear, reset, and field scrolling', async () => {
    const validateField = vi.fn((_path: string, callback: (message?: string) => void) => callback())
    const clearValidate = vi.fn()
    const scrollIntoView = vi.fn()
    const adapter = createElementUiAdapter()
    adapter.bind?.({
      fields: [{ prop: 'email', $el: { scrollIntoView } }],
      validateField,
      clearValidate,
    })

    expect(await adapter.validate(['email'])).toEqual({ valid: true })
    adapter.clearValidate?.(['email'])
    adapter.afterModelReset?.()
    adapter.scrollToField?.('email')

    expect(validateField).toHaveBeenCalledWith('email', expect.any(Function))
    expect(clearValidate).toHaveBeenNthCalledWith(1, ['email'])
    expect(clearValidate).toHaveBeenNthCalledWith(2)
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center' })
  })

  it('Naive UI supports partial validate, clear, reset, and path scrolling', async () => {
    const validate = vi.fn(async (_callback?: unknown, filter?: (rule: { key: string }) => boolean) => {
      expect(filter?.({ key: 'email' })).toBe(true)
      expect(filter?.({ key: 'name' })).toBe(false)
    })
    const restoreValidation = vi.fn()
    const scrollIntoView = vi.fn()
    const adapter = createNaiveAdapter()
    adapter.bind?.({
      validate,
      restoreValidation,
      $el: {
        querySelectorAll: () => [{ dataset: { vformPath: 'email' }, scrollIntoView }],
        querySelector: () => null,
      },
    })

    expect(await adapter.validate(['email'])).toEqual({ valid: true })
    adapter.clearValidate?.(['email'])
    adapter.afterModelReset?.()
    adapter.scrollToField?.('email')

    expect(restoreValidation).toHaveBeenCalledTimes(2)
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center' })
  })

  it('Ant Design Vue supports partial validate, clear, reset, and scroll', async () => {
    const validateFields = vi.fn(async () => ({}))
    const clearValidate = vi.fn()
    const scrollToField = vi.fn()
    const adapter = createAntdAdapter()
    adapter.bind?.({ validateFields, clearValidate, scrollToField })

    expect(await adapter.validate(['email'])).toEqual({ valid: true })
    adapter.clearValidate?.(['email'])
    adapter.afterModelReset?.()
    adapter.scrollToField?.('email')

    expect(validateFields).toHaveBeenCalledWith(['email'])
    expect(clearValidate).toHaveBeenNthCalledWith(1, 'email')
    expect(clearValidate).toHaveBeenNthCalledWith(2)
    expect(scrollToField).toHaveBeenCalledWith('email')
  })
})
