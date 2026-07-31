import { createForm, type CreateFormOptions, type FieldArrayApi, type FieldPath, type FormApi, type FormResult, type FormRulesMap, type LinkageRule } from '@vformjs/core';
import type { ComputedRef } from 'vue-demi';
/** Unified form modes: create / edit / detail all share useForm. */
export type FormMode = 'create' | 'edit' | 'detail';
/**
 * Runtime shape after `reactive()` unwrap. Docs/examples use:
 * `form.mode === 'edit'`, `form.submitting` as boolean.
 */
export interface UseFormReturn<T extends Record<string, unknown>> {
    model: T;
    rules: FormRulesMap;
    formProps: {
        model: T;
        rules: FormRulesMap;
    };
    /**
     * Bind host form in one shot:
     * `<el-form v-bind="form.el" />`
     */
    el: {
        ref: (instance: unknown) => void;
        model: T;
        rules: FormRulesMap;
    };
    formRef: unknown;
    submitting: boolean;
    /** create | edit | detail */
    mode: FormMode;
    /** detail => true */
    readonly: boolean;
    /** create | edit => true */
    editable: boolean;
    setMode: (mode: FormMode) => void;
    /**
     * Load form state for create / edit / detail.
     * Call this **inside the dialog component or page**, not from the list page.
     *
     * - create: `form.load('create')`
     * - edit:   `form.load('edit', detail)`
     * - detail: `form.load('detail', detail)`
     */
    load: (mode: FormMode, values?: Partial<T>) => void;
    submit: FormApi<T>['submit'];
    validate: FormApi<T>['validate'];
    validateField: FormApi<T>['validateField'];
    reset: FormApi<T>['reset'];
    setFieldValue: FormApi<T>['setFieldValue'];
    getFieldValue: FormApi<T>['getFieldValue'];
    setValues: FormApi<T>['setValues'];
    getValues: FormApi<T>['getValues'];
    clearValidate: FormApi<T>['clearValidate'];
    notifyChange: FormApi<T>['notifyChange'];
    rebaseDefaults: FormApi<T>['rebaseDefaults'];
    bindHost: (instance?: unknown) => void;
    getMeta: FormApi<T>['getMeta'];
    fieldArray: FormApi<T>['fieldArray'];
    hidden: (path: FieldPath) => ComputedRef<boolean>;
    list: <TItem extends Record<string, unknown> = Record<string, unknown>>(path: FieldPath, opts?: {
        defaultItem?: () => TItem;
        keyName?: string;
    }) => Omit<FieldArrayApi<TItem>, 'fields'> & {
        fields: ComputedRef<ReadonlyArray<{
            key: string;
            index: number;
        }>>;
    };
    raw: FormApi<T>;
}
/** Diff two snapshots and return dotted paths that changed. */
export declare function diffChangedPaths(prev: unknown, next: unknown, base?: string, out?: string[], depth?: number): string[];
export type UseFormOptions<T extends Record<string, unknown>> = CreateFormOptions<T> & {
    /** Initial mode. Default create. */
    mode?: FormMode;
};
export declare function useForm<T extends Record<string, unknown>>(options: UseFormOptions<T>): UseFormReturn<T>;
export { createForm };
export type { CreateFormOptions, FormApi, FormResult, FieldArrayApi, LinkageRule, };
