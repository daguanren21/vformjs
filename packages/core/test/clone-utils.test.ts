import { describe, expect, it } from 'vitest'
import { deepClone, deepMerge, restoreInPlace } from '../src/vendor/shared'

describe('clone utils', () => {
  it('deepClone isolates nested structures', () => {
    const src = { a: 1, b: { c: [1, 2] } }
    const copy = deepClone(src)
    copy.b.c.push(3)
    expect(src.b.c).toEqual([1, 2])
  })

  it('preserves opaque object identity by default', () => {
    const endpoint = new URL('https://example.com')
    const copy = deepClone({ endpoint })

    expect(copy.endpoint).toBe(endpoint)
  })

  it('preserves cycles and shared references', () => {
    interface Node {
      value: number
      self?: Node
    }
    const source: Node = { value: 1 }
    source.self = source

    const copy = deepClone(source)
    expect(copy).not.toBe(source)
    expect(copy.self).toBe(copy)
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
