export type PathSegment = string | number

type AtomicPathValue =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined
  | Date
  | RegExp
  | Function
  | ReadonlyMap<unknown, unknown>
  | ReadonlySet<unknown>

type JoinPath<
  Head extends string | number,
  Tail,
> = Tail extends string ? `${Head}.${Tail}` : never

type NestedFieldPath<
  T,
  Depth extends readonly unknown[] = [],
> = Depth['length'] extends 6
  ? never
  : T extends AtomicPathValue
    ? never
    : T extends readonly (infer Item)[]
      ? `${number}` | JoinPath<number, NestedFieldPath<Item, [...Depth, unknown]>>
      : T extends object
        ? {
            [Key in Extract<keyof T, string | number>]:
              | `${Key}`
              | JoinPath<Key, NestedFieldPath<T[Key], [...Depth, unknown]>>
          }[Extract<keyof T, string | number>]
        : never

/** Type-checked dotted paths, bounded to six nested levels. */
export type TypedFieldPath<T> = Extract<NestedFieldPath<T>, string>

type FieldSegmentValue<T, Segment extends string> =
  T extends null | undefined
    ? undefined
    : T extends readonly (infer Item)[]
      ? Segment extends `${number}` ? Item : never
      : Segment extends keyof T ? T[Segment] : never

/** Value type resolved from a type-checked dotted path. */
export type TypedFieldValue<
  T,
  Path extends string,
> = Path extends `${infer Head}.${infer Tail}`
  ? TypedFieldValue<FieldSegmentValue<T, Head>, Tail>
  : FieldSegmentValue<T, Path>

/** Split `a.b.0.c` into segments. Empty string → []. */
export function toPath(path: string | PathSegment[]): PathSegment[] {
  if (Array.isArray(path))
    return path
  if (!path)
    return []
  return path.split('.').map((seg) => {
    if (seg !== '' && !Number.isNaN(Number(seg)) && String(Number(seg)) === seg)
      return Number(seg)
    return seg
  })
}

/** Join segments into a dotted path. */
export function fieldPath(...segments: PathSegment[]): string {
  return segments.map(String).join('.')
}

/** Create an identity helper that checks dotted paths against a model type. */
export function createFieldPath<T extends object>() {
  return <Path extends TypedFieldPath<T>>(path: Path): Path => path
}

export function isObjectLike(value: unknown): value is Record<string | number, unknown> {
  return value !== null && typeof value === 'object'
}

export function getByPath<T = unknown>(source: unknown, path: string | PathSegment[]): T | undefined {
  const segs = toPath(path)
  let cur: unknown = source
  for (const seg of segs) {
    if (cur == null || !isObjectLike(cur))
      return undefined
    cur = cur[seg as keyof typeof cur]
  }
  return cur as T | undefined
}

export function setByPath(target: unknown, path: string | PathSegment[], value: unknown): void {
  const segs = toPath(path)
  if (!segs.length)
    return
  if (!isObjectLike(target))
    throw new Error('[vformjs] setByPath root must be an object')

  let cur: Record<string | number, unknown> = target
  for (let i = 0; i < segs.length - 1; i++) {
    const seg = segs[i]!
    const next = segs[i + 1]
    let child = cur[seg as keyof typeof cur]
    if (!isObjectLike(child)) {
      child = typeof next === 'number' ? [] : {}
      cur[seg as keyof typeof cur] = child
    }
    cur = child as Record<string | number, unknown>
  }
  const last = segs[segs.length - 1]!
  cur[last as keyof typeof cur] = value
}

export function deleteByPath(target: unknown, path: string | PathSegment[]): void {
  const segs = toPath(path)
  if (!segs.length)
    return
  if (!isObjectLike(target))
    return

  let cur: Record<string | number, unknown> = target
  for (let i = 0; i < segs.length - 1; i++) {
    const seg = segs[i]!
    const child = cur[seg as keyof typeof cur]
    if (!isObjectLike(child))
      return
    cur = child as Record<string | number, unknown>
  }
  const last = segs[segs.length - 1]!
  if (Array.isArray(cur) && typeof last === 'number') {
    cur.splice(last, 1)
    return
  }
  delete cur[last as keyof typeof cur]
}

/** Whether `path` is exactly `prefix` or nested under it (`prefix.*`). */
export function matchPathPrefix(path: string, prefix: string): boolean {
  if (!prefix)
    return true
  return path === prefix || path.startsWith(`${prefix}.`)
}

/** Expand a path pattern with `*` segments against concrete path (simple equality for non-*). */
export function pathMatchesPattern(path: string, pattern: string): boolean {
  if (pattern === '*' || pattern === '**')
    return true
  const pathSegs = path.split('.')
  const patSegs = pattern.split('.')
  if (pathSegs.length !== patSegs.length)
    return false
  for (let i = 0; i < patSegs.length; i++) {
    if (patSegs[i] === '*')
      continue
    if (patSegs[i] !== pathSegs[i])
      return false
  }
  return true
}
