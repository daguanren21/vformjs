import {
  matchPathPrefix,
  pathMatchesPattern,
} from './vendor/shared'
import type {
  FieldPath,
  LinkageCtx,
  LinkageRule,
} from './types'

export interface LinkageEngineOptions<T extends Record<string, unknown>> {
  rules: LinkageRule<T>[]
  createCtx: () => LinkageCtx<T>
  onError?: (error: unknown, ruleIndex: number) => void
}

function depsMatch(deps: FieldPath[] | '*', changed: FieldPath[]): boolean {
  if (deps === '*')
    return true
  for (const dep of deps) {
    for (const path of changed) {
      if (
        path === dep
        || matchPathPrefix(path, dep)
        || matchPathPrefix(dep, path)
        || pathMatchesPattern(path, dep)
      ) {
        return true
      }
    }
  }
  return false
}

/**
 * Detect simple self-cycles in declared deps graphs.
 * Nodes are field paths appearing as deps; edges deps → fields written are unknown
 * statically, so we only flag identical dep lists that re-trigger unbounded — here
 * we detect duplicate rule indices that list each other as sole deps when paths equal.
 * Practical check: if any dep path equals another rule's sole write target is not
 * available; we validate that deps arrays don't contain a path twice with self-loop
 * pattern `deps: ['a']` repeatedly scheduling without generation guard — runtime
 * generation handles storms. Dev helper: throw when deps include empty string.
 */
export function assertLinkageRules<T extends Record<string, unknown>>(
  rules: LinkageRule<T>[],
): void {
  rules.forEach((rule, index) => {
    if (rule.deps !== '*' && (!Array.isArray(rule.deps) || rule.deps.length === 0)) {
      throw new Error(
        `[vformjs] linkage[${index}] deps must be non-empty array or '*'`,
      )
    }
    if (Array.isArray(rule.deps)) {
      for (const d of rule.deps) {
        if (!d) {
          throw new Error(
            `[vformjs] linkage[${index}] contains empty dep path`,
          )
        }
      }
    }
  })
}

export function createLinkageEngine<T extends Record<string, unknown>>(
  options: LinkageEngineOptions<T>,
): LinkageEngine {
  assertLinkageRules(options.rules)
  let generation = 0
  let queue: FieldPath[] | null = null
  let scheduled = false
  let running = false

  const flush = async () => {
    scheduled = false
    if (!queue || queue.length === 0) {
      queue = null
      return
    }
    const changed = queue
    queue = null
    const gen = ++generation
    running = true
    try {
      for (let i = 0; i < options.rules.length; i++) {
        if (gen !== generation)
          return
        const rule = options.rules[i]!
        const when = rule.when ?? 'deps'
        if (when === 'init')
          continue
        const shouldRun
          = when === 'any'
            ? true
            : depsMatch(rule.deps, changed)
        if (!shouldRun)
          continue
        try {
          const result = rule.run(options.createCtx())
          if (result && typeof (result as Promise<void>).then === 'function')
            await result
        }
        catch (error) {
          options.onError?.(error, i)
        }
        if (gen !== generation)
          return
      }
    }
    finally {
      running = false
    }
  }

  const schedule = (changed: FieldPath[]) => {
    if (!changed.length)
      return
    if (!queue)
      queue = []
    for (const p of changed) {
      if (!queue.includes(p))
        queue.push(p)
    }
    if (!scheduled) {
      scheduled = true
      queueMicrotask(() => {
        void flush()
      })
    }
  }

  const runInit = async () => {
    const gen = ++generation
    for (let i = 0; i < options.rules.length; i++) {
      if (gen !== generation)
        return
      const rule = options.rules[i]!
      const when = rule.when ?? 'deps'
      // init rules + deps rules on bootstrap
      if (when === 'any')
        continue
      try {
        const result = rule.run(options.createCtx())
        if (result && typeof (result as Promise<void>).then === 'function')
          await result
      }
      catch (error) {
        options.onError?.(error, i)
      }
    }
  }

  return {
    schedule,
    runInit,
    isRunning: () => running,
    /** Invalidate in-flight async linkage. */
    bumpGeneration: () => {
      generation += 1
    },
  }
}

export interface LinkageEngine {
  schedule: (changed: FieldPath[]) => void
  runInit: () => Promise<void>
  isRunning: () => boolean
  bumpGeneration: () => void
}
