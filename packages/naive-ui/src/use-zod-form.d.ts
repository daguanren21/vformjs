import type { UseZodFormOptions, UseZodFormReturn } from '@vformjs/zod';
import type { ZodType } from 'zod';
/** Zod form with the Naive UI host adapter already configured. */
export declare function useZodForm<S extends ZodType<Record<string, unknown>>>(options: Omit<UseZodFormOptions<S>, 'adapter'>): UseZodFormReturn<S>;
export type { UseZodFormOptions, UseZodFormReturn } from '@vformjs/zod';
