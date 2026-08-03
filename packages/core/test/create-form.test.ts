import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import {
  createFieldPath,
  createForm,
  submitFail,
  type FormResult,
  type SubmitResult,
} from '../src'

describe('createForm', () => {
  it('initializes model from defaultValues', () => {
    const form = createForm({
      defaultValues: { name: 'a', nested: { x: 1 } },
    })
    expect(form.model.name).toBe('a')
    expect(form.getFieldValue('nested.x')).toBe(1)
  })

  it('accepts interface models without an index signature', () => {
    interface ProfileForm {
      name: string
      profile: {
        email: string
      }
    }

    const path = createFieldPath<ProfileForm>()
    const form = createForm<ProfileForm>({
      defaultValues: {
        name: 'Ada',
        profile: { email: 'ada@example.com' },
      },
    })

    expectTypeOf(form.model).toEqualTypeOf<ProfileForm>()
    expect(path('profile.email')).toBe('profile.email')
    expect(form.getFieldValue(path('profile.email'))).toBe('ada@example.com')
  })

  it('uses an external model without changing its identity', () => {
    const model = { name: '' }
    const form = createForm({
      defaultValues: { name: '' },
      model,
    })

    expect(form.model).toBe(model)
    form.setFieldValue('name', 'Ada')
    expect(model.name).toBe('Ada')
    expect(form.dirty).toBe(true)

    form.reset()
    expect(form.model).toBe(model)
    expect(model.name).toBe('')
    expect(form.dirty).toBe(false)
  })

  it('tracks an external model that differs from its baseline initially', () => {
    const form = createForm({
      defaultValues: { name: '' },
      model: { name: 'loaded' },
    })

    expect(form.dirty).toBe(true)
    expect(form.changedPaths).toEqual(['name'])
  })

  it('rejects ambiguous external model state factories', () => {
    expect(() => createForm({
      defaultValues: { name: '' },
      model: { name: '' },
      createState: values => values,
    })).toThrow(/mutually exclusive/)
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

  it('materializes wildcard rules for dynamic array rows', () => {
    const form = createForm({
      defaultValues: {
        members: [
          { name: 'Ada' },
          { name: 'Lin' },
        ],
      },
      rules: {
        'members.*.name': ['required'],
        'members.1.name': ['email'],
      },
    })
    const members = form.fieldArray<{ name: string }>('members', {
      defaultItem: () => ({ name: '' }),
    })

    expect(Object.keys(form.getRules())).toEqual([
      'members.0.name',
      'members.1.name',
    ])
    expect(form.getRules()['members.0.name']?.[0]).toMatchObject({
      required: true,
    })
    expect(form.getRules()['members.1.name']?.[0]).toMatchObject({
      type: 'email',
    })

    members.append({ name: 'Grace' })
    expect(Object.keys(form.getRules())).toEqual([
      'members.0.name',
      'members.1.name',
      'members.2.name',
    ])
    members.remove(2)
    expect(form.getRules()['members.2.name']).toBeUndefined()
  })

  it('evaluates wildcard conditional rules with row context', async () => {
    const contexts: Array<{ path: string, index: number | undefined }> = []
    const form = createForm({
      defaultValues: {
        members: [
          { required: false, name: '' },
          { required: true, name: '' },
        ],
      },
      rules: {
        'members.*.name': ['required'],
      },
      whenRules: {
        'members.*.name': (_values, context) => {
          contexts.push({ path: context.path, index: context.index })
          const item = context.item as { required: boolean }
          return item.required ? ['required'] : null
        },
      },
    })

    await Promise.resolve()
    await Promise.resolve()
    expect(form.getRules()['members.0.name']).toBeUndefined()
    expect(form.getRules()['members.1.name']?.[0]).toMatchObject({
      required: true,
    })
    expect(contexts).toContainEqual({
      path: 'members.1.name',
      index: 1,
    })

    form.setFieldValue('members.0.required', true)
    await Promise.resolve()
    await Promise.resolve()
    expect(form.getRules()['members.0.name']?.[0]).toMatchObject({
      required: true,
    })
  })

  it('tracks opaque values and supports custom value semantics', () => {
    const upload = new Blob(['first'])
    const opaqueForm = createForm({
      defaultValues: { upload },
    })

    expect(opaqueForm.dirty).toBe(false)
    opaqueForm.setFieldValue('upload', new Blob(['second']))
    expect(opaqueForm.changedPaths).toEqual(['upload'])
    opaqueForm.reset()
    expect(opaqueForm.model.upload).toBe(upload)

    const valuePolicy = {
      isAtomic: (value: unknown) =>
        value instanceof URL ? true : undefined,
      clone: (value: unknown) =>
        value instanceof URL ? new URL(value.href) : value,
      equal: (previous: unknown, next: unknown) =>
        previous instanceof URL && next instanceof URL
          ? previous.href === next.href
          : undefined,
    }
    const urlForm = createForm({
      defaultValues: { endpoint: new URL('https://example.com') },
      valuePolicy,
    })

    expect(urlForm.dirty).toBe(false)
    urlForm.setFieldValue('endpoint', new URL('https://example.com'))
    expect(urlForm.dirty).toBe(false)
    urlForm.setFieldValue('endpoint', new URL('https://changed.example.com'))
    expect(urlForm.changedPaths).toEqual(['endpoint'])
  })

  it('keeps field-array keys stable without leaking them into values', () => {
    const form = createForm({
      defaultValues: {
        domains: [] as Array<{ value: string }>,
      },
    })
    const arr = form.fieldArray<{ value: string }>('domains', {
      defaultItem: () => ({ value: '' }),
    })
    arr.append({ value: 'a.com' })
    arr.append({ value: 'b.com' })

    const [first, second] = arr.fields
    expect(first?.key).toBeTruthy()
    expect(second?.key).toBeTruthy()
    expect(form.getValues().domains).toEqual([
      { value: 'a.com' },
      { value: 'b.com' },
    ])

    arr.move(0, 1)
    expect(arr.fields.map(field => field.key)).toEqual([
      second?.key,
      first?.key,
    ])
    arr.update(1, { value: 'updated.com' })
    expect(arr.fields[1]?.key).toBe(first?.key)
    expect(form.getValues().domains).toEqual([
      { value: 'b.com' },
      { value: 'updated.com' },
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

  it('runs one resolver pipeline before host projection and submits transformed output', async () => {
    type Input = { count: string }
    type Output = { count: number }
    const order: string[] = []
    const form = createForm<Input, never, Output>({
      defaultValues: { count: '2' },
      resolver: async (values) => {
        order.push('resolver')
        return { ok: true, values: { count: Number(values.count) } }
      },
      adapter: {
        validate: async () => {
          order.push('host')
          return { valid: true }
        },
      },
      onSubmit: async (values) => {
        expectTypeOf(values).toEqualTypeOf<Output>()
        order.push('submit')
      },
    })

    const result = await form.submit()

    expectTypeOf(result).toEqualTypeOf<
      SubmitResult<Output, never, Input>
    >()
    expect(result).toEqual({ ok: true, values: { count: 2 } })
    expect(order).toEqual(['resolver', 'host', 'submit'])
  })

  it('joins concurrent submissions by default', async () => {
    const firstHandler = vi.fn(async () => {
      await Promise.resolve()
    })
    const ignoredHandler = vi.fn()
    const form = createForm({
      defaultValues: { name: 'Ada' },
    })

    const first = form.submit(firstHandler)
    const second = form.submit(ignoredHandler)

    expect(second).toBe(first)
    expect(form.submitting).toBe(true)
    await expect(first).resolves.toEqual({
      ok: true,
      values: { name: 'Ada' },
    })
    expect(firstHandler).toHaveBeenCalledTimes(1)
    expect(ignoredHandler).not.toHaveBeenCalled()
    expect(form.submitting).toBe(false)
  })

  it('supports explicit parallel submissions with stable lifecycle events', async () => {
    const handler = vi.fn(async () => {
      await Promise.resolve()
    })
    const form = createForm({
      defaultValues: { name: 'Ada' },
      submitPolicy: 'parallel',
    })
    const events: string[] = []
    form.subscribe((event) => {
      if (event.type === 'submit-start' || event.type === 'submit-end')
        events.push(event.type)
    })

    const first = form.submit(handler)
    const second = form.submit(handler)

    expect(second).not.toBe(first)
    expect(form.submitting).toBe(true)
    await Promise.all([first, second])
    expect(handler).toHaveBeenCalledTimes(2)
    expect(events).toEqual(['submit-start', 'submit-end'])
    expect(form.submitting).toBe(false)
  })

  it('returns typed API submit failures and stores their field errors', async () => {
    type EmailTaken = {
      kind: 'EmailTaken'
      status: 409
    }
    const apiError: EmailTaken = {
      kind: 'EmailTaken',
      status: 409,
    }
    const form = createForm({
      defaultValues: { email: 'taken@example.com' },
      onSubmit: async () =>
        submitFail(apiError, {
          errors: { email: ['Email already registered'] },
        }),
    })

    const result = await form.submit()

    expectTypeOf(result).toEqualTypeOf<
      SubmitResult<{ email: string }, EmailTaken>
    >()
    expect(result).toEqual({
      ok: false,
      values: { email: 'taken@example.com' },
      submitError: apiError,
      errors: { email: ['Email already registered'] },
    })
    expect(form.getErrors()).toEqual({
      email: ['Email already registered'],
    })
    expect(form.submitting).toBe(false)
  })

  it('infers one-off submit errors without widening the default result', async () => {
    type Conflict = { kind: 'Conflict' }
    const form = createForm({
      defaultValues: { name: 'Ada' },
    })

    const defaultResult = await form.submit()
    expectTypeOf(defaultResult).toEqualTypeOf<
      FormResult<{ name: string }>
    >()

    const result = await form.submit(async () =>
      submitFail<Conflict>({ kind: 'Conflict' }),
    )
    expectTypeOf(result).toEqualTypeOf<
      SubmitResult<{ name: string }, Conflict>
    >()
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

  it('keeps only the latest async validation result', async () => {
    type Model = { code: string }
    const contexts: Array<{ signal: AbortSignal, validationId: number }> = []
    const onInvalid = vi.fn()
    const form = createForm<Model>({
      defaultValues: { code: 'old' },
      resolver: async (values, context) => {
        contexts.push(context)
        await Promise.resolve()
        return values.code === 'old'
          ? {
              ok: false,
              values,
              errors: { code: ['stale'] },
            }
          : { ok: true, values }
      },
    })

    const validation = form.validate()
    expect(contexts[0]?.validationId).toBe(1)

    form.setFieldValue('code', 'new')
    expect(contexts[0]?.signal.aborted).toBe(true)
    const result = await validation

    expect(contexts[1]?.validationId).toBe(2)
    expect(result).toEqual({
      ok: true,
      values: { code: 'new' },
    })
    expect(form.getErrors()).toEqual({})
    expect(onInvalid).not.toHaveBeenCalled()
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

  it('scrolls to submit errors by default and supports opting out', async () => {
    const scrollToField = vi.fn()
    const form = createForm({
      defaultValues: { email: '' },
      adapter: {
        validate: async () => ({
          valid: false,
          errors: { email: ['invalid'] },
        }),
        scrollToField,
      },
    })

    const result = await form.submit()
    expect(result.ok).toBe(false)
    expect(scrollToField).toHaveBeenCalledWith('email')

    const disabledScroll = vi.fn()
    const quietForm = createForm({
      defaultValues: { email: '' },
      scrollToError: false,
      adapter: {
        validate: async () => ({
          valid: false,
          errors: { email: ['invalid'] },
        }),
        scrollToField: disabledScroll,
      },
    })
    await quietForm.submit()
    expect(disabledScroll).not.toHaveBeenCalled()
  })

  it('scrolls to field errors returned by the submit handler', async () => {
    const scrollToField = vi.fn()
    const form = createForm({
      defaultValues: { email: 'used@example.com' },
      adapter: {
        validate: async () => ({ valid: true }),
        scrollToField,
      },
      onSubmit: async () => submitFail('conflict', {
        errors: { email: ['already used'] },
      }),
    })

    const result = await form.submit()
    expect(result.ok).toBe(false)
    expect(scrollToField).toHaveBeenCalledWith('email')
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

  it('updates dirty state without reading unrelated model branches', () => {
    let unrelatedReads = 0
    const form = createForm({
      defaultValues: { active: '', unrelated: '' },
      createState: initial => new Proxy(initial, {
        get(target, key, receiver) {
          if (key === 'unrelated')
            unrelatedReads += 1
          return Reflect.get(target, key, receiver)
        },
      }),
    })

    unrelatedReads = 0
    form.setFieldValue('active', 'changed')
    expect(unrelatedReads).toBe(0)
    expect(form.changedPaths).toEqual(['active'])

    form.setFieldValue('active', '')
    expect(form.dirty).toBe(false)
    expect(form.changedPaths).toEqual([])
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
