import type { StandardSchemaV1 } from '@standard-schema/spec'
import type {
  FieldPath,
  FormErrors,
  FormResolver,
} from '@vformjs/core'
export type AnySchema = StandardSchemaV1<object, object>
export type SchemaInput<S extends AnySchema> =
  Extract<StandardSchemaV1.InferInput<S>, object>
export type SchemaOutput<S extends AnySchema> =
  Extract<StandardSchemaV1.InferOutput<S>, object>

export interface CreateSchemaResolverOptions {
  /** Maps pathless or unsupported-path issues to this form path. */
  fallbackPath?: FieldPath | (() => FieldPath | undefined)
  /** Forwarded through the Standard Schema validation options. */
  libraryOptions?: Record<string, unknown>
}

function pathsOverlap(left: FieldPath, right: FieldPath): boolean {
  return left === right
    || left.startsWith(`${right}.`)
    || right.startsWith(`${left}.`)
}

function issuePath(issue: StandardSchemaV1.Issue): FieldPath | undefined {
  if (!issue.path?.length)
    return undefined

  const parts: string[] = []
  for (const segment of issue.path) {
    const key = typeof segment === 'object' && segment !== null && 'key' in segment
      ? segment.key
      : segment
    if (typeof key === 'symbol')
      return undefined
    parts.push(String(key))
  }
  return parts.join('.')
}

function safeErrorPath(path: FieldPath | undefined, fallback: FieldPath): FieldPath {
  const target = path ?? fallback
  if (target === '__proto__' || target === 'prototype' || target === 'constructor')
    return '_form'
  return target
}

export function schemaIssuesToFormErrors(
  issues: ReadonlyArray<StandardSchemaV1.Issue>,
  fallbackPath: FieldPath = '_form',
): FormErrors {
  const errors: FormErrors = {}
  for (const issue of issues) {
    const path = safeErrorPath(issuePath(issue), fallbackPath)
    const messages = Object.hasOwn(errors, path)
      ? errors[path]!
      : (errors[path] = [])
    messages.push(issue.message)
  }
  return errors
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

/** Build a resolver for any Standard Schema-compatible object schema. */
export function createSchemaResolver<S extends AnySchema>(
  schema: S,
  options: CreateSchemaResolverOptions = {},
): FormResolver<SchemaInput<S>, SchemaOutput<S>> {
  return async (values, context) => {
    const result = await schema['~standard'].validate(
      values,
      options.libraryOptions === undefined
        ? undefined
        : { libraryOptions: options.libraryOptions },
    )

    if (!result.issues)
      return { ok: true, values: result.value as SchemaOutput<S> }

    const configuredFallback = typeof options.fallbackPath === 'function'
      ? options.fallbackPath()
      : options.fallbackPath
    const errors = schemaIssuesToFormErrors(
      result.issues,
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
