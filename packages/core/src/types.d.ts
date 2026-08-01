import type { DeepPartial } from './vendor/shared';
/** Dotted field path, e.g. `profile.email` or `domains.0.value`. */
export type FieldPath = string;
export type FormErrors = Record<string, string[]>;
export type FormResult<T> = {
    ok: true;
    values: T;
    errors?: undefined;
} | {
    ok: false;
    values: T;
    errors: FormErrors;
};
export interface FieldMeta {
    hidden: boolean;
    disabled: boolean;
    options?: unknown;
    /** Extra bag for adapters / renderers. */
    extra?: Record<string, unknown>;
}
export type RuleItem = Record<string, unknown>;
export type RuleInput = RuleItem | RuleItem[] | string | string[] | null | undefined;
/** Normalized map used at runtime after sugar expansion. */
export type FormRulesMap = Record<string, RuleItem[]>;
/**
 * Authoring-time rules: values may be RuleItem, string sugar (`'required'`), or arrays of either.
 * Normalized to FormRulesMap via normalizeRulesMap.
 */
export type FormRulesInput = Record<string, RuleInput>;
export interface HostValidateResult {
    valid: boolean;
    errors?: FormErrors;
}
/**
 * Host form bridge. Official adapters cover element-ui / element-plus;
 * other UI libraries implement this interface themselves.
 */
export interface FormHostAdapter {
    bind?: (instance: unknown) => void;
    validate: (paths?: FieldPath[]) => Promise<HostValidateResult>;
    clearValidate?: (paths?: FieldPath[]) => void;
    scrollToField?: (path: FieldPath) => void;
    afterModelReset?: () => void;
}
export type GetValuesMode = 'keep' | 'omit';
export interface LinkageCtx<T extends Record<string, unknown>> {
    get: (path: FieldPath) => unknown;
    values: Readonly<T>;
    set: (path: FieldPath, value: unknown) => void;
    patch: (partial: DeepPartial<T>) => void;
    setHidden: (path: FieldPath, hidden: boolean) => void;
    setDisabled: (path: FieldPath, disabled: boolean) => void;
    setFieldRules: (path: FieldPath, rules: RuleInput) => void;
    setOptions: (path: FieldPath, options: unknown) => void;
    clearValidate: (paths?: FieldPath | FieldPath[]) => void;
    getMeta: (path: FieldPath) => FieldMeta;
}
export interface LinkageRule<T extends Record<string, unknown>> {
    /** Dependency paths; `'*'` listens to every change. Supports `a.*.b` patterns. */
    deps: FieldPath[] | '*';
    when?: 'deps' | 'any' | 'init';
    run: (ctx: LinkageCtx<T>) => void | Promise<void>;
}
export type RulesSource<T extends Record<string, unknown>> = FormRulesInput | ((values: T) => FormRulesInput);
export interface CreateFormOptions<T extends Record<string, unknown>> {
    defaultValues: T | (() => T);
    /**
     * Wrap the live model (e.g. Vue `reactive`).
     * Receives a deep clone of defaultValues; return value becomes form.model.
     */
    createState?: (initial: T) => T;
    rules?: RulesSource<T>;
    /**
     * Declarative show/hide. Key = field path, value = predicate of full values.
     * Hidden fields drop rules automatically and clear validation.
     */
    when?: Record<string, (values: T) => boolean>;
    /**
     * Conditional rules. Key = field path, value returns rules or null to clear.
     * Re-evaluated when values change (via notifyChange / setFieldValue).
     */
    whenRules?: Record<string, (values: T) => RuleInput>;
    linkage?: LinkageRule<T>[];
    adapter?: FormHostAdapter;
    /**
     * When true, validate/submit throw on invalid.
     * Default false — invalid returns `{ ok: false }`.
     */
    throwOnInvalid?: boolean;
    /** Omit hidden fields from getValues / submit snapshot. Default keep. */
    hiddenValues?: GetValuesMode;
    /** Trim top-level string fields on successful validate/submit. */
    trimOnSuccess?: boolean;
    onSubmit?: (values: T, ctx: {
        form: FormApi<T>;
    }) => void | Promise<void>;
    onInvalid?: (errors: FormErrors, ctx: {
        form: FormApi<T>;
    }) => void;
}
export interface FieldArrayApi<TItem extends Record<string, unknown> = Record<string, unknown>> {
    fields: ReadonlyArray<{
        key: string;
        index: number;
    }>;
    append: (item?: Partial<TItem> | TItem) => void;
    prepend: (item?: Partial<TItem> | TItem) => void;
    insert: (index: number, item?: Partial<TItem> | TItem) => void;
    remove: (index: number | number[]) => void;
    move: (from: number, to: number) => void;
    replace: (index: number, item: TItem) => void;
    update: (index: number, partial: Partial<TItem>) => void;
    clear: () => void;
}
export interface FormApi<T extends Record<string, unknown>> {
    /** Mutable model root (same object identity for the form lifetime). */
    readonly values: T;
    /** Alias for values — Element `:model` binding. */
    readonly model: T;
    /** True when live values differ from the current reset baseline. */
    readonly dirty: boolean;
    /** Dotted leaf paths that differ from the current reset baseline. */
    readonly changedPaths: ReadonlyArray<FieldPath>;
    getValues: (opts?: {
        hidden?: GetValuesMode;
    }) => T;
    setValues: (partial: DeepPartial<T>, opts?: {
        merge?: boolean;
    }) => void;
    setFieldValue: (path: FieldPath, value: unknown) => void;
    getFieldValue: <V = unknown>(path: FieldPath) => V | undefined;
    reset: (paths?: FieldPath | FieldPath[]) => void;
    rebaseDefaults: (values?: T) => void;
    /** Original factory defaults (never mutated by edit rebase). */
    getCreateDefaults: () => T;
    /** Restore model + baseline to factory defaults (create mode). */
    resetToCreateDefaults: () => void;
    getRules: () => FormRulesMap;
    setRules: (rules: RulesSource<T>) => void;
    /** Pass `null` to clear field rules; pass `undefined` to drop override and restore base `rules`. */
    setFieldRules: (path: FieldPath, rules: RuleInput) => void;
    getMeta: (path: FieldPath) => FieldMeta;
    setHidden: (path: FieldPath, hidden: boolean) => void;
    setDisabled: (path: FieldPath, disabled: boolean) => void;
    setOptions: (path: FieldPath, options: unknown) => void;
    getErrors: () => FormErrors;
    setFieldError: (path: FieldPath, messages: string | string[]) => void;
    /** Replace the complete core error map (for example, API field errors). */
    setErrors: (errors: FormErrors) => void;
    /** Scroll the bound host to the first field error and return its path. */
    scrollToFirstError: () => FieldPath | undefined;
    clearErrors: (paths?: FieldPath | FieldPath[]) => void;
    clearValidate: (paths?: FieldPath | FieldPath[]) => void;
    validate: (paths?: FieldPath | FieldPath[]) => Promise<FormResult<T>>;
    /** Same as validate(paths) — field/partial validation */
    validateField: (paths?: FieldPath | FieldPath[]) => Promise<FormResult<T>>;
    submit: (handler?: (values: T) => void | Promise<void>) => Promise<FormResult<T>>;
    fieldArray: <TItem extends Record<string, unknown> = Record<string, unknown>>(path: FieldPath, opts?: {
        defaultItem?: () => TItem;
        keyName?: string;
    }) => FieldArrayApi<TItem>;
    bindAdapter: (adapter: FormHostAdapter) => void;
    bindHost: (instance: unknown) => void;
    /** Subscribe to value/meta/rules changes. Returns unsubscribe. */
    subscribe: (listener: (event: FormEvent) => void) => () => void;
    /**
     * Notify that model paths changed outside setFieldValue
     * (e.g. direct v-model mutation). Triggers linkage.
     */
    notifyChange: (paths?: FieldPath | FieldPath[]) => void;
    /** Props for host form: `{ model, rules }`. */
    getFormProps: () => {
        model: T;
        rules: FormRulesMap;
    };
    readonly submitting: boolean;
}
export type FormEvent = {
    type: 'values';
    paths: FieldPath[];
} | {
    type: 'meta';
    path: FieldPath;
} | {
    type: 'rules';
} | {
    type: 'errors';
} | {
    type: 'dirty';
} | {
    type: 'reset';
} | {
    type: 'submit-start' | 'submit-end';
};
