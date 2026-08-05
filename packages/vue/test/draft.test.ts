import { describe, expect, it } from 'vitest'
import { useForm } from '../src/use-form'

describe('useForm draft proxies', () => {
  it('round-trips a draft through the reactive projections', () => {
    const form = useForm({
      defaultValues: { name: '', profile: { city: '' } },
    })

    form.model.name = 'draft-name'
    const snapshot = form.snapshotDraft()
    form.load('create')
    expect(form.dirty).toBe(false)

    const result = form.restoreDraft(snapshot)

    expect(result.status).toBe('restored')
    expect(form.model.name).toBe('draft-name')
    expect(form.dirty).toBe(true)
    expect(form.changedPaths).toEqual(['name'])
  })

  it('clears projected server errors on restore', () => {
    const form = useForm({
      defaultValues: { name: '' },
    })
    form.setErrors({ name: ['already used'] })
    expect(form.errors.name).toEqual(['already used'])

    form.restoreDraft(form.snapshotDraft())

    expect(form.errors).toEqual({})
  })
})
