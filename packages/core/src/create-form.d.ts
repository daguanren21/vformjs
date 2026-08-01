import type { CreateFormOptions, FieldPath, FormApi } from './types';
/** Diff two form snapshots and return changed dotted leaf paths. */
export declare function diffChangedPaths(previous: unknown, next: unknown, base?: string, out?: FieldPath[]): FieldPath[];
export declare function createForm<T extends Record<string, unknown>>(options: CreateFormOptions<T>): FormApi<T>;
