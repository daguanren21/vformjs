import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { z } from 'zod'
import { useElForm } from '../src/use-el-form'
import { useZodForm } from '../src/use-zod-form'

type HasKey<T, TKey extends PropertyKey> = TKey extends keyof T ? true : false

describe('single application form surface', () => {
  it('keeps lifecycle and direct operations on one flat object', async () => {
    const form = useElForm({
      defaults: { name: '' },
      onSubmit: (values) => {
        expectTypeOf(values).toEqualTypeOf<{ name: string }>()
      },
    })

    expectTypeOf<HasKey<typeof form, 'submit'>>().toEqualTypeOf<true>()
    expectTypeOf<HasKey<typeof form, 'load'>>().toEqualTypeOf<true>()
    expectTypeOf<HasKey<typeof form, 'get'>>().toEqualTypeOf<true>()
    expectTypeOf<HasKey<typeof form, 'set'>>().toEqualTypeOf<true>()
    expectTypeOf<HasKey<typeof form, 'list'>>().toEqualTypeOf<true>()
    expectTypeOf<HasKey<typeof form, 'validate'>>().toEqualTypeOf<true>()
    expectTypeOf<HasKey<typeof form, 'values'>>().toEqualTypeOf<false>()
    expectTypeOf<HasKey<typeof form, 'fields'>>().toEqualTypeOf<false>()
    expectTypeOf<HasKey<typeof form, 'validation'>>().toEqualTypeOf<false>()
    expectTypeOf<HasKey<typeof form, 'draft'>>().toEqualTypeOf<false>()
    expectTypeOf<HasKey<typeof form, 'raw'>>().toEqualTypeOf<false>()
    expect('values' in form).toBe(false)
    expect('fields' in form).toBe(false)
    expect('validation' in form).toBe(false)
    expect('draft' in form).toBe(false)
    expect('raw' in form).toBe(false)
    expect('getValues' in form).toBe(false)

    form.set('name', 'Ada')
    expectTypeOf(form.get('name')).toEqualTypeOf<string>()
    expect(form.get('name')).toBe('Ada')
    expect(form.get()).toEqual({ name: 'Ada' })
    form.set({ name: 'Grace' })
    expect(form.model.name).toBe('Grace')

    const assertInvalidTypes = () => {
      // @ts-expect-error Literal field paths are checked against defaults.
      form.get('missing')
      // @ts-expect-error Field values are inferred from their path.
      form.set('name', 42)
    }
    void assertInvalidTypes

    form.host.ref({})
    await expect(form.submit()).resolves.toEqual({
      ok: true,
      values: { name: 'Grace' },
    })
  })

  it('includes create, edit, and detail lifecycle state', () => {
    const form = useElForm({
      defaults: { id: undefined as string | undefined, name: '' },
    })

    form.load('edit', { id: '1', name: 'Ada' })

    expect(form.mode).toBe('edit')
    expect(form.dirty).toBe(false)
  })

  it('flattens conditions, conditional rules, and field arrays', () => {
    const form = useElForm({
      defaults: {
        showRows: true,
        rows: [{ name: '' }] as Array<{ name: string }>,
      },
      when: {
        rows: values => values.showRows,
      },
      rules: {
        showRows: { required: true },
        'rows.*.name': ({ values, index }) => {
          expectTypeOf(values).toEqualTypeOf<Readonly<{
            showRows: boolean
            rows: Array<{ name: string }>
          }>>()
          return values.showRows && index === 0
            ? { required: true }
            : null
        },
      },
    })

    form.list<{ name: string }>('rows').append({ name: 'Ada' })

    expect(form.model.rows).toEqual([{ name: '' }, { name: 'Ada' }])
    expect(form.hidden('rows').value).toBe(false)
    expect(form.host.rules.showRows).toHaveLength(1)
    expect(form.host.rules['rows.0.name']).toHaveLength(1)

    const legacyOptions = {
      defaults: { showRows: true, rows: [] as Array<{ name: string }> },
      // @ts-expect-error The `fields` options namespace was removed.
      fields: {},
    } satisfies Parameters<typeof useElForm>[0]
    void legacyOptions
  })

  it('maps flat submission options without a nested policy object', async () => {
    let release!: () => void
    const pending = new Promise<void>((resolve) => {
      release = resolve
    })
    let runs = 0
    const form = useElForm({
      defaults: { name: 'Ada' },
      submitPolicy: 'parallel',
      throwOnInvalid: false,
      onSubmit: async () => {
        runs += 1
        await pending
      },
    })
    form.host.ref({})

    const first = form.submit()
    const second = form.submit()
    await vi.waitFor(() => {
      expect(runs).toBe(2)
    })
    expect(first).not.toBe(second)
    release()
    await Promise.all([first, second])

    const legacyOptions = {
      defaults: { name: '' },
      // @ts-expect-error The `submission` options namespace was removed.
      submission: { policy: 'join' },
    } satisfies Parameters<typeof useElForm>[0]
    void legacyOptions
  })

  it('returns stable live option state without ComputedRef.value', async () => {
    let resolveOptions!: (items: string[]) => void
    const pending = new Promise<string[]>((resolve) => {
      resolveOptions = resolve
    })
    const form = useElForm({
      defaults: { country: 'CN', city: '' },
      options: {
        city: {
          deps: ['country'],
          load: () => pending,
        },
      },
    })
    const city = form.options('city')

    expectTypeOf<HasKey<typeof city, 'value'>>().toEqualTypeOf<false>()
    expect(city).toBe(form.options('city'))
    expect(city.loading).toBe(true)

    resolveOptions(['Shanghai'])
    await Promise.resolve()
    await Promise.resolve()

    expect(city.loaded).toBe(true)
    expect(city.loading).toBe(false)
    expect(city.items).toEqual(['Shanghai'])
  })

  it('uses the same flat facade for Zod forms', () => {
    const form = useZodForm({
      schema: z.object({ name: z.string() }),
      defaults: { name: '' },
    })

    expectTypeOf<HasKey<typeof form, 'load'>>().toEqualTypeOf<true>()
    expectTypeOf<HasKey<typeof form, 'list'>>().toEqualTypeOf<true>()
    expectTypeOf<HasKey<typeof form, 'validate'>>().toEqualTypeOf<true>()
    expectTypeOf<HasKey<typeof form, 'fields'>>().toEqualTypeOf<false>()
    expectTypeOf<HasKey<typeof form, 'raw'>>().toEqualTypeOf<false>()
  })
})
