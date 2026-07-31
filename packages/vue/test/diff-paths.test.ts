import { describe, expect, it } from 'vitest'
import { diffChangedPaths } from '../src/use-form'

describe('diffChangedPaths', () => {
  it('detects only changed leaf paths', () => {
    const prev = { province: 'jiangsu', city: '', payType: 'bank' }
    const next = { province: 'jiangsu', city: 'nanjing', payType: 'bank' }
    expect(diffChangedPaths(prev, next).sort()).toEqual(['city'])
  })

  it('detects province change without city noise if city same', () => {
    const prev = { province: 'zhejiang', city: 'hangzhou' }
    const next = { province: 'jiangsu', city: 'hangzhou' }
    expect(diffChangedPaths(prev, next)).toEqual(['province'])
  })

  it('detects nested and array changes', () => {
    const prev = { a: { b: 1 }, list: [{ v: 1 }, { v: 2 }] }
    const next = { a: { b: 2 }, list: [{ v: 1 }, { v: 3 }] }
    expect(diffChangedPaths(prev, next).sort()).toEqual(['a.b', 'list.1.v'])
  })

  it('returns empty when equal', () => {
    const obj = { a: 1, b: { c: 2 } }
    expect(diffChangedPaths(obj, { a: 1, b: { c: 2 } })).toEqual([])
  })
})
