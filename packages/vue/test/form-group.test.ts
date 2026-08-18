import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { useApplicationForm, useForm } from '../src/use-form'
import { useFormGroup } from '../src/use-form-group'

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe('useFormGroup', () => {
  it('aggregates reactive state, validation errors, and scrolling', async () => {
    const scrollToField = vi.fn()
    const base = useForm({
      defaultValues: { name: '' },
    })
    const details = useForm({
      defaultValues: { email: '' },
      adapter: {
        validate: async () => ({
          valid: false,
          errors: { email: ['invalid email'] },
        }),
        scrollToField,
      },
    })
    const group = useFormGroup({ base, details })

    base.model.name = 'Ada'
    await Promise.resolve()
    expect(group.dirty).toBe(true)
    expect(group.changedPaths).toEqual(['base.name'])
    expect(group.model.base).toBe(base.model)
    expect(group.model.details).toBe(details.model)

    const validation = group.validate()
    expect(group.validating).toBe(true)
    const result = await validation
    expect(group.validating).toBe(false)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toEqual({
        details: { email: ['invalid email'] },
      })
      expectTypeOf(result.values.base).toEqualTypeOf<{ name: string }>()
    }
    expect(group.errors).toEqual({
      details: { email: ['invalid email'] },
    })
    expect(scrollToField).toHaveBeenCalledWith('email')
    expect(group.scrollToFirstError()).toBe('details.email')
  })

  it('submits transformed member outputs and projects grouped API errors', async () => {
    const amount = useForm<{ amount: string }, never, { amount: number }>({
      defaultValues: { amount: '2' },
      resolver: async values => ({
        ok: true,
        values: { amount: Number(values.amount) },
      }),
    })
    const notes = useForm({
      defaultValues: { note: '' },
    })
    const group = useFormGroup({ amount, notes })
    expect(group.submitCount).toBe(0)
    expect(group.submitOk).toBe(false)

    const submission = group.submit(async (values) => {
      expectTypeOf(values.amount).toEqualTypeOf<{ amount: number }>()
      expect(values).toEqual({
        amount: { amount: 2 },
        notes: { note: '' },
      })
      return {
        ok: false as const,
        error: { kind: 'Conflict' as const },
        errors: {
          notes: { note: ['rejected'] },
        },
      }
    })

    expect(group.submitting).toBe(true)
    expect(group.submitCount).toBe(1)
    expect(group.submitOk).toBe(false)
    const result = await submission
    expect(result).toEqual({
      ok: false,
      values: {
        amount: { amount: 2 },
        notes: { note: '' },
      },
      submitError: { kind: 'Conflict' },
      errors: {
        notes: { note: ['rejected'] },
      },
    })
    expect(group.submitting).toBe(false)
    expect(group.submitCount).toBe(1)
    expect(group.submitOk).toBe(false)
    expect(notes.errors).toEqual({ note: ['rejected'] })
  })

  it('composes official flat application forms', async () => {
    const base = useApplicationForm({
      defaultValues: { name: 'Ada' },
    })
    const details = useApplicationForm({
      defaultValues: { email: 'ada@example.com' },
    })
    const group = useFormGroup({ base, details })

    group.setErrors({ details: { email: ['already used'] } })
    expect(details.errors).toEqual({ email: ['already used'] })
    group.setErrors({})

    const result = await group.submit(async (values) => {
      expectTypeOf(values.base).toEqualTypeOf<{ name: string }>()
      expect(values).toEqual({
        base: { name: 'Ada' },
        details: { email: 'ada@example.com' },
      })
    })

    expect(result.ok).toBe(true)
    expect(group.submitCount).toBe(1)
    expect(group.submitOk).toBe(true)
  })

  it('joins duplicate group submissions by default', async () => {
    const member = useForm({ defaultValues: { name: 'Ada' } })
    const group = useFormGroup({ member })
    const firstHandler = vi.fn(async () => {
      await Promise.resolve()
    })
    const ignoredHandler = vi.fn()

    const first = group.submit(firstHandler)
    const second = group.submit(ignoredHandler)

    expect(second).toBe(first)
    expect(group.submitting).toBe(true)
    expect(group.submitCount).toBe(1)
    expect(group.submitOk).toBe(false)
    await first
    expect(firstHandler).toHaveBeenCalledTimes(1)
    expect(ignoredHandler).not.toHaveBeenCalled()
    expect(group.submitting).toBe(false)
    expect(group.submitCount).toBe(1)
    expect(group.submitOk).toBe(true)
    group.reset()
    expect(group.submitCount).toBe(0)
    expect(group.submitOk).toBe(false)
  })

  it('detaches a pending group submit when another record loads', async () => {
    const gateA = deferred()
    const gateB = deferred()
    const firstHandler = vi.fn(async () => gateA.promise)
    const secondHandler = vi.fn(async () => gateB.promise)
    const ignoredHandler = vi.fn()
    const member = useForm({ defaultValues: { name: '' } })
    const group = useFormGroup({ member })

    const first = group.submit(firstHandler)
    group.load('edit', { member: { name: 'Ada' } })
    const second = group.submit(secondHandler)
    expect(second).not.toBe(first)

    gateA.resolve()
    await first
    const joinedSecond = group.submit(ignoredHandler)
    expect(joinedSecond).toBe(second)
    expect(ignoredHandler).not.toHaveBeenCalled()

    gateB.resolve()
    await second
    expect(firstHandler).toHaveBeenCalledOnce()
    expect(secondHandler).toHaveBeenCalledOnce()
  })

  it('resets every member to its own baseline', async () => {
    const base = useForm({ defaultValues: { name: '' } })
    const details = useForm({ defaultValues: { count: 0 } })
    const group = useFormGroup({ base, details })

    base.model.name = 'Ada'
    details.model.count = 2
    await Promise.resolve()
    expect(group.dirty).toBe(true)

    group.reset()
    expect(group.submitCount).toBe(0)
    expect(group.submitOk).toBe(false)
    expect(base.model.name).toBe('')
    expect(details.model.count).toBe(0)
    expect(group.dirty).toBe(false)
  })
})
