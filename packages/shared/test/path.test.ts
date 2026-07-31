import { describe, expect, it } from 'vitest'
import {
  deleteByPath,
  fieldPath,
  getByPath,
  matchPathPrefix,
  pathMatchesPattern,
  setByPath,
  toPath,
} from '../src'

describe('path utils', () => {
  it('toPath splits dotted paths and numeric segments', () => {
    expect(toPath('a.b.0.c')).toEqual(['a', 'b', 0, 'c'])
    expect(toPath('')).toEqual([])
    expect(toPath(['x', 1])).toEqual(['x', 1])
  })

  it('fieldPath joins segments', () => {
    expect(fieldPath('domains', 0, 'value')).toBe('domains.0.value')
  })

  it('get/set nested values', () => {
    const model: Record<string, unknown> = { a: { b: 1 }, list: [{ v: 1 }] }
    expect(getByPath(model, 'a.b')).toBe(1)
    setByPath(model, 'a.b', 2)
    expect(model.a).toEqual({ b: 2 })
    setByPath(model, 'list.0.v', 9)
    expect(getByPath(model, 'list.0.v')).toBe(9)
    setByPath(model, 'new.child', true)
    expect(getByPath(model, 'new.child')).toBe(true)
  })

  it('deleteByPath removes keys and array items', () => {
    const model: Record<string, unknown> = {
      a: { b: 1, c: 2 },
      list: [1, 2, 3],
    }
    deleteByPath(model, 'a.b')
    expect(model.a).toEqual({ c: 2 })
    deleteByPath(model, 'list.1')
    expect(model.list).toEqual([1, 3])
  })

  it('matchPathPrefix / pathMatchesPattern', () => {
    expect(matchPathPrefix('domains.0.value', 'domains')).toBe(true)
    expect(matchPathPrefix('domains', 'domains')).toBe(true)
    expect(matchPathPrefix('name', 'domains')).toBe(false)
    expect(pathMatchesPattern('domains.0.value', 'domains.*.value')).toBe(true)
    expect(pathMatchesPattern('domains.0.other', 'domains.*.value')).toBe(false)
    expect(pathMatchesPattern('a', '*')).toBe(true)
  })
})
