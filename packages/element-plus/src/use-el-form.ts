import type {
  UseApplicationFormOptions,
  UseApplicationFormReturn,
} from '@vformjs/vue'
import { useApplicationForm } from '@vformjs/vue'
import { createElementPlusAdapter } from './create-adapter'

export type UseElFormOptions<
  T extends object,
  TSubmitError = never,
> = Omit<
  UseApplicationFormOptions<T, TSubmitError>,
  'defaultValues' | 'adapter'
> & {
  /** Initial values and the primary source for model inference. */
  defaults: T | (() => T)
}

/** Element Plus application form with one flat lifecycle and capability API. */
export function useElForm<
  T extends object,
  TSubmitError = never,
>(
  options: UseElFormOptions<T, TSubmitError>,
): UseApplicationFormReturn<T, TSubmitError> {
  const { defaults, ...rest } = options
  return useApplicationForm({
    ...rest,
    defaultValues: defaults,
    adapter: createElementPlusAdapter(),
  })
}
