export type PathSegment = string | number;
/** Split `a.b.0.c` into segments. Empty string → []. */
export declare function toPath(path: string | PathSegment[]): PathSegment[];
/** Join segments into a dotted path. */
export declare function fieldPath(...segments: PathSegment[]): string;
export declare function isObjectLike(value: unknown): value is Record<string | number, unknown>;
export declare function getByPath<T = unknown>(source: unknown, path: string | PathSegment[]): T | undefined;
export declare function setByPath(target: unknown, path: string | PathSegment[], value: unknown): void;
export declare function deleteByPath(target: unknown, path: string | PathSegment[]): void;
/** Whether `path` is exactly `prefix` or nested under it (`prefix.*`). */
export declare function matchPathPrefix(path: string, prefix: string): boolean;
/** Expand a path pattern with `*` segments against concrete path (simple equality for non-*). */
export declare function pathMatchesPattern(path: string, pattern: string): boolean;
