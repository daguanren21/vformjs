import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { reactive } from 'vue-demi'
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
  it('loads edit values atomically without publishing the previous baseline', () => {
    const form = useForm({
      defaultValues: { name: '', age: 0 },
    })
    const valueEvents: string[][] = []
    form.subscribe({
      events: 'values',
      callback(event) {
        if (event.type === 'values')
          valueEvents.push(event.paths)
      },
    })

    form.load('edit', { name: 'Ada', age: 18 })

    expect(valueEvents).toEqual([['*']])
    expect(form.model).toEqual({ name: 'Ada', age: 18 })
    expect(form.submitCount).toBe(0)
    expect(form.submitOk).toBe(false)
  })

  it('projects server errors and direct model dirty state reactively', async () => {
    const form = useForm({
      defaultValues: { name: '', profile: { city: '' } },
    })

    form.setErrors({ name: ['already used'] })
    expect(form.errors.name).toEqual(['already used'])

    form.model.profile.city = 'Nanjing'
    await Promise.resolve()
    expect(form.dirty).toBe(true)
    expect(form.changedPaths).toEqual(['profile.city'])

    form.load('detail', { name: 'Alice', profile: { city: 'Shanghai' } })
    expect(form.errors).toEqual({})
    expect(form.dirty).toBe(false)
    expect(form.changedPaths).toEqual([])
  })

  it('batches multiple direct model mutations in the same tick', async () => {
    const form = useForm({
      defaultValues: { first: '', second: '' },
    })
    const valueEvents: string[][] = []
    const unsubscribe = form.raw.subscribe({
      events: 'values',
      callback(event) {
        if (event.type === 'values')
          valueEvents.push(event.paths)
      },
    })

    form.model.first = 'one'
    form.model.second = 'two'
    await Promise.resolve()

    expect(form.dirty).toBe(true)
    expect(form.changedPaths).toEqual(['first', 'second'])
    expect(valueEvents).toEqual([['first', 'second']])
    unsubscribe()
  })

  it('uses a caller-owned reactive model as the live state', async () => {
    const model = reactive({ name: '' })
    const form = useForm({
      defaultValues: { name: '' },
      model,
    })

    expect(form.model).toBe(model)
    model.name = 'Ada'
    await Promise.resolve()
    expect(form.dirty).toBe(true)
    expect(form.changedPaths).toEqual(['name'])

    form.reset()
    expect(model.name).toBe('')
    expect(form.model).toBe(model)
  })


  it('updates exact paths without a deep model scan in explicit mode', () => {
    interface Model {
      active: string
      unrelated: string
    }
    let unrelatedReads = 0
    const model = reactive({
      active: '',
      get unrelated() {
        unrelatedReads += 1
        return ''
      },
    }) as Model
    const form = useForm<Model>({
      defaultValues: { active: '', unrelated: '' },
      model,
      modelTracking: 'explicit',
    })
    const active = form.field('active')

    unrelatedReads = 0
    expectTypeOf(active.value).toEqualTypeOf<string>()
    expect(form.field('active')).toBe(active)
    active.value = 'changed'

    expect(form.model.active).toBe('changed')
    expect(form.changedPaths).toEqual(['active'])
    expect(unrelatedReads).toBe(0)
  })

  it('exposes one host binding and host-specific item props', () => {
    const bind = vi.fn()
    const form = useForm({
      defaultValues: { email: '' },
      adapter: {
        bind,
        validate: async () => ({ valid: true }),
        getItemProps: (path, error) => ({ prop: path, error }),
      },
    })
    const host = {}

    form.host.ref(host)
    form.setErrors({ email: ['already used'] })

    expect(bind).toHaveBeenCalledWith(host)
    expect(form.host.model).toBe(form.model)
    expect(form.item('email')).toEqual({
      prop: 'email',
      error: 'already used',
    })
  })

  it('projects concise submit state and clears it when another record loads', async () => {
    const form = useForm({
      defaultValues: { name: '' },
    })

    expect(form.submitCount).toBe(0)
    expect(form.submitOk).toBe(false)

    const result = await form.submit()
    expect(result.ok).toBe(true)
    expect(form.submitCount).toBe(1)
    expect(form.submitOk).toBe(true)

    form.load('edit', { name: 'Ada' })
    expect(form.submitCount).toBe(0)
    expect(form.submitOk).toBe(false)
  })
})
