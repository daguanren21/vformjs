/**
 * Smoke: playground Naive adapter built with defineAdapter.
 */
import { describe, expect, it, vi } from 'vitest'
import { createNaiveAdapter } from '../src/create-adapter'

describe('createNaiveAdapter (defineAdapter)', () => {
  it('fails when host unbound', async () => {
    const adapter = createNaiveAdapter()
    const res = await adapter.validate()
    expect(res.valid).toBe(false)
    expect(res.errors?._form?.[0]).toMatch(/naive-ui|not bound|bindHost/i)
  })

  it('maps thrown ValidateError[][] via normalizeHostErrors', async () => {
    const adapter = createNaiveAdapter()
    adapter.bind?.({
      validate: async () => {
        throw [[{ field: 'email', message: '邮箱不正确' }]]
      },
      restoreValidation: () => {},
    })
    const res = await adapter.validate()
    expect(res.valid).toBe(false)
    expect(res.errors?.email?.[0]).toBe('邮箱不正确')
  })

  it('passes shouldRuleBeApplied for partial validate', async () => {
    const adapter = createNaiveAdapter()
    const validate = vi.fn(async (_cb?: unknown, filter?: (rule: any) => boolean) => {
      expect(typeof filter).toBe('function')
      expect(filter!({ key: 'name' })).toBe(true)
      expect(filter!({ key: 'email' })).toBe(false)
    })
    adapter.bind?.({
      validate,
      restoreValidation: () => {},
    })
    const res = await adapter.validate(['name'])
    expect(res.valid).toBe(true)
    expect(validate).toHaveBeenCalled()
  })

  it('restoreValidation on clear / after reset', () => {
    const restoreValidation = vi.fn()
    const adapter = createNaiveAdapter()
    adapter.bind?.({
      validate: async () => {},
      restoreValidation,
    })
    adapter.clearValidate?.()
    adapter.afterModelReset?.()
    expect(restoreValidation).toHaveBeenCalledTimes(2)
  })
})
