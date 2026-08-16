import type {
  UseApplicationFormOptions,
  UseApplicationFormReturn,
} from '@vformjs/vue'
import { useApplicationForm } from '@vformjs/vue'
import { createElementUiAdapter } from './create-adapter'

export type UseElFormOptions<
  T extends object,
  TSubmitError = never,
> = Omit<
  UseApplicationFormOptions<T, TSubmitError>,
  'defaultValues' | 'adapter'
> & {
  defaults: T | (() => T)
}

/** element-ui application form with one flat lifecycle and capability API. */
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
    adapter: createElementUiAdapter(),
  })
}
