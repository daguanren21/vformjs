import type { StandardSchemaV1 } from '@standard-schema/spec'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import {
  createSchemaResolver,
  schemaIssuesToFormErrors,
  type AnySchema,
} from '../src/resolver'
import { useSchemaForm } from '../src/use-schema-form'

interface RawValues {
  count: string
  members: Array<{ email: string }>
}

interface ParsedValues {
  count: number
  members: Array<{ email: string }>
}

const schema: StandardSchemaV1<RawValues, ParsedValues> = {
  '~standard': {
    version: 1,
    vendor: 'vformjs-test',
    validate(value) {
      const input = value as RawValues
      const issues: StandardSchemaV1.Issue[] = []
      if (!/^\d+$/.test(input.count))
        issues.push({ message: 'count must be numeric', path: ['count'] })
      input.members.forEach((member, index) => {
        if (!member.email.includes('@')) {
          issues.push({
            message: 'invalid email',
            path: [{ key: 'members' }, index, { key: 'email' }],
          })
        }
      })
      return issues.length
        ? { issues }
        : {
            value: {
              count: Number(input.count),
              members: input.members.map(member => ({ ...member })),
            },
          }
    },
  },
}

describe('@vformjs/schema', () => {
  it('rejects primitive schemas at the type boundary', () => {
    expectTypeOf<StandardSchemaV1<string, string>>()
      .not.toMatchTypeOf<AnySchema>()
  })

  it('normalizes Standard Schema issue paths and groups messages', () => {
    const errors = schemaIssuesToFormErrors([
      { message: 'first', path: [{ key: 'members' }, 0, 'email'] },
      { message: 'second', path: ['members', 0, 'email'] },
      { message: 'root issue' },
      { message: 'unsafe path', path: ['__proto__'] },
      { message: 'symbol path', path: [Symbol('private')] },
    ])

    expect(errors).toEqual({
      'members.0.email': ['first', 'second'],
      '_form': ['root issue', 'unsafe path', 'symbol path'],
    })
  })

  it('filters resolver errors for partial validation paths', async () => {
    const resolver = createSchemaResolver(schema)
    const values: RawValues & Record<string, unknown> = {
      count: 'bad',
      members: [{ email: 'bad' }],
    }
    const result = await resolver(values, {
      signal: new AbortController().signal,
      validationId: 1,
      paths: ['members.0.email'],
    })

    expect(result).toEqual({
      ok: false,
      values,
      errors: { 'members.0.email': ['invalid email'] },
    })
  })

  it('returns input values from selected-path validation', async () => {
    const emptyRows = useSchemaForm({
      schema,
      defaults: {
        count: '2',
        members: [],
      },
    })
    const emptyResult = await emptyRows.validateField('members.*.email')
    expectTypeOf(emptyResult.values.count).toEqualTypeOf<string>()
    expect(emptyResult).toEqual({
      ok: true,
      values: { count: '2', members: [] },
    })
    const rootWildcard = await emptyRows.validate('*')
    expectTypeOf(rootWildcard.values.count).toEqualTypeOf<string>()
    expect(rootWildcard).toEqual({
      ok: true,
      values: { count: '2', members: [] },
    })

    const wildcardList = await emptyRows.validate(['*', 'members.*.email'])
    expectTypeOf(wildcardList.values.count).toEqualTypeOf<string>()
    expect(wildcardList).toEqual({
      ok: true,
      values: { count: '2', members: [] },
    })

    const maybePaths: string[] | undefined = undefined
    await emptyRows.validate(maybePaths)

    const unrelatedIssue = useSchemaForm({
      schema,
      defaults: {
        count: 'bad',
        members: [{ email: 'ada@example.com' }],
      },
    })
    const partialResult = await unrelatedIssue.validateField('members.0.email')
    expectTypeOf(partialResult.values.count).toEqualTypeOf<string>()
    expect(partialResult).toEqual({
      ok: true,
      values: {
        count: 'bad',
        members: [{ email: 'ada@example.com' }],
      },
    })
  })

  it('infers schema input and transformed submit output', async () => {
    const onSubmit = vi.fn((values: ParsedValues) => {
      expectTypeOf(values.count).toEqualTypeOf<number>()
    })
    const form = useSchemaForm({
      schema,
      defaults: {
        count: '2',
        members: [{ email: 'ada@example.com' }],
      },
      onSubmit,
    })

    expectTypeOf(form.model.count).toEqualTypeOf<string>()
    const result = await form.submit()

    expect(result).toEqual({
      ok: true,
      values: {
        count: 2,
        members: [{ email: 'ada@example.com' }],
      },
    })
    expect(onSubmit).toHaveBeenCalledOnce()
    expect(form.submitOk).toBe(true)
  })
})
