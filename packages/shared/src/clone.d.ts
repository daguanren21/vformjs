export declare function deepClone<T>(value: T): T;
export type DeepPartial<T> = {
    [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};
/** Deep-merge `patch` into `target` in place. Arrays are replaced, not merged by index. */
export declare function deepMerge<T extends Record<string, unknown>>(target: T, patch: DeepPartial<T>): T;
/**
 * Restore `target` to the shape/value of `baseline` in place:
 * - nested objects merged recursively
 * - arrays replaced
 * - extra keys on target deleted
 */
export declare function restoreInPlace<T extends Record<string, unknown>>(target: T, baseline: T): T;
