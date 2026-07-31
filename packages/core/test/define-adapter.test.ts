import { describe, expect, it, vi } from 'vitest'
import {
  adapterFail,
  adapterOk,
  defineAdapter,
  normalizeHostErrors,
} from '../src/define-adapter'

describe('normalizeHostErrors', () => {
  it('maps Naive ValidateError[][]', () => {
    const errors = normalizeHostErrors([
      [{ field: 'name', message: '必填' }],
      [{ field: 'email', message: '邮箱不对' }],
    ])
    expect(errors.name).toEqual(['必填'])
    expect(errors.email).toEqual(['邮箱不对'])
  })

  it('maps flat ValidateError[]', () => {
    const errors = normalizeHostErrors([
      { field: 'title', message: '短' },
    ])
    expect(errors.title).toEqual(['短'])
  })

  it('maps Record<path, string[]>', () => {
    const errors = normalizeHostErrors({
      age: ['太小'],
    })
    expect(errors.age).toEqual(['太小'])
  })

  it('maps Ant Design Vue ValidateErrorEntity.errorFields', () => {
    const errors = normalizeHostErrors({
      values: {},
      outOfDate: false,
      errorFields: [
        { name: ['email'], errors: ['邮箱不正确'] },
        { name: 'username', errors: ['用户名不能为 admin'] },
      ],
    })
    expect(errors.email).toEqual(['邮箱不正确'])
    expect(errors.username).toEqual(['用户名不能为 admin'])
  })

  it('maps Error / string', () => {
    expect(normalizeHostErrors(new Error('boom'))._form).toEqual(['boom'])
    expect(normalizeHostErrors('x')._form).toEqual(['x'])
  })
})

describe('defineAdapter', () => {
  it('binds host and validates via hooks', async () => {
    const create = defineAdapter<{
      validate: () => Promise<void>
      clear: () => void
    }>({
      name: 'mini',
      async validate(host) {
        await host.validate()
      },
      clearValidate(host) {
        host.clear()
      },
    })

    const adapter = create()
    const unbound = await adapter.validate()
    expect(unbound.valid).toBe(false)
    expect(unbound.errors?._form?.[0]).toMatch(/mini|not bound|bindHost/i)

    const clear = vi.fn()
    adapter.bind?.({
      validate: async () => {
        throw [[{ field: 'a', message: 'err-a' }]]
      },
      clear,
    })
    const bad = await adapter.validate()
    expect(bad.valid).toBe(false)
    expect(bad.errors?.a).toEqual(['err-a'])

    adapter.clearValidate?.()
    adapter.afterModelReset?.()
    expect(clear).toHaveBeenCalledTimes(2)
  })

  it('accepts adapterOk / adapterFail returns', async () => {
    const create = defineAdapter<Record<string, never>>({
      async validate() {
        return adapterFail({ name: ['x'] })
      },
    })
    const adapter = create()
    adapter.bind?.({})
    const res = await adapter.validate()
    expect(res).toEqual({ valid: false, errors: { name: ['x'] } })

    const createOk = defineAdapter<Record<string, never>>({
      async validate() {
        return adapterOk()
      },
    })
    const okAdapter = createOk()
    okAdapter.bind?.({})
    expect((await okAdapter.validate()).valid).toBe(true)
  })

  it('passes paths into validate ctx', async () => {
    const spy = vi.fn(async () => {})
    const create = defineAdapter({
      validate: spy,
    })
    const adapter = create()
    adapter.bind?.({})
    await adapter.validate(['email', 'name'])
    expect(spy).toHaveBeenCalledWith({}, { paths: ['email', 'name'] })
  })
})
