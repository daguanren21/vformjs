import { matchPathPrefix, pathMatchesPattern } from './vendor/shared'
import type {
  FieldOptionsState,
  FieldPath,
  OptionsLoadContext,
  OptionsSource,
} from './types'

/**
 * Stable identity for a cache key. Object keys are sorted so `{a,b}` and
 * `{b,a}` collapse to one entry; two fields with the same key share one
 * in-flight request instead of hitting the endpoint twice.
 */
export function hashOptionsKey(value: unknown): string {
  return JSON.stringify(value, (_key, val) => {
    if (val === null || typeof val !== 'object' || Array.isArray(val))
      return val
    const source = val as Record<string, unknown>
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(source).sort())
      sorted[key] = source[key]
    return sorted
  }) ?? 'undefined'
}


const IDLE: FieldOptionsState = Object.freeze({
  items: undefined,
  loading: false,
  error: undefined,
  loaded: false,
})

export interface OptionsEngineHost<T extends object> {
  values: () => Readonly<T>
  get: (path: FieldPath) => unknown
  /** Expand an authoring pattern (`rows.*.city`) against the live values. */
  expand: (pattern: FieldPath) => FieldPath[]
  /** Write resolved items so `getMeta(path).options` stays the single reader. */
  commit: (path: FieldPath, state: FieldOptionsState) => void
  /** Restore a field to its factory default after a dep change. */
  resetValue: (path: FieldPath) => void
  onError?: (error: unknown, path: FieldPath) => void
}

export interface OptionsEngine {
  /** Dep-driven refresh. Clears dependent values unless the source opts out. */
  refresh: (changed: FieldPath[]) => void
  /**
   * Re-evaluate every source without touching values. Used after
   * `setValues`/`reset`/`load`, where the incoming record is authoritative.
   */
  refreshAll: () => void
  /** Drop cached payloads and load again. */
  reload: (paths?: FieldPath[]) => void
  state: (path: FieldPath) => FieldOptionsState
  dispose: () => void
}

interface Entry {
  seq: number
  controller: AbortController | undefined
  state: FieldOptionsState
  key: string | undefined
}

export function createOptionsEngine<T extends object>(
  sources: Record<FieldPath, OptionsSource<T>>,
  host: OptionsEngineHost<T>,
): OptionsEngine {
  const patterns = Object.keys(sources)
  const entries = new Map<FieldPath, Entry>()
  const inflight = new Map<string, Promise<unknown>>()
  const resolved = new Map<string, unknown>()
  let disposed = false

  const entryOf = (path: FieldPath): Entry => {
    const existing = entries.get(path)
    if (existing)
      return existing
    const created: Entry = {
      seq: 0,
      controller: undefined,
      state: IDLE,
      key: undefined,
    }
    entries.set(path, created)
    return created
  }

  const publish = (path: FieldPath, next: FieldOptionsState) => {
    entryOf(path).state = next
    host.commit(path, next)
  }

  /** Segments a materialized path filled into the pattern's `*` slots. */
  const wildcardsFor = (
    path: FieldPath,
    pattern: FieldPath,
  ): string[] => {
    const patternParts = pattern.split('.')
    const pathParts = path.split('.')
    const wildcards: string[] = []
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] === '*' && pathParts[i] !== undefined)
        wildcards.push(pathParts[i]!)
    }
    return wildcards
  }

  const contextFor = (
    path: FieldPath,
    pattern: FieldPath,
    signal: AbortSignal,
  ): OptionsLoadContext<T> => ({
    values: host.values(),
    get: host.get,
    signal,
    path,
    wildcards: wildcardsFor(path, pattern),
  })

  /** `rows.*.country` + wildcards ['1'] -> `rows.1.country`. */
  const materializeDep = (
    dep: FieldPath,
    wildcards: ReadonlyArray<string>,
  ): FieldPath => {
    if (!dep.includes('*'))
      return dep
    let next = 0
    return dep
      .split('.')
      .map(segment => segment === '*' ? (wildcards[next++] ?? segment) : segment)
      .join('.')
  }

  const start = (path: FieldPath, pattern: FieldPath, force: boolean) => {
    if (disposed)
      return
    const source = sources[pattern]!
    const entry = entryOf(path)
    // Probe context: the signal is only meaningful once a request really starts.
    const probe = contextFor(path, pattern, new AbortController().signal)
    const rawKey = source.key
      ? source.key(probe.values, probe)
      // Keyed by the MATERIALIZED path and dep values so sibling array rows stay
      // distinct; two different fields collide only via an explicit `key`.
      : [
          path,
          (source.deps ?? []).map(dep =>
            host.get(materializeDep(dep, probe.wildcards)),
          ),
        ]
    const key = rawKey === null ? undefined : hashOptionsKey(rawKey)

    if (!force && key !== undefined && key === entry.key && entry.state.loaded)
      return

    entry.controller?.abort()
    const seq = ++entry.seq

    // `select` runs per field on the shared payload, so N selects can be fed by
    // one cached response without each re-slicing inside `load`.
    const project = (payload: unknown): unknown =>
      source.select ? source.select(payload, probe) : payload

    if (key !== undefined && resolved.has(key)) {
      entry.key = key
      publish(path, {
        items: project(resolved.get(key)),
        loading: false,
        error: undefined,
        loaded: true,
      })
      return
    }

    entry.key = key
    const controller = new AbortController()
    entry.controller = controller
    publish(path, {
      items: entry.state.items,
      loading: true,
      error: undefined,
      loaded: false,
    })

    const shared = key !== undefined ? inflight.get(key) : undefined
    const request = shared ?? (async () => {
      const context = contextFor(path, pattern, controller.signal)
      return await source.load(context)
    })()
    if (key !== undefined && !shared)
      inflight.set(key, request)

    void request.then(
      (payload) => {
        if (key !== undefined) {
          resolved.set(key, payload)
          inflight.delete(key)
        }
        if (disposed || entry.seq !== seq)
          return
        entry.controller = undefined
        publish(path, {
          items: project(payload),
          loading: false,
          error: undefined,
          loaded: true,
        })
      },
      (error: unknown) => {
        if (key !== undefined)
          inflight.delete(key)
        if (disposed || entry.seq !== seq)
          return
        entry.controller = undefined
        publish(path, {
          items: entry.state.items,
          loading: false,
          error,
          loaded: false,
        })
        host.onError?.(error, path)
      },
    )
  }

  interface VisitPlan {
    /** Coarse gate: could this source need reloading at all? */
    reload: (pattern: FieldPath, source: OptionsSource<T>) => boolean
    /**
     * Per materialized path: clear that field's own value. Evaluated per row, so
     * editing `rows.0.country` never clears `rows.1.city`.
     */
    resetPath?: (
      source: OptionsSource<T>,
      wildcards: ReadonlyArray<string>,
    ) => boolean
    force: boolean
  }

  const visit = (plan: VisitPlan) => {
    for (const pattern of patterns) {
      const source = sources[pattern]!
      const reload = plan.reload(pattern, source)
      for (const path of host.expand(pattern)) {
        // A path with no entry yet is a freshly materialized array row: it needs
        // its first load even when nothing it depends on changed. `lazy` still
        // opts out of automatic loads entirely.
        const fresh = !entries.has(path) && !source.lazy
        if (!reload && !fresh)
          continue
        const reset = !fresh
          && source.resetValue !== false
          && (plan.resetPath?.(source, wildcardsFor(path, pattern)) ?? false)
        if (reset)
          host.resetValue(path)
        start(path, pattern, plan.force)
      }
    }
  }

  /** Did `changed` name this dep, or something inside it? */
  const touchesDep = (dep: FieldPath, changed: ReadonlyArray<FieldPath>) =>
    changed.some(path =>
      path === dep
      || matchPathPrefix(path, dep)
      || pathMatchesPattern(path, dep),
    )

  return {
    refresh: (changed) => {
      if (!changed.length)
        return
      const wildcard = changed.includes('*')
      visit({
        reload: (_pattern, source) => {
          if (!source.deps?.length)
            return false
          if (wildcard)
            return true
          // A structural array change (`rows`) can shift dep values under it, so
          // reload — but that is not an edit to any row's dep, so do not reset.
          return source.deps.some(dep =>
            touchesDep(dep, changed) || changed.some(path => matchPathPrefix(dep, path)),
          )
        },
        resetPath: (source, wildcards) => {
          // A wildcard change means setValues/reset/load supplied the whole
          // record; the incoming values win, so never clear them here.
          if (wildcard || !source.deps?.length)
            return false
          return source.deps.some(dep =>
            touchesDep(materializeDep(dep, wildcards), changed),
          )
        },
        force: false,
      })
    },
    refreshAll: () => {
      // `lazy` opts out of creation-time and post-load fetches, not out of
      // dep-driven ones — a dep change still means the payload is stale.
      visit({ reload: (_pattern, source) => !source.lazy, force: false })
    },
    reload: (paths) => {
      if (!paths?.length) {
        resolved.clear()
        inflight.clear()
        visit({ reload: () => true, force: true })
        return
      }
      for (const path of paths) {
        const entry = entries.get(path)
        if (entry?.key !== undefined) {
          resolved.delete(entry.key)
          inflight.delete(entry.key)
        }
      }
      const wanted = new Set(paths)
      visit({
        reload: pattern => host.expand(pattern).some(path => wanted.has(path)),
        force: true,
      })
    },
    state: path => entries.get(path)?.state ?? IDLE,
    dispose: () => {
      disposed = true
      for (const entry of entries.values())
        entry.controller?.abort()
      entries.clear()
      inflight.clear()
      resolved.clear()
    },
  }
}
