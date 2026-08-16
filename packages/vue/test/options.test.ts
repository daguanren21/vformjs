import { describe, expect, it, vi } from 'vitest'
import { useForm } from '../src/use-form'

interface Address {
  country: string
  city: string
}

const CITIES: Record<string, string[]> = {
  cn: ['hangzhou'],
  us: ['austin'],
}

const settle = async () => {
  for (let turn = 0; turn < 20; turn++)
    await Promise.resolve()
}

describe('useForm options()', () => {
  it('exposes a reactive ref that tracks loading -> loaded', async () => {
    const form = useForm<Address>({
      defaultValues: { country: 'cn', city: '' },
      optionSources: {
        city: { deps: ['country'], load: ({ get }) => CITIES[get('country') as string] ?? [] },
      },
    })
    const city = form.options('city')

    expect(city.value.loading).toBe(true)
    expect(city.value.loaded).toBe(false)

    await settle()
    expect(city.value.loading).toBe(false)
    expect(city.value.items).toEqual(['hangzhou'])
  })

  it('recomputes when a dep change reloads the source', async () => {
    const form = useForm<Address>({
      defaultValues: { country: 'cn', city: '' },
      optionSources: {
        city: { deps: ['country'], load: ({ get }) => CITIES[get('country') as string] ?? [] },
      },
    })
    const city = form.options('city')
    await settle()
    expect(city.value.items).toEqual(['hangzhou'])

    form.setFieldValue('country', 'us')
    await settle()
    expect(city.value.items).toEqual(['austin'])
    expect(form.model.city).toBe('')
  })

  it('returns the same ref for repeated calls on one path', () => {
    const form = useForm<Address>({
      defaultValues: { country: '', city: '' },
      optionSources: { country: { load: () => [] } },
    })
    expect(form.options('country')).toBe(form.options('country'))
  })

  it('reloadOptions refetches through the Vue surface', async () => {
    const load = vi.fn(() => ['cn'])
    const form = useForm<Address>({
      defaultValues: { country: '', city: '' },
      optionSources: { country: { load } },
    })
    await settle()
    expect(load).toHaveBeenCalledTimes(1)

    form.reloadOptions('country')
    await settle()
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('load("edit", record) keeps the record and still loads its options', async () => {
    const form = useForm<Address>({
      defaultValues: { country: '', city: '' },
      optionSources: {
        city: { deps: ['country'], load: ({ get }) => CITIES[get('country') as string] ?? [] },
      },
    })
    await settle()

    form.load('edit', { country: 'us', city: 'austin' })
    await settle()

    expect(form.model.city).toBe('austin')
    expect(form.options('city').value.items).toEqual(['austin'])
    expect(form.dirty).toBe(false)
  })
})
