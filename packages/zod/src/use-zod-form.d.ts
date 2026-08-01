import type { FormResult } from '@vformjs/core';
import type { UseFormOptions, UseFormReturn } from '@vformjs/vue';
import type { z, ZodType } from 'zod';
type ZodInput<S extends ZodType> = z.input<S> & Record<string, unknown>;
type ZodOutput<S extends ZodType> = z.output<S> & Record<string, unknown>;
export interface UseZodFormOptions<S extends ZodType<Record<string, unknown>>> extends Omit<UseFormOptions<ZodInput<S>>, 'rules' | 'defaultValues'> {
    schema: S;
    /**
     * Initial values. Required.
     * Prefer shapes matching `z.input<S>` (pre-transform / pre-coerce).
     */
    defaults: z.input<S> | (() => z.input<S>);
    /** @deprecated use `defaults` */
    defaultValues?: z.input<S> | (() => z.input<S>);
    /**
     * Expand nested objects into dotted props (`profile.email`).
     * Default: auto-detect when nested ZodObject exists.
     */
    deep?: boolean;
    /**
     * Expand `z.array(z.object(...))` to `list.i.field` rules.
     * Rebuilt when array lengths change. Default true.
     */
    arrays?: boolean;
}
export type UseZodFormReturn<S extends ZodType<Record<string, unknown>>> = Omit<UseFormReturn<ZodInput<S>>, 'submit' | 'validate' | 'validateField'> & {
    schema: S;
    /**
     * Validate. On success, `values` are **parsed output** (`z.output`).
     * On failure, `values` remain the live model (**input** shape).
     */
    validate: (paths?: Parameters<UseFormReturn<ZodInput<S>>['validate']>[0]) => Promise<FormResult<ZodOutput<S>> | FormResult<ZodInput<S>>>;
    /** Validate one or more fields through the same Zod-aware path. */
    validateField: (paths?: Parameters<UseFormReturn<ZodInput<S>>['validateField']>[0]) => Promise<FormResult<ZodOutput<S>> | FormResult<ZodInput<S>>>;
    /**
     * Submit with parsed output values on success.
     */
    submit: (handler?: (values: ZodOutput<S>, ctx: {
        form: UseFormReturn<ZodInput<S>>['raw'];
    }) => void | Promise<void>) => Promise<FormResult<ZodOutput<S>> | FormResult<ZodInput<S>>>;
};
/**
 * Schema-driven form for Element hosts.
 *
 * Field rules run **full Zod parse** (refine/superRefine appear on the matching prop).
 * Whole-form validation shares one `safeParse` across fields via a wave cache.
 *
 * Prefer the adapter entry so you never pass `adapter` yourself:
 * ```ts
 * import { useZodForm } from '@vformjs/element-plus'
 * ```
 */
export declare function useZodForm<S extends ZodType<Record<string, unknown>>>(options: UseZodFormOptions<S>): UseZodFormReturn<S>;
export {};
