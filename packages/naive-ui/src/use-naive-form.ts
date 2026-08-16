import type {
  UseApplicationFormOptions,
  UseApplicationFormReturn,
} from '@vformjs/vue'
import { useApplicationForm } from '@vformjs/vue'
import { createNaiveAdapter } from './create-adapter'

export type UseNaiveFormOptions<
  T extends object,
  TSubmitError = never,
> = Omit<
  UseApplicationFormOptions<T, TSubmitError>,
  'defaultValues' | 'adapter'
> & {
  defaults: T | (() => T)
}

/** Naive UI application form with one flat lifecycle and capability API. */
export function useNaiveForm<
  T extends object,
  TSubmitError = never,
>(
  options: UseNaiveFormOptions<T, TSubmitError>,
): UseApplicationFormReturn<T, TSubmitError> {
  const { defaults, ...rest } = options
  return useApplicationForm({
    ...rest,
    defaultValues: defaults,
    adapter: createNaiveAdapter(),
  })
}
