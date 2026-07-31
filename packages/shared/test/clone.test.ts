import { describe, expect, it } from 'vitest'
import { deepClone, deepMerge, restoreInPlace } from '../src'

describe('clone utils', () => {
  it('deepClone isolates nested structures', () => {
    const src = { a: 1, b: { c: [1, 2] } }
    const copy = deepClone(src)
    copy.b.c.push(3)
    expect(src.b.c).toEqual([1, 2])
  })

  it('deepMerge merges objects and replaces arrays', () => {
    const target = { a: 1, b: { c: 2, d: 3 }, list: [1] }
    deepMerge(target, { b: { c: 9 }, list: [2, 3] })
    expect(target).toEqual({ a: 1, b: { c: 9, d: 3 }, list: [2, 3] })
  })

  it('restoreInPlace restores shape and drops extra keys', () => {
    const target: Record<string, unknown> = {
      a: 9,
      b: { c: 1, extra: true },
      list: [1, 2, 3],
      onlyOnTarget: 1,
    }
    const baseline = {
      a: 1,
      b: { c: 2 },
      list: [{ v: 1 }],
    }
    restoreInPlace(target, baseline)
    expect(target).toEqual({
      a: 1,
      b: { c: 2 },
      list: [{ v: 1 }],
    })
  })
})
