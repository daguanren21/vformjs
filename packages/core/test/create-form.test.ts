import { describe, expect, it, vi } from 'vitest'
import { createForm } from '../src'

describe('createForm', () => {
  it('initializes model from defaultValues', () => {
    const form = createForm({
      defaultValues: { name: 'a', nested: { x: 1 } },
    })
    expect(form.model.name).toBe('a')
    expect(form.getFieldValue('nested.x')).toBe(1)
  })

  it('setFieldValue / setValues / getValues', () => {
    const form = createForm({
      defaultValues: { name: '', age: 0 },
    })
    form.setFieldValue('name', 'bob')
    form.setValues({ age: 18 })
    expect(form.getValues()).toEqual({ name: 'bob', age: 18 })
  })

  it('reset restores deep baseline and drops extra keys', () => {
    const form = createForm({
      defaultValues: { name: '', tags: ['a'], profile: { email: '' } },
    })
    form.setFieldValue('name', 'x')
    form.setFieldValue('tags', ['a', 'b', 'c'])
    form.setFieldValue('profile.email', 'a@b.com')
    ;(form.model as Record<string, unknown>).extra = true
    form.reset()
    expect(form.getValues()).toEqual({
      name: '',
      tags: ['a'],
      profile: { email: '' },
    })
    expect('extra' in form.model).toBe(false)
  })

  it('rebaseDefaults changes reset baseline', () => {
    const form = createForm({
      defaultValues: { name: '' },
    })
    form.setFieldValue('name', 'saved')
    form.rebaseDefaults()
    form.setFieldValue('name', 'dirty')
    form.reset()
    expect(form.model.name).toBe('saved')
  })

  it('normalizes static rule shortcuts', () => {
    const form = createForm({
      defaultValues: { email: '' },
      rules: {
        email: ['required', 'email'],
      },
    })
    const rules = form.getRules()
    expect(rules.email?.length).toBe(2)
    expect(rules.email?.[0]).toMatchObject({ required: true })
    expect(rules.email?.[1]).toMatchObject({ type: 'email' })
  })

  it('fieldArray append/remove maintains keys', () => {
    const form = createForm({
      defaultValues: {
        domains: [] as Array<{ key?: string, value: string }>,
      },
    })
    const arr = form.fieldArray<{ key?: string, value: string }>('domains', {
      defaultItem: () => ({ value: '' }),
    })
    arr.append({ value: 'a.com' })
    arr.append({ value: 'b.com' })
    expect(form.model.domains).toHaveLength(2)
    expect(arr.fields).toHaveLength(2)
    expect(arr.fields[0]?.key).toBeTruthy()
    arr.remove(0)
    expect(form.model.domains).toEqual([
      expect.objectContaining({ value: 'b.com' }),
    ])
  })

  it('submit returns ok false without throwing by default', async () => {
    const form = createForm({
      defaultValues: { name: '' },
    })
    form.setFieldError('name', 'required')
    const onSubmit = vi.fn()
    const result = await form.submit(onSubmit)
    expect(result.ok).toBe(false)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submit calls handler when valid', async () => {
    const form = createForm({
      defaultValues: { name: 'ok' },
      trimOnSuccess: true,
    })
    form.setFieldValue('name', '  ok  ')
    const onSubmit = vi.fn()
    const result = await form.submit(onSubmit)
    expect(result.ok).toBe(true)
    if (result.ok)
      expect(result.values.name).toBe('ok')
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('adapter validate failure is normalized', async () => {
    const form = createForm({
      defaultValues: { name: '' },
      adapter: {
        validate: async () => ({
          valid: false,
          errors: { name: ['bad'] },
        }),
      },
    })
    const result = await form.validate()
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect(result.errors.name).toEqual(['bad'])
  })
  it('rejects rules when no validation host is bound', async () => {
    const onSubmit = vi.fn()
    const form = createForm({
      defaultValues: { name: '' },
      rules: { name: ['required'] },
      onSubmit,
    })

    const result = await form.submit()
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect(result.errors._form?.[0]).toMatch(/not bound/)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('stores server errors, scrolls to the first field, and clears changed paths', () => {
    const scrollToField = vi.fn()
    const form = createForm({
      defaultValues: { email: '', name: '' },
      adapter: {
        validate: async () => ({ valid: true }),
        scrollToField,
      },
    })
    const incoming = { email: ['already used'], name: ['required'] }

    form.setErrors(incoming)
    incoming.email.push('mutated outside')
    expect(form.getErrors().email).toEqual(['already used'])
    expect(form.scrollToFirstError()).toBe('email')
    expect(scrollToField).toHaveBeenCalledWith('email')

    form.setFieldValue('email', 'next@example.com')
    expect(form.getErrors()).toEqual({ name: ['required'] })
  })

  it('tracks changed paths against rebase and reset baselines', () => {
    const form = createForm({
      defaultValues: {
        profile: { email: '' },
        birthday: new Date('2026-01-01'),
      },
    })

    expect(form.dirty).toBe(false)
    form.setFieldValue('profile.email', 'first@example.com')
    expect(form.dirty).toBe(true)
    expect(form.changedPaths).toEqual(['profile.email'])

    form.rebaseDefaults()
    expect(form.dirty).toBe(false)
    form.setFieldValue('birthday', new Date('2026-02-01'))
    expect(form.changedPaths).toEqual(['birthday'])

    form.reset()
    expect(form.dirty).toBe(false)
    expect(form.changedPaths).toEqual([])
    expect(form.model.birthday).toEqual(new Date('2026-01-01'))
  })

  it('keeps unrelated errors during partial host validation', async () => {
    const form = createForm({
      defaultValues: { email: '', name: '' },
      adapter: {
        validate: async () => ({
          valid: false,
          errors: { email: ['invalid'] },
        }),
      },
    })
    form.setErrors({ name: ['server error'] })

    const result = await form.validateField('email')
    expect(result.ok).toBe(false)
    expect(form.getErrors()).toEqual({
      email: ['invalid'],
      name: ['server error'],
    })
  })


  it('runs linkage on field change', async () => {
    const form = createForm({
      defaultValues: {
        needInvoice: false,
        invoiceTitle: 'keep',
      },
      linkage: [
        {
          deps: ['needInvoice'],
          run: ({ get, setHidden, set, clearValidate }) => {
            const show = Boolean(get('needInvoice'))
            setHidden('invoiceTitle', !show)
            if (!show) {
              set('invoiceTitle', '')
              clearValidate('invoiceTitle')
            }
          },
        },
      ],
    })

    // init linkage runs
    await Promise.resolve()
    await Promise.resolve()
    expect(form.getMeta('invoiceTitle').hidden).toBe(true)
    expect(form.model.invoiceTitle).toBe('')

    form.setFieldValue('needInvoice', true)
    await Promise.resolve()
    await Promise.resolve()
    expect(form.getMeta('invoiceTitle').hidden).toBe(false)
  })

  it('notifyChange triggers linkage for direct model mutation paths', async () => {
    const form = createForm({
      defaultValues: {
        needInvoice: false,
        invoiceTitle: 'x',
      },
      linkage: [
        {
          deps: ['needInvoice'],
          run: ({ get, setHidden }) => {
            setHidden('invoiceTitle', !get('needInvoice'))
          },
        },
      ],
    })
    await Promise.resolve()
    await Promise.resolve()
    expect(form.getMeta('invoiceTitle').hidden).toBe(true)

    form.model.needInvoice = true
    form.notifyChange('needInvoice')
    await Promise.resolve()
    await Promise.resolve()
    expect(form.getMeta('invoiceTitle').hidden).toBe(false)
  })

  it('when + whenRules declarative API toggles visibility and rules', async () => {
    const form = createForm({
      defaultValues: {
        needInvoice: false,
        invoiceTitle: '',
        payType: 'bank' as 'bank' | 'email',
        account: '',
      },
      when: {
        invoiceTitle: m => m.needInvoice,
      },
      whenRules: {
        account: m => (m.payType === 'bank' ? ['required', 'stringMin:8'] : ['required', 'email']),
        invoiceTitle: m => (m.needInvoice ? ['required'] : null),
      },
    })
    await Promise.resolve()
    await Promise.resolve()
    expect(form.getMeta('invoiceTitle').hidden).toBe(true)

    form.model.needInvoice = true
    form.notifyChange('needInvoice')
    await Promise.resolve()
    await Promise.resolve()
    expect(form.getMeta('invoiceTitle').hidden).toBe(false)
    expect(form.getRules().invoiceTitle?.[0]).toMatchObject({ required: true })

    form.model.payType = 'email'
    form.notifyChange('payType')
    await Promise.resolve()
    await Promise.resolve()
    expect(form.getRules().account?.some(r => r.type === 'email')).toBe(true)
  })

  it('when without whenRules restores base rules when field becomes visible', async () => {
    const form = createForm({
      defaultValues: {
        needInvoice: false,
        invoiceTitle: '',
      },
      rules: {
        invoiceTitle: ['required'],
      },
      when: {
        invoiceTitle: m => m.needInvoice,
      },
    })
    await Promise.resolve()
    await Promise.resolve()
    expect(form.getMeta('invoiceTitle').hidden).toBe(true)
    expect(form.getRules().invoiceTitle).toBeUndefined()

    form.model.needInvoice = true
    form.notifyChange('needInvoice')
    await Promise.resolve()
    await Promise.resolve()
    expect(form.getMeta('invoiceTitle').hidden).toBe(false)
    expect(form.getRules().invoiceTitle?.[0]).toMatchObject({ required: true })
  })
})
