import { describe, expect, it } from 'vitest'
import { createRuleBuilders, enUSRuleMessages, normalizeRuleInput, r, ruleBuilders } from '../src'

describe('rule builders', () => {
  it('normalizes static and sugar strings', () => {
    const rules = normalizeRuleInput(['required', 'email', 'min:3', 'phone', 'numberMax:10'])
    expect(rules).toHaveLength(5)
    expect(rules[0]).toMatchObject({ required: true })
    expect(rules[1]).toMatchObject({ type: 'email' })
    expect(rules[2]).toMatchObject({ min: 3 })
    expect(rules[3]).toMatchObject({ pattern: expect.any(RegExp) })
    expect(rules[4]).toMatchObject({ type: 'number', max: 10 })
  })

  it('builds custom and equalTo validators', async () => {
    const custom = ruleBuilders.custom((_rule, value, cb) => {
      if (value === 'ok')
        cb()
      else
        cb(new Error('bad'))
    })
    expect(typeof custom.validator).toBe('function')

    const other = () => 'secret'
    const eq = r.equalTo(other, '不一致')
    await new Promise<void>((resolve) => {
      ;(eq.validator as any)({}, 'secret', (err?: Error) => {
        expect(err).toBeUndefined()
        resolve()
      })
    })
    await new Promise<void>((resolve) => {
      ;(eq.validator as any)({}, 'nope', (err?: Error) => {
        expect(err?.message).toBe('不一致')
        resolve()
      })
    })
  })

  it('supports pattern / arrayRequired / range', () => {
    expect(r.pattern(/abc/).pattern).toEqual(/abc/)
    expect(r.arrayRequired()).toMatchObject({ type: 'array', min: 1 })
    expect(r.range(2, 5)).toMatchObject({ min: 2, max: 5 })
    expect(r.numberRange(1, 99)).toMatchObject({ type: 'number', min: 1, max: 99 })
  })

  it('creates isolated localized rule builders', () => {
    const english = createRuleBuilders(enUSRuleMessages)
    const custom = createRuleBuilders({
      ...enUSRuleMessages,
      required: 'This field is mandatory',
    })

    expect(english.required().message).toBe('Required')
    expect(english.min(3).message).toBe('Enter at least 3 characters')
    expect(custom.required().message).toBe('This field is mandatory')
    expect(r.required().message).toBe('必填')
  })
})
