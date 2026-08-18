import type { FieldPath, FormApi, SubmitHandlerResult } from '@vformjs/core'
import type {
  UseApplicationFormOptions,
  UseApplicationFormReturn,
} from '@vformjs/vue'
import { useApplicationForm } from '@vformjs/vue'
import type { AnySchema, SchemaInput, SchemaOutput } from './resolver'
import { createSchemaResolver } from './resolver'

export interface UseSchemaFormOptions<
  S extends AnySchema,
  TSubmitError = never,
> extends Omit<
  UseApplicationFormOptions<SchemaInput<S>, TSubmitError, SchemaOutput<S>>,
  'defaultValues' | 'onSubmit' | 'resolver'
> {
  schema: S
  defaults: SchemaInput<S> | (() => SchemaInput<S>)
  fallbackPath?: FieldPath
  libraryOptions?: Record<string, unknown>
  onSubmit?: (
    values: SchemaOutput<S>,
    context: {
      form: FormApi<SchemaInput<S>, TSubmitError, SchemaOutput<S>>
    },
  ) => SubmitHandlerResult<TSubmitError>
}

export type UseSchemaFormReturn<
  S extends AnySchema,
  TSubmitError = never,
> = UseApplicationFormReturn<
  SchemaInput<S>,
  TSubmitError,
  SchemaOutput<S>
> & {
  schema: S
}

/** Standard Schema form with inferred input and transformed submit output. */
export function useSchemaForm<
  S extends AnySchema,
  TSubmitError = never,
>(
  options: UseSchemaFormOptions<S, TSubmitError>,
): UseSchemaFormReturn<S, TSubmitError> {
  const {
    schema,
    defaults,
    fallbackPath,
    libraryOptions,
    ...formOptions
  } = options
  if (defaults == null) {
    throw new Error(
      '[vformjs/schema] `defaults` is required. '
      + 'Pass initial values matching the schema input type.',
    )
  }

  const defaultValues = typeof defaults === 'function'
    ? (defaults as () => SchemaInput<S>)()
    : defaults
  const resolver = createSchemaResolver(schema, {
    ...(fallbackPath === undefined ? {} : { fallbackPath }),
    ...(libraryOptions === undefined ? {} : { libraryOptions }),
  })
  const form = useApplicationForm<SchemaInput<S>, TSubmitError, SchemaOutput<S>>({
    ...formOptions,
    defaultValues,
    resolver,
  })

  return Object.assign(form, { schema }) as UseSchemaFormReturn<S, TSubmitError>
}
