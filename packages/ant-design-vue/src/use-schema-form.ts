import type {
  AnySchema,
  UseSchemaFormOptions,
  UseSchemaFormReturn,
} from '@vformjs/schema'
import { useSchemaForm as useSchemaFormBase } from '@vformjs/schema'
import { createAntdAdapter } from './create-adapter'

/** Standard Schema + Ant Design Vue with inferred input and output types. */
export function useSchemaForm<
  S extends AnySchema,
  TSubmitError = never,
>(
  options: Omit<UseSchemaFormOptions<S, TSubmitError>, 'adapter'>,
): UseSchemaFormReturn<S, TSubmitError> {
  return useSchemaFormBase({
    ...options,
    adapter: createAntdAdapter(),
  })
}

export type {
  UseSchemaFormOptions,
  UseSchemaFormReturn,
} from '@vformjs/schema'
