import { describe, expect, it } from 'vitest'
import { useForm } from '../src/use-form'
import { useFormGroup } from '../src/use-form-group'

const settle = async () => {
  for (let turn = 0; turn < 20; turn++)
    await Promise.resolve()
}

describe('useFormGroup mode + load', () => {
  const build = () => {
    const base = useForm({ defaultValues: { name: '', code: '' } })
    const fees = useForm({ defaultValues: { amount: 0 } })
    return { base, fees, group: useFormGroup({ base, fees }) }
  }

  it('starts in create mode', () => {
    expect(build().group.mode).toBe('create')
  })

  it('switches every member together and hands each its slice', async () => {
    const { base, fees, group } = build()

    group.load('edit', { base: { name: 'Ada', code: 'A1' }, fees: { amount: 42 } })
    await settle()

    expect(group.mode).toBe('edit')
    expect(base.mode).toBe('edit')
    expect(fees.mode).toBe('edit')
    expect(base.model).toEqual({ name: 'Ada', code: 'A1' })
    expect(fees.model).toEqual({ amount: 42 })
  })

  it('treats the loaded record as the clean baseline', async () => {
    const { group, base } = build()

    group.load('edit', { base: { name: 'Ada', code: 'A1' }, fees: { amount: 42 } })
    await settle()
    expect(group.dirty).toBe(false)

    base.model.name = 'Grace'
    await settle()
    expect(group.dirty).toBe(true)
    expect(group.changedPaths).toEqual(['base.name'])
  })

  it('omitted sections fall back to factory defaults, never the previous record', async () => {
    const { group, fees } = build()

    group.load('edit', { base: { name: 'Ada', code: 'A1' }, fees: { amount: 42 } })
    await settle()
    group.load('edit', { base: { name: 'Grace', code: 'B2' } })
    await settle()

    expect(fees.model).toEqual({ amount: 0 })
  })

  it('load("create") clears every section', async () => {
    const { group, base, fees } = build()

    group.load('edit', { base: { name: 'Ada', code: 'A1' }, fees: { amount: 42 } })
    await settle()
    group.load('create')
    await settle()

    expect(group.mode).toBe('create')
    expect(base.model).toEqual({ name: '', code: '' })
    expect(fees.model).toEqual({ amount: 0 })
    expect(group.dirty).toBe(false)
  })

  it('detail mode drops host rules on every member', async () => {
    const base = useForm({
      defaultValues: { name: '' },
      rules: { name: [{ required: true, message: 'required' }] },
    })
    const group = useFormGroup({ base })

    group.load('detail', { base: { name: 'Ada' } })
    await settle()

    expect(group.mode).toBe('detail')
    expect(base.readonly).toBe(true)
    expect(base.host.rules).toEqual({})
  })

  it('skips members that expose no load', () => {
    const base = useForm({ defaultValues: { name: '' } })
    const custom = {
      model: { note: '' },
      errors: {},
      dirty: false,
      changedPaths: [] as ReadonlyArray<string>,
      submitting: false,
      getValues: () => ({ note: '' }),
      setErrors: () => {},
      reset: () => {},
      scrollToFirstError: () => undefined,
      validate: async () => ({ ok: true as const, values: { note: '' } }),
    }
    const group = useFormGroup({ base, custom })

    expect(() => group.load('edit', { base: { name: 'Ada' } })).not.toThrow()
    expect(base.mode).toBe('edit')
  })
})
