import { describe, expect, it, vi } from 'vitest'
import { createForm, DRAFT_SNAPSHOT_VERSION } from '../src'

describe('draft snapshots', () => {
  it('captures a versioned, JSON-serializable snapshot of current values', () => {
    const form = createForm({
      defaultValues: { name: 'a', profile: { city: '' } },
    })
    form.setFieldValue('name', 'b')
    form.setFieldValue('profile.city', 'hz')

    const snapshot = form.snapshotDraft()

    expect(snapshot.version).toBe(DRAFT_SNAPSHOT_VERSION)
    expect(typeof snapshot.savedAt).toBe('string')
    expect(snapshot.values).toEqual({ name: 'b', profile: { city: 'hz' } })
    // JSON round-trip is the transport contract (localStorage / API).
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot)
  })

  it('snapshot is isolated from later form mutations', () => {
    const form = createForm({
      defaultValues: { name: 'a', profile: { city: '' } },
    })
    const snapshot = form.snapshotDraft()
    form.setFieldValue('profile.city', 'hz')

    expect(snapshot.values).toEqual({ name: 'a', profile: { city: '' } })
  })

  it('restores a matching draft and marks the form dirty against the baseline', () => {
    const form = createForm({
      defaultValues: { name: 'a', profile: { city: '' } },
    })
    form.setFieldValue('name', 'draft-name')
    const snapshot = form.snapshotDraft()
    form.reset()
    expect(form.dirty).toBe(false)

    const result = form.restoreDraft(snapshot)

    expect(result).toEqual({ status: 'restored', droppedPaths: [], filledPaths: [] })
    expect(form.model).toEqual({ name: 'draft-name', profile: { city: '' } })
    expect(form.dirty).toBe(true)
    expect(form.changedPaths).toEqual(['name'])
  })

  it('drops draft paths missing from the baseline and reports them', () => {
    const form = createForm({
      defaultValues: { name: 'a', profile: { city: '' } },
    })

    const result = form.restoreDraft({
      version: DRAFT_SNAPSHOT_VERSION,
      savedAt: new Date().toISOString(),
      values: { name: 'b', profile: { city: 'hz', zip: '310000' }, legacy: true },
    })

    expect(result.status).toBe('healed')
    expect(result.droppedPaths).toEqual(['profile.zip', 'legacy'])
    expect(result.filledPaths).toEqual([])
    expect(form.model).toEqual({ name: 'b', profile: { city: 'hz' } })
    expect((form.model.profile as Record<string, unknown>).zip).toBeUndefined()
  })

  it('fills missing draft paths from the baseline, reporting the subtree root', () => {
    const form = createForm({
      defaultValues: { name: 'a', profile: { city: 'sh', zip: '200000' } },
    })

    const result = form.restoreDraft({
      version: DRAFT_SNAPSHOT_VERSION,
      savedAt: new Date().toISOString(),
      values: { name: 'b' },
    })

    expect(result.status).toBe('healed')
    expect(result.filledPaths).toEqual(['profile'])
    expect(form.model).toEqual({ name: 'b', profile: { city: 'sh', zip: '200000' } })
  })

  it('heals structural mismatches (array vs object) back to baseline values', () => {
    const form = createForm({
      defaultValues: { name: 'a', tags: ['x'] },
    })

    const result = form.restoreDraft({
      version: DRAFT_SNAPSHOT_VERSION,
      savedAt: new Date().toISOString(),
      values: { name: 'b', tags: { 0: 'x' } },
    })

    expect(result.status).toBe('healed')
    expect(result.filledPaths).toEqual(['tags'])
    expect(form.model.tags).toEqual(['x'])
  })

  it('rejects garbage without touching current values', () => {
    const form = createForm({
      defaultValues: { name: 'current' },
    })

    expect(form.restoreDraft(null)).toMatchObject({ status: 'fresh', reason: 'empty' })
    expect(form.restoreDraft(undefined)).toMatchObject({ status: 'fresh', reason: 'empty' })
    expect(form.restoreDraft('junk')).toMatchObject({ status: 'fresh', reason: 'malformed' })
    expect(form.restoreDraft({ version: 99, values: {} }))
      .toMatchObject({ status: 'fresh', reason: 'unsupported-version' })
    expect(form.restoreDraft({ version: DRAFT_SNAPSHOT_VERSION, values: 'junk' }))
      .toMatchObject({ status: 'fresh', reason: 'malformed' })

    expect(form.model.name).toBe('current')
    expect(form.dirty).toBe(false)
  })

  it('clears server errors on restore', () => {
    const form = createForm({
      defaultValues: { name: 'a' },
    })
    form.setErrors({ name: ['already used'] })

    form.restoreDraft(form.snapshotDraft())

    expect(form.getErrors()).toEqual({})
  })

  it('does not rebase the reset baseline — reset() still returns to defaults', () => {
    const form = createForm({
      defaultValues: { name: 'a' },
    })
    form.setFieldValue('name', 'draft')
    const snapshot = form.snapshotDraft()
    form.reset()
    form.restoreDraft(snapshot)
    expect(form.model.name).toBe('draft')

    form.reset()
    expect(form.model.name).toBe('a')
    expect(form.dirty).toBe(false)
  })

  it('restores against the edit baseline shape after load(edit)', () => {
    interface Detail {
      name: string
      extra?: string
    }
    const form = createForm<Detail>({
      defaultValues: { name: '' },
    })
    form.rebaseDefaults({ name: 'loaded', extra: 'server' })

    const result = form.restoreDraft({
      version: DRAFT_SNAPSHOT_VERSION,
      savedAt: new Date().toISOString(),
      values: { name: 'draft', unknown: 1 },
    })

    expect(result.status).toBe('healed')
    expect(result.droppedPaths).toEqual(['unknown'])
    expect(result.filledPaths).toEqual(['extra'])
    expect(form.model).toEqual({ name: 'draft', extra: 'server' })
  })

  it('emits a reset event so hosts clear validation state', () => {
    const form = createForm({
      defaultValues: { name: 'a' },
    })
    const listener = vi.fn()
    form.subscribe(listener)

    form.restoreDraft(form.snapshotDraft())

    expect(listener.mock.calls.map(([event]) => event.type)).toContain('reset')
  })
})
