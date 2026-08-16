import { describe, expect, it } from 'vitest'
import { createForm } from '../src/index'
import { shiftRowIndex } from '../src/field-array'

interface Row { name: string, phone: string }
interface F { title: string, contacts: Row[] }

const rows = (count: number): Row[] =>
  Array.from({ length: count }, (_, i) => ({ name: `n${i}`, phone: '' }))

const build = (count = 3) => {
  const form = createForm<F>({
    defaultValues: { title: '', contacts: rows(count) },
    rules: { 'contacts.*.name': [{ required: true, message: 'required' }] },
  })
  const list = form.fieldArray<Row>('contacts')
  return { form, list }
}

const settle = async () => {
  for (let turn = 0; turn < 20; turn++)
    await Promise.resolve()
}

describe('shiftRowIndex', () => {
  it('shifts rows at or after an insert', () => {
    const op = { type: 'insert', index: 1 } as const
    expect([0, 1, 2].map(i => shiftRowIndex(i, op))).toEqual([0, 2, 3])
  })

  it('drops removed rows and closes the gap', () => {
    const op = { type: 'remove', indexes: [2, 0] } as const
    expect([0, 1, 2, 3].map(i => shiftRowIndex(i, op))).toEqual([
      undefined,
      0,
      undefined,
      1,
    ])
  })

  it('remaps a forward move', () => {
    const op = { type: 'move', from: 0, to: 2 } as const
    expect([0, 1, 2, 3].map(i => shiftRowIndex(i, op))).toEqual([2, 0, 1, 3])
  })

  it('remaps a backward move', () => {
    const op = { type: 'move', from: 3, to: 1 } as const
    expect([0, 1, 2, 3].map(i => shiftRowIndex(i, op))).toEqual([0, 2, 3, 1])
  })

  it('drops only the replaced row', () => {
    const op = { type: 'replace', index: 1 } as const
    expect([0, 1, 2].map(i => shiftRowIndex(i, op))).toEqual([0, undefined, 2])
  })

  it('drops everything on clear', () => {
    expect(shiftRowIndex(0, { type: 'clear' })).toBeUndefined()
  })
})

describe('field array keeps row errors with their rows', () => {
  it('remove(index) drops that row and shifts the rows after it', async () => {
    const { form, list } = build()
    form.setErrors({
      'title': ['title bad'],
      'contacts.0.name': ['row0'],
      'contacts.1.name': ['row1'],
      'contacts.2.name': ['row2'],
    })

    list.remove(1)
    await settle()

    expect(form.getErrors()).toEqual({
      'title': ['title bad'],
      'contacts.0.name': ['row0'],
      'contacts.1.name': ['row2'],
    })
  })

  it('append() leaves existing row errors alone', async () => {
    const { form, list } = build()
    form.setErrors({ 'contacts.0.name': ['row0'], 'contacts.2.name': ['row2'] })

    list.append()
    await settle()

    expect(form.getErrors()).toEqual({
      'contacts.0.name': ['row0'],
      'contacts.2.name': ['row2'],
    })
  })

  it('prepend() shifts every existing row error up by one', async () => {
    const { form, list } = build()
    form.setErrors({ 'contacts.0.name': ['row0'], 'contacts.2.name': ['row2'] })

    list.prepend()
    await settle()

    expect(form.getErrors()).toEqual({
      'contacts.1.name': ['row0'],
      'contacts.3.name': ['row2'],
    })
  })

  it('move() carries the error with the moved row', async () => {
    const { form, list } = build()
    form.setErrors({ 'contacts.0.name': ['row0'], 'contacts.1.name': ['row1'] })

    list.move(0, 2)
    await settle()

    expect(form.getErrors()).toEqual({
      'contacts.2.name': ['row0'],
      'contacts.0.name': ['row1'],
    })
  })

  it('replace(index) clears only that row', async () => {
    const { form, list } = build()
    form.setErrors({ 'contacts.0.name': ['row0'], 'contacts.1.name': ['row1'] })

    list.replace(1, { name: 'fresh', phone: '' })
    await settle()

    expect(form.getErrors()).toEqual({ 'contacts.0.name': ['row0'] })
  })

  it('clear() drops every row error but keeps non-row errors', async () => {
    const { form, list } = build()
    form.setErrors({ 'title': ['title bad'], 'contacts.0.name': ['row0'] })

    list.clear()
    await settle()

    expect(form.getErrors()).toEqual({ 'title': ['title bad'] })
  })

  it('update(index, partial) only clears the assigned leaves', async () => {
    const { form, list } = build()
    form.setErrors({
      'contacts.0.name': ['row0 name'],
      'contacts.0.phone': ['row0 phone'],
      'contacts.1.name': ['row1 name'],
    })

    list.update(0, { name: 'changed' })
    await settle()

    expect(form.getErrors()).toEqual({
      'contacts.0.phone': ['row0 phone'],
      'contacts.1.name': ['row1 name'],
    })
  })

  it('remove() of several indexes closes all gaps at once', async () => {
    const { form, list } = build(5)
    form.setErrors({
      'contacts.0.name': ['r0'],
      'contacts.1.name': ['r1'],
      'contacts.3.name': ['r3'],
      'contacts.4.name': ['r4'],
    })

    list.remove([1, 3])
    await settle()

    expect(form.getErrors()).toEqual({
      'contacts.0.name': ['r0'],
      'contacts.2.name': ['r4'],
    })
  })

  it('move() keeps the generated key bound to its row', () => {
    const { list } = build(2)
    const [first, second] = list.fields.map(field => field.key)

    list.move(0, 1)

    expect(list.fields.map(field => field.key)).toEqual([second, first])
  })

  it('keeps row keys stable across an edit-style setValues', async () => {
    const { form, list } = build(2)
    const before = list.fields.map(field => field.key)

    // Mirrors useForm.load('edit', record).
    form.setValues(
      { title: 't', contacts: [{ name: 'x', phone: '' }, { name: 'y', phone: '' }] },
      { merge: false },
    )
    form.rebaseDefaults(form.getValues())
    await settle()

    expect(list.fields.map(field => field.key)).toEqual(before)
    expect(form.values.contacts.map(row => row.name)).toEqual(['x', 'y'])
  })

  it('keeps row keys stable across reset()', async () => {
    const { form, list } = build(2)
    const before = list.fields.map(field => field.key)

    form.setFieldValue('contacts.0.name', 'edited')
    list.append({ name: 'extra', phone: '' })
    form.reset()
    await settle()

    // Surviving positions keep their keys; the appended row is gone.
    expect(list.fields.map(field => field.key)).toEqual(before)
    expect(form.values.contacts).toHaveLength(2)
    expect(form.values.contacts[0]!.name).toBe('n0')
  })

  it('reset() shrinks a grown array and keeps the live array identity', async () => {
    const { form, list } = build(1)
    const liveArray = form.values.contacts
    list.append({ name: 'second', phone: '' })
    expect(form.values.contacts).toHaveLength(2)

    form.reset()
    await settle()

    expect(form.values.contacts).toBe(liveArray)
    expect(form.values.contacts).toHaveLength(1)
  })
})
