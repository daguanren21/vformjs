import type {
  UseApplicationFormOptions,
  UseApplicationFormReturn,
} from '@vformjs/vue'
import { useApplicationForm } from '@vformjs/vue'
import { createAntdAdapter } from './create-adapter'

export type UseAntdFormOptions<
  T extends object,
  TSubmitError = never,
> = Omit<
  UseApplicationFormOptions<T, TSubmitError>,
  'defaultValues' | 'adapter'
> & {
  defaults: T | (() => T)
}

/** Ant Design Vue form with one flat lifecycle and capability API. */
export function useAntdForm<
  T extends object,
  TSubmitError = never,
>(
  options: UseAntdFormOptions<T, TSubmitError>,
): UseApplicationFormReturn<T, TSubmitError> {
  const { defaults, ...rest } = options
  return useApplicationForm({
    ...rest,
    defaultValues: defaults,
    adapter: createAntdAdapter(),
  })
}
