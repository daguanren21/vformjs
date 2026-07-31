import type { FieldPath, LinkageCtx, LinkageRule } from './types';
export interface LinkageEngineOptions<T extends Record<string, unknown>> {
    rules: LinkageRule<T>[];
    createCtx: () => LinkageCtx<T>;
    onError?: (error: unknown, ruleIndex: number) => void;
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
export declare function assertLinkageRules<T extends Record<string, unknown>>(rules: LinkageRule<T>[]): void;
export declare function createLinkageEngine<T extends Record<string, unknown>>(options: LinkageEngineOptions<T>): LinkageEngine;
export interface LinkageEngine {
    schedule: (changed: FieldPath[]) => void;
    runInit: () => Promise<void>;
    isRunning: () => boolean;
    bumpGeneration: () => void;
}
