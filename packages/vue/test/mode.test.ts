import { describe, expect, it } from 'vitest'
import { useForm } from '../src/use-form'

describe('useForm modes', () => {
  it('create / edit / detail via load inside form owner', async () => {
    const form = useForm({
      defaultValues: { name: '', age: 0 },
    })

    form.model.name = 'dirty'
    form.load('create')
    expect(form.mode).toBe('create')
    expect(form.model.name).toBe('')
    expect(form.readonly).toBe(false)
    expect(form.editable).toBe(true)

    form.load('edit', { name: 'Alice', age: 18 })
    expect(form.mode).toBe('edit')
    expect(form.model.name).toBe('Alice')
    expect(form.model.age).toBe(18)

    form.model.name = 'Bob'
    form.reset()
    // edit rebased defaults to loaded detail
    expect(form.model.name).toBe('Alice')

    form.load('detail', { name: 'Carol', age: 20 })
    expect(form.mode).toBe('detail')
    expect(form.readonly).toBe(true)
    expect(form.editable).toBe(false)

    const result = await form.submit()
    expect(result.ok).toBe(false)
  })

  it('create after edit restores factory defaults, not edit baseline', () => {
    const form = useForm({
      defaultValues: { name: '', age: 0, note: '' },
    })

    form.load('edit', { name: 'Alice', age: 18, note: 'from-A' })
    expect(form.model.name).toBe('Alice')

    form.load('create')
    expect(form.mode).toBe('create')
    expect(form.model).toEqual({ name: '', age: 0, note: '' })

    // reset also returns to factory defaults after create
    form.model.name = 'tmp'
    form.reset()
    expect(form.model.name).toBe('')
  })

  it('edit B after edit A does not leak omitted fields from A', () => {
    const form = useForm({
      defaultValues: { name: '', age: 0, note: '' },
    })

    form.load('edit', { name: 'Alice', age: 18, note: 'from-A' })
    form.load('edit', { name: 'Bob', age: 20 })
    expect(form.model.name).toBe('Bob')
    expect(form.model.age).toBe(20)
    expect(form.model.note).toBe('')
  })
})
