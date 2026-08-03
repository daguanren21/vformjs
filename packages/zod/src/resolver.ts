import type {
  FieldPath,
  FormErrors,
  FormResolver,
} from '@vformjs/core'
import type { z, ZodType } from 'zod'
import type { SharedZodParser } from './to-rules'
import { zodIssuesToFormErrors } from './to-rules'

type ZodInput<S extends ZodType> = z.input<S> & Record<string, unknown>
type ZodOutput<S extends ZodType> = z.output<S> & Record<string, unknown>

export interface CreateZodResolverOptions {
  /** Maps schema-level issues to a concrete field when possible. */
  fallbackPath?: FieldPath | (() => FieldPath | undefined)
  /** Shared with generated host rules so one validation wave parses once. */
  parser?: SharedZodParser
}

function pathsOverlap(left: FieldPath, right: FieldPath): boolean {
  return left === right
    || left.startsWith(`${right}.`)
    || right.startsWith(`${left}.`)
}

function pickErrorsForPaths(
  errors: FormErrors,
  paths: ReadonlyArray<FieldPath>,
): FormErrors {
  const picked: FormErrors = {}
  for (const [path, messages] of Object.entries(errors)) {
    if (path !== '_form' && paths.some(target => pathsOverlap(path, target)))
      picked[path] = [...messages]
  }
  return picked
}

/** Build the single schema resolver used by core validate/submit. */
export function createZodResolver<
  S extends ZodType<Record<string, unknown>>,
>(
  schema: S,
  options: CreateZodResolverOptions = {},
): FormResolver<ZodInput<S>, ZodOutput<S>> {
  return async (values, context) => {
    const parsed = options.parser
      ? await options.parser.parse(values)
      : await schema.safeParseAsync(values)

    if (parsed.success)
      return { ok: true, values: parsed.data as ZodOutput<S> }

    const configuredFallback = typeof options.fallbackPath === 'function'
      ? options.fallbackPath()
      : options.fallbackPath
    const errors = zodIssuesToFormErrors(
      parsed.error,
      configuredFallback ?? '_form',
    )

    if (!context.paths)
      return { ok: false, values, errors }

    const selectedErrors = pickErrorsForPaths(errors, context.paths)
    if (!Object.keys(selectedErrors).length)
      return { ok: true, values }

    return { ok: false, values, errors: selectedErrors }
  }
}
