import type { FieldArrayApi, FieldPath } from './types';
export interface FieldArrayOptions<TItem extends Record<string, unknown>> {
    defaultItem?: () => TItem;
    keyName?: string;
}
export interface FieldArrayHost<T extends Record<string, unknown>> {
    values: T;
    notifyValues: (paths: FieldPath[]) => void;
    clearValidate: (paths?: FieldPath | FieldPath[]) => void;
    runLinkage: (changed: FieldPath[]) => void;
}
export declare function createFieldArray<T extends Record<string, unknown>, TItem extends Record<string, unknown> = Record<string, unknown>>(form: FieldArrayHost<T>, path: FieldPath, opts?: FieldArrayOptions<TItem>): FieldArrayApi<TItem>;
