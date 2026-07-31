import type { CreateFormOptions, FormApi } from './types';
export declare function createForm<T extends Record<string, unknown>>(options: CreateFormOptions<T>): FormApi<T>;
