import type {
  AnySchema,
  UseSchemaFormOptions,
  UseSchemaFormReturn,
} from '@vformjs/schema'
import { useSchemaForm as useSchemaFormBase } from '@vformjs/schema'
import { createNaiveAdapter } from './create-adapter'

/** Standard Schema + Naive UI with inferred input and output types. */
export function useSchemaForm<
  S extends AnySchema,
  TSubmitError = never,
>(
  options: Omit<UseSchemaFormOptions<S, TSubmitError>, 'adapter'>,
): UseSchemaFormReturn<S, TSubmitError> {
  return useSchemaFormBase({
    ...options,
    adapter: createNaiveAdapter(),
  })
}

export type {
  UseSchemaFormOptions,
  UseSchemaFormReturn,
} from '@vformjs/schema'
