import type { FieldPath, FormErrors, FormHostAdapter, HostValidateResult } from './types';
export interface AdapterValidateContext {
    /** Partial validate paths from form.validate(['a','b']). Empty = whole form. */
    paths?: FieldPath[];
}
export interface DefineAdapterOptions<THost = unknown> {
    /**
     * Adapter id for logs / debugging.
     * e.g. 'naive-ui' | 'ant-design-vue'
     */
    name?: string;
    /**
     * Run host validation.
     *
     * - resolve / return void | { valid: true } → success
     * - return { valid: false, errors } → fail with those errors
     * - throw → fail; errors come from mapErrors (default smart normalize)
     *
     * You only call the UI library API here. No bind bookkeeping.
     */
    validate: (host: THost, ctx: AdapterValidateContext) => void | HostValidateResult | Promise<void | HostValidateResult>;
    /** Clear host field errors (e.g. restoreValidation / clearValidate). */
    clearValidate?: (host: THost, paths?: FieldPath[]) => void;
    scrollToField?: (host: THost, path: FieldPath) => void;
    /** After form.reset / load('create'). Usually same as clearValidate. */
    afterModelReset?: (host: THost) => void;
    /**
     * Turn thrown values into FormErrors.
     * Default: normalizeHostErrors (async-validator / Naive / common shapes).
     */
    mapErrors?: (err: unknown) => FormErrors;
    /** Message when validate runs before bindHost. */
    unboundMessage?: string;
}
export type DefineAdapterFactory<_THost = unknown> = () => FormHostAdapter & {
    /** Dev-only name */
    readonly __adapterName?: string;
};
/** Success helper (optional sugar). */
export declare function adapterOk(): HostValidateResult;
/** Failure helper when you already have path → messages. */
export declare function adapterFail(errors: FormErrors): HostValidateResult;
/**
 * Normalize common UI / async-validator error payloads into FormErrors.
 *
 * Handles:
 * - ValidateError[][]  (Naive Form reject)
 * - ValidateError[]
 * - { field|path|key, message } objects
 * - Record<path, string | string[] | { message }[]>
 * - Error / string
 */
export declare function normalizeHostErrors(err: unknown): FormErrors;
/**
 * Plugin-style host adapter factory (similar mental model to vite plugins:
 * declare name + a few hooks, framework handles lifecycle).
 *
 * ```ts
 * export const createNaiveAdapter = defineAdapter<FormInst>({
 *   name: 'naive-ui',
 *   async validate(host, { paths }) {
 *     if (paths?.length) {
 *       const set = new Set(paths)
 *       await host.validate(undefined, rule => {
 *         const f = String(rule.key ?? rule.field ?? '')
 *         return !f || set.has(f)
 *       })
 *     } else {
 *       await host.validate()
 *     }
 *   },
 *   clearValidate(host) { host.restoreValidation() },
 *   afterModelReset(host) { host.restoreValidation() },
 * })
 *
 * // usage
 * const form = useForm({ adapter: createNaiveAdapter(), defaults, rules })
 * form.bindHost(nFormInst)
 * ```
 */
export declare function defineAdapter<THost = unknown>(options: DefineAdapterOptions<THost>): DefineAdapterFactory<THost>;
