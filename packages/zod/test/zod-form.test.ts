import { submitFail } from '@vformjs/core'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { z } from 'zod'
import {
  arrayLengthSignature,
  collectZodFieldPaths,
  createSharedZodParser,
  zodIssuesToFormErrors,
  zodToRules,
} from '../src/to-rules'
import { useZodForm } from '../src/use-zod-form'

function runValidator(
  rule: { validator?: (...args: any[]) => any },
  value: unknown,
): Promise<Error | undefined> {
  return new Promise((resolve) => {
    let settled = false
    const done = (err?: Error) => {
      if (settled)
        return
      settled = true
      resolve(err)
    }
    try {
      const ret = rule.validator?.({}, value, (err?: Error) => done(err))
      if (ret && typeof ret.then === 'function') {
        ret.then(() => done()).catch((err: unknown) => {
          done(err instanceof Error ? err : new Error(String(err)))
        })
      }
    }
    catch (err) {
      done(err instanceof Error ? err : new Error(String(err)))
    }
  })
}

const unboundAdapter = {
  validate: async () => ({
    valid: false as const,
    unbound: true,
    errors: { _form: ['Form host is not bound. Bind it with v-bind="form.host".'] },
  }),
}

describe('zodToRules full-schema field validators', () => {
  it('maps fields and validates with live values', async () => {
    const values = { email: '', name: 'ab', age: 10 }
    const schema = z.object({
      email: z.email('邮箱不正确'),
      name: z.string().min(2, '至少2字'),
      age: z.number().min(1).max(120).optional(),
    })
    const rules = zodToRules(schema, { getValues: () => values })
    expect(Object.keys(rules).sort()).toEqual(['age', 'email', 'name'])

    const emailErr = await runValidator(rules.email![0]!, 'bad')
    expect(emailErr?.message).toContain('邮箱')

    const emailOk = await runValidator(rules.email![0]!, 'a@b.com')
    expect(emailOk).toBeUndefined()
  })

  it('surfaces refine errors on the refined path', async () => {
    const values = { username: 'admin', email: 'a@b.com' }
    const schema = z.object({
      username: z.string().min(3),
      email: z.email(),
    }).refine(v => v.username !== 'admin', {
      message: '用户名不能为 admin',
      path: ['username'],
    })

    const rules = zodToRules(schema, { getValues: () => values })
    const err = await runValidator(rules.username![0]!, 'admin')
    expect(err?.message).toBe('用户名不能为 admin')

    values.username = 'alice'
    const ok = await runValidator(rules.username![0]!, 'alice')
    expect(ok).toBeUndefined()
  })

  it('pins root-level refine to the first field', async () => {
    const values = { a: 'x', b: 'y' }
    const schema = z.object({
      a: z.string(),
      b: z.string(),
    }).refine(() => false, { message: 'root refine failed' })

    const rules = zodToRules(schema, { getValues: () => values })
    const firstKey = Object.keys(rules)[0]!
    const err = await runValidator(rules[firstKey]![0]!, values[firstKey as 'a' | 'b'])
    expect(err?.message).toBe('root refine failed')
  })

  it('auto-deep nested object paths', () => {
    const schema = z.object({
      profile: z.object({
        email: z.email(),
      }),
      title: z.string().min(1),
    })
    const paths = collectZodFieldPaths(schema, true)
    expect(paths).toContain('profile.email')
    expect(paths).toContain('title')

    const rules = zodToRules(schema, {
      getValues: () => ({ profile: { email: '' }, title: '' }),
    })
    expect(rules['profile.email']).toBeTruthy()
    expect(rules.title).toBeTruthy()
  })

  it('expands array object paths from live lengths', () => {
    const schema = z.object({
      members: z.array(z.object({
        name: z.string().min(1, 'name required'),
        role: z.string(),
      })),
      title: z.string(),
    })
    const values = {
      members: [
        { name: '', role: 'dev' },
        { name: 'bob', role: 'qa' },
      ],
      title: 'p',
    }
    const paths = collectZodFieldPaths(schema, true, '', true, values)
    expect(paths).toContain('members.0.name')
    expect(paths).toContain('members.0.role')
    expect(paths).toContain('members.1.name')
    expect(paths).toContain('title')

    const rules = zodToRules(schema, { getValues: () => values })
    expect(rules['members.0.name']).toBeTruthy()
    expect(rules['members.1.name']).toBeTruthy()
  })

  it('shared parser reuses one safeParse in a whole-form wave', async () => {
    const values = { a: 'ok', b: 'ok' }
    const schema = z.object({
      a: z.string().min(1),
      b: z.string().min(1),
    })
    const spy = vi.spyOn(schema, 'safeParseAsync')
    const parser = createSharedZodParser(schema, () => values)
    const rules = zodToRules(schema, {
      getValues: () => values,
      parser,
    })

    await runValidator(rules.a![0]!, 'ok')
    await runValidator(rules.b![0]!, 'ok')
    // same microtask wave + values already in model → one parse
    expect(spy.mock.calls.length).toBe(1)
    spy.mockRestore()
  })

  it('arrayLengthSignature tracks list sizes', () => {
    const schema = z.object({
      members: z.array(z.object({ name: z.string() })),
    })
    const sig1 = arrayLengthSignature(schema, { members: [{ name: 'a' }] })
    const sig2 = arrayLengthSignature(schema, { members: [{ name: 'a' }, { name: 'b' }] })
    expect(sig1).not.toEqual(sig2)
  })

  it('maps zod issues to form errors', () => {
    const schema = z.object({
      a: z.string().min(2),
      b: z.number(),
    })
    const result = schema.safeParse({ a: 'x', b: 'no' })
    expect(result.success).toBe(false)
    if (result.success)
      return
    const errors = zodIssuesToFormErrors(result.error)
    expect(Object.keys(errors).length).toBeGreaterThan(0)
  })
})

describe('useZodForm', () => {
  it('requires defaults', () => {
    const schema = z.object({ name: z.string() })
    expect(() => useZodForm({ schema } as any)).toThrow(/defaults/)
  })

  it('generates field rules with refine message', async () => {
    const schema = z.object({
      username: z.string().min(3),
    }).refine(v => v.username !== 'admin', {
      message: 'no admin',
      path: ['username'],
    })

    const form = useZodForm({
      schema,
      defaults: { username: 'admin' },
    })

    expect(form.model.username).toBe('admin')
    expect(form.rules.username?.length).toBe(1)

    const err = await runValidator(form.rules.username![0]!, 'admin')
    expect(err?.message).toBe('no admin')
  })

  it('rebuilds array field rules when list length changes', async () => {
    const schema = z.object({
      members: z.array(z.object({
        name: z.string().min(1, 'required'),
      })),
    })
    const form = useZodForm({
      schema,
      defaults: { members: [{ name: 'a' }] },
    })

    expect(form.rules['members.0.name']).toBeTruthy()
    expect(form.rules['members.1.name']).toBeFalsy()

    form.list('members', { defaultItem: () => ({ name: '' }) }).append({ name: '' })
    // resync runs on values event (async microtask path via notify)
    form.notifyChange('members')
    await Promise.resolve()
    await Promise.resolve()

    expect(form.rules['members.1.name']).toBeTruthy()

    const err = await runValidator(form.rules['members.1.name']![0]!, '')
    expect(err?.message).toBe('required')
  })

  it('headless validate falls back to schema when host unbound', async () => {
    const schema = z.object({
      username: z.string().min(3),
    }).refine(v => v.username !== 'admin', {
      message: 'no admin',
      path: ['username'],
    })

    const form = useZodForm({
      schema,
      defaults: { username: 'admin' },
      adapter: unboundAdapter,
    })

    const res = await form.validate()
    expect(res.ok).toBe(false)
    if (res.ok)
      return
    expect(res.errors.username?.[0]).toBe('no admin')
  })

  it('headless validate uses schema without an explicit adapter', async () => {
    const form = useZodForm({
      schema: z.object({ email: z.email('invalid email') }),
      defaults: { email: 'bad' },
    })

    const first = await form.validate()
    expect(first.ok).toBe(false)
    expect(form.errors.email).toEqual(['invalid email'])
    expect(form.errors._form).toBeUndefined()

    form.model.email = 'valid@example.com'
    const second = await form.validate()
    expect(second.ok).toBe(true)
    expect(form.errors).toEqual({})
  })

  it('awaits asynchronous schema refinements in the resolver', async () => {
    const form = useZodForm({
      schema: z.object({
        code: z.string().refine(
          async value => value === 'allowed',
          'not allowed',
        ),
      }),
      defaults: { code: 'blocked' },
    })

    const invalid = await form.validate()
    expect(invalid.ok).toBe(false)
    if (!invalid.ok)
      expect(invalid.errors.code).toEqual(['not allowed'])

    form.model.code = 'allowed'
    const valid = await form.validate()
    expect(valid.ok).toBe(true)
  })

  it('headless validateField uses Zod and preserves unrelated server errors', async () => {
    const form = useZodForm({
      schema: z.object({
        email: z.email('invalid email'),
        name: z.string(),
      }),
      defaults: { email: 'bad', name: 'Ada' },
    })
    form.setErrors({ name: ['server error'] })

    const invalid = await form.validateField('email')
    expect(invalid.ok).toBe(false)
    if (!invalid.ok)
      expect(invalid.errors).toEqual({ email: ['invalid email'] })
    expect(form.errors).toEqual({
      email: ['invalid email'],
      name: ['server error'],
    })

    form.model.email = 'valid@example.com'
    const valid = await form.validateField('email')
    expect(valid.ok).toBe(true)
    expect(form.errors).toEqual({ name: ['server error'] })
  })

  it('headless revalidate clears stale errors after fix', async () => {
    const schema = z.object({
      username: z.string().min(3),
    })
    const form = useZodForm({
      schema,
      defaults: { username: 'ab' },
      adapter: unboundAdapter,
    })

    const first = await form.validate()
    expect(first.ok).toBe(false)

    form.model.username = 'alice'
    const second = await form.validate()
    expect(second.ok).toBe(true)
    if (second.ok)
      expect(second.values.username).toBe('alice')
  })

  it('headless submit succeeds with valid values', async () => {
    const schema = z.object({
      username: z.string().min(3),
    })
    let got: unknown
    const form = useZodForm({
      schema,
      defaults: { username: 'alice' },
      adapter: unboundAdapter,
      onSubmit: async (v) => {
        got = v
      },
    })
    const res = await form.submit()
    expect(res.ok).toBe(true)
    expect(got).toEqual({ username: 'alice' })
  })

  it('onSubmit receives parsed output with host mock', async () => {
    const schema = z.object({
      n: z.coerce.number(),
    })
    let submitted: unknown
    const form = useZodForm({
      schema,
      defaults: { n: 3 },
      adapter: {
        validate: async () => ({ valid: true }),
      },
      onSubmit: async (v) => {
        submitted = v
      },
    })
    form.model.n = 3 as any
    form.host.ref({})
    const res = await form.submit()
    expect(res.ok).toBe(true)
    expect(submitted).toEqual({ n: 3 })
  })

  it('preserves typed API failures with parsed output values', async () => {
    type QuotaExceeded = {
      kind: 'QuotaExceeded'
      parsedCount: number
    }
    const schema = z.object({
      count: z.coerce.number(),
    })
    const form = useZodForm({
      schema,
      defaults: { count: '2' },
      adapter: unboundAdapter,
      onSubmit: async (values) =>
        submitFail<QuotaExceeded>(
          {
            kind: 'QuotaExceeded',
            parsedCount: values.count,
          },
          { errors: { count: ['Quota exceeded'] } },
        ),
    })

    const result = await form.submit()

    expect(result).toEqual({
      ok: false,
      values: { count: 2 },
      submitError: {
        kind: 'QuotaExceeded',
        parsedCount: 2,
      },
      errors: { count: ['Quota exceeded'] },
    })
    expect(form.errors.count).toEqual(['Quota exceeded'])
    expect(form.submitting).toBe(false)
    if (!result.ok && 'submitError' in result)
      expectTypeOf(result.submitError).toEqualTypeOf<QuotaExceeded>()
  })
})
