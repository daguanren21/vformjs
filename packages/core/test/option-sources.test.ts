import { describe, expect, it, vi } from 'vitest'
import { createForm } from '../src/index'

interface Address {
  country: string
  city: string
  district: string
  currency: string
  fallbackCurrency: string
}

const defaults: Address = {
  country: '',
  city: '',
  district: '',
  currency: '',
  fallbackCurrency: '',
}

const CITIES: Record<string, string[]> = {
  cn: ['hangzhou', 'shanghai'],
  us: ['austin'],
}

/**
 * Drain the microtask queue. Loads settle on promise callbacks and linkage on
 * `queueMicrotask`, so a bounded number of turns is deterministic — no clock.
 */
const settle = async () => {
  for (let turn = 0; turn < 20; turn++)
    await Promise.resolve()
}

describe('optionSources', () => {
  it('loads non-dependent sources once on creation and exposes load state', async () => {
    const load = vi.fn(async () => ['cn', 'us'])
    const form = createForm<Address>({
      defaultValues: { ...defaults },
      optionSources: { country: { load } },
    })

    expect(form.getOptionsState('country').loading).toBe(true)
    await settle()

    expect(load).toHaveBeenCalledTimes(1)
    expect(form.getOptionsState('country')).toEqual({
      items: ['cn', 'us'],
      loading: false,
      error: undefined,
      loaded: true,
    })
    // Resolved payload is mirrored into meta so existing readers keep working.
    expect(form.getMeta('country').options).toEqual(['cn', 'us'])
  })

  it('reloads on dep change and resets the dependent value to its default', async () => {
    const load = vi.fn(async ({ get }) => CITIES[get('country') as string] ?? [])
    const form = createForm<Address>({
      defaultValues: { ...defaults },
      optionSources: { city: { deps: ['country'], load } },
    })
    await settle()

    form.setFieldValue('country', 'cn')
    await settle()
    expect(form.getOptionsState('city').items).toEqual(['hangzhou', 'shanghai'])

    form.setFieldValue('city', 'hangzhou')
    form.setFieldValue('country', 'us')
    await settle()

    expect(form.values.city).toBe('')
    expect(form.getOptionsState('city').items).toEqual(['austin'])
  })

  it('cascades multi-level deps: country -> city -> district', async () => {
    const form = createForm<Address>({
      defaultValues: { ...defaults },
      optionSources: {
        city: { deps: ['country'], load: ({ get }) => CITIES[get('country') as string] ?? [] },
        district: { deps: ['city'], load: ({ get }) => [`${get('city')}-01`] },
      },
    })
    await settle()

    form.setFieldValue('country', 'cn')
    await settle()
    form.setFieldValue('city', 'hangzhou')
    form.setFieldValue('district', 'hangzhou-01')
    await settle()
    expect(form.values.district).toBe('hangzhou-01')

    form.setFieldValue('country', 'us')
    await settle()
    // country change clears city, which clears district.
    expect(form.values.city).toBe('')
    expect(form.values.district).toBe('')
  })

  it('shares one request across fields resolving to the same cache key', async () => {
    const load = vi.fn(async () => ['USD', 'CNY'])
    const form = createForm<Address>({
      defaultValues: { ...defaults },
      optionSources: {
        currency: { key: () => 'dict:currency', load },
        fallbackCurrency: { key: () => 'dict:currency', load },
      },
    })
    await settle()

    expect(load).toHaveBeenCalledTimes(1)
    expect(form.getOptionsState('currency').items).toEqual(['USD', 'CNY'])
    expect(form.getOptionsState('fallbackCurrency').items).toEqual(['USD', 'CNY'])
  })

  it('feeds many fields from one request via key + select', async () => {
    interface Entry { trucking: string, itemCode: string, inBuyer: string }
    const load = vi.fn(async () => ({
      truckingOpts: ['T1'],
      itemCodeOpts: ['I1'],
      inBuyerOpts: ['B1'],
    }))
    const shared = (pick: string) => ({
      key: () => 'nextOpts',
      load,
      select: (payload: unknown) => (payload as Record<string, unknown>)[pick],
    })
    const form = createForm<Entry>({
      defaultValues: { trucking: '', itemCode: '', inBuyer: '' },
      optionSources: {
        trucking: shared('truckingOpts'),
        itemCode: shared('itemCodeOpts'),
        inBuyer: shared('inBuyerOpts'),
      },
    })
    await settle()

    expect(load).toHaveBeenCalledTimes(1)
    expect(form.getOptionsState('trucking').items).toEqual(['T1'])
    expect(form.getOptionsState('itemCode').items).toEqual(['I1'])
    expect(form.getOptionsState('inBuyer').items).toEqual(['B1'])
  })

  it('keeps the loaded record when load() supplies the whole model', async () => {
    const load = vi.fn(async ({ get }) => CITIES[get('country') as string] ?? [])
    const form = createForm<Address>({
      defaultValues: { ...defaults },
      optionSources: { city: { deps: ['country'], load } },
    })
    await settle()

    // Mirrors useForm.load('edit', record): merge:false + rebaseDefaults.
    form.setValues(
      { ...defaults, country: 'cn', city: 'shanghai' },
      { merge: false },
    )
    form.rebaseDefaults(form.getValues())
    await settle()

    // The incoming record wins — city must not be cleared by the dep refresh…
    expect(form.values.city).toBe('shanghai')
    // …and its options must still be loaded for the loaded country.
    expect(form.getOptionsState('city').items).toEqual(['hangzhou', 'shanghai'])
    expect(form.dirty).toBe(false)
  })

  it('drops a stale load that resolves after a newer one, and aborts its signal', async () => {
    const pending: Array<{ country: string, resolve: (value: unknown) => void }> = []
    const aborted: string[] = []
    const form = createForm<Address>({
      defaultValues: { ...defaults },
      optionSources: {
        city: {
          deps: ['country'],
          load: ({ get, signal }) => {
            const country = get('country') as string
            signal.addEventListener('abort', () => aborted.push(country))
            // Executor form: the package targets `lib: ES2022`, which predates
            // `Promise.withResolvers`.
            let resolve!: (value: unknown) => void
            const promise = new Promise<unknown>((res) => {
              resolve = res
            })
            pending.push({ country, resolve })
            return promise
          },
        },
      },
    })
    await settle()

    form.setFieldValue('country', 'cn')
    await settle()
    form.setFieldValue('country', 'us')
    await settle()

    // Resolve the superseded 'cn' request last: it must not overwrite 'us'.
    pending.find(entry => entry.country === 'us')!.resolve(['us-city'])
    await settle()
    pending.find(entry => entry.country === 'cn')!.resolve(['cn-city'])
    await settle()

    expect(aborted).toContain('cn')
    expect(form.getOptionsState('city').items).toEqual(['us-city'])
  })

  it('surfaces load failures as error state and recovers on reloadOptions', async () => {
    let attempt = 0
    const form = createForm<Address>({
      defaultValues: { ...defaults },
      optionSources: {
        country: {
          load: () => {
            attempt += 1
            return attempt === 1
              ? Promise.reject(new Error('offline'))
              : Promise.resolve(['cn'])
          },
        },
      },
    })
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await settle()

    const failed = form.getOptionsState('country')
    expect(failed.loading).toBe(false)
    expect(failed.loaded).toBe(false)
    expect((failed.error as Error).message).toBe('offline')

    form.reloadOptions('country')
    await settle()
    expect(form.getOptionsState('country')).toEqual({
      items: ['cn'],
      loading: false,
      error: undefined,
      loaded: true,
    })
    spy.mockRestore()
  })

  it('lazy sources skip the creation load but still answer reloadOptions', async () => {
    const load = vi.fn(async () => ['cn'])
    const form = createForm<Address>({
      defaultValues: { ...defaults },
      optionSources: { country: { lazy: true, load } },
    })
    await settle()
    expect(load).not.toHaveBeenCalled()

    form.reloadOptions('country')
    await settle()
    expect(load).toHaveBeenCalledTimes(1)
    expect(form.getOptionsState('country').items).toEqual(['cn'])
  })

  it('reloadOptions() with no argument refetches every source', async () => {
    const country = vi.fn(async () => ['cn'])
    const city = vi.fn(async () => ['hangzhou'])
    const form = createForm<Address>({
      defaultValues: { ...defaults },
      optionSources: { country: { load: country }, city: { load: city } },
    })
    await settle()

    expect(country).toHaveBeenCalledTimes(1)

    form.reloadOptions()
    await settle()
    expect(country).toHaveBeenCalledTimes(2)
    expect(city).toHaveBeenCalledTimes(2)
  })

  it('loads a dep-less wildcard source for rows added after creation', async () => {
    interface Order { rows: Array<{ country: string }> }
    const load = vi.fn(async () => ['cn', 'us'])
    const form = createForm<Order>({
      defaultValues: { rows: [{ country: '' }] },
      optionSources: {
        'rows.*.country': { key: () => 'dict:country', load },
      },
    })
    await settle()
    expect(form.getOptionsState('rows.0.country').items).toEqual(['cn', 'us'])

    form.fieldArray<{ country: string }>('rows').append({ country: '' })
    await settle()

    // The new row must be populated, and the shared key must not refetch.
    expect(form.getOptionsState('rows.1.country').items).toEqual(['cn', 'us'])
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('loads a dependent wildcard source for rows added after creation', async () => {
    interface Order { rows: Array<{ country: string, city: string }> }
    const form = createForm<Order>({
      defaultValues: { rows: [{ country: 'cn', city: '' }] },
      optionSources: {
        'rows.*.city': {
          deps: ['rows.*.country'],
          load: ({ get, path }) =>
            CITIES[get(path.replace(/\.city$/, '.country')) as string] ?? [],
        },
      },
    })
    await settle()
    expect(form.getOptionsState('rows.0.city').items).toEqual(['hangzhou', 'shanghai'])

    form.fieldArray<{ country: string, city: string }>('rows')
      .append({ country: 'us', city: '' })
    await settle()

    expect(form.getOptionsState('rows.1.city').items).toEqual(['austin'])
    // The pre-existing row keeps its own options.
    expect(form.getOptionsState('rows.0.city').items).toEqual(['hangzhou', 'shanghai'])
  })

  it('a freshly materialized row is not treated as a dep change', async () => {
    interface Order { rows: Array<{ country: string, city: string }> }
    const form = createForm<Order>({
      defaultValues: { rows: [{ country: 'cn', city: '' }] },
      optionSources: {
        'rows.*.city': {
          deps: ['rows.*.country'],
          load: ({ get, path }) =>
            CITIES[get(path.replace(/\.city$/, '.country')) as string] ?? [],
        },
      },
    })
    await settle()
    form.setFieldValue('rows.0.city', 'shanghai')
    await settle()

    form.fieldArray<{ country: string, city: string }>('rows')
      .append({ country: 'us', city: 'austin' })
    await settle()

    // Appending must not reset either row's chosen value.
    expect(form.values.rows.map(row => row.city)).toEqual(['shanghai', 'austin'])
  })

  it('a dep change in one row leaves sibling rows untouched', async () => {
    interface Order { rows: Array<{ country: string, city: string }> }
    const form = createForm<Order>({
      // Cities start empty, so "reset to factory default" is observable.
      defaultValues: {
        rows: [{ country: 'cn', city: '' }, { country: 'us', city: '' }],
      },
      optionSources: {
        'rows.*.city': {
          deps: ['rows.*.country'],
          load: ({ get, path }) =>
            CITIES[get(path.replace(/\.city$/, '.country')) as string] ?? [],
        },
      },
    })
    await settle()
    form.setFieldValue('rows.0.city', 'shanghai')
    form.setFieldValue('rows.1.city', 'austin')
    await settle()

    form.setFieldValue('rows.0.country', 'us')
    await settle()

    // Row 0 is cleared and reloaded; row 1 keeps its value and its options.
    expect(form.values.rows.map(row => row.city)).toEqual(['', 'austin'])
    expect(form.getOptionsState('rows.0.city').items).toEqual(['austin'])
    expect(form.getOptionsState('rows.1.city').items).toEqual(['austin'])
  })

  it('expands wildcard patterns over array rows', async () => {
    interface Order { rows: Array<{ country: string, city: string }> }
    const form = createForm<Order>({
      defaultValues: { rows: [{ country: 'cn', city: '' }, { country: 'us', city: '' }] },
      optionSources: {
        'rows.*.city': {
          deps: ['rows.*.country'],
          load: ({ get, path, wildcards }) => {
            const row = wildcards[0]
            return [`${get(`rows.${row}.country`)}-${path.split('.')[1]}`]
          },
        },
      },
    })
    await settle()

    expect(form.getOptionsState('rows.0.city').items).toEqual(['cn-0'])
    expect(form.getOptionsState('rows.1.city').items).toEqual(['us-1'])
  })

  it('getOptionsState falls back to manual setOptions when no source is declared', () => {
    const form = createForm<Address>({ defaultValues: { ...defaults } })
    form.setOptions('country', ['cn'])
    expect(form.getOptionsState('country')).toEqual({
      items: ['cn'],
      loading: false,
      error: undefined,
      loaded: false,
    })
  })
})
