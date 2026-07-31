import type { FormRulesMap } from '@veform/core';
import type { ZodType } from 'zod';
type Trigger = string | string[];
export interface ZodToRulesOptions {
    getValues: () => Record<string, unknown>;
    trigger?: Trigger | ((path: string) => Trigger);
    deep?: boolean;
    arrays?: boolean;
}
export declare function createSharedZodParser(schema: ZodType, getValues: () => Record<string, unknown>): {
    parseField(fieldPath: string, value: unknown): import("zod").ZodSafeParseResult<unknown>;
    invalidate(): void;
};
export type SharedZodParser = ReturnType<typeof createSharedZodParser>;
export declare function collectZodFieldPaths(schema: ZodType, deep: boolean, prefix?: string, arrays?: boolean, values?: Record<string, unknown>): string[];
export declare function arrayLengthSignature(schema: ZodType, values: Record<string, unknown>, prefix?: string): string;
export declare function zodToRules(schema: ZodType, options: ZodToRulesOptions & {
    parser?: SharedZodParser;
}): FormRulesMap;
export declare function zodToRulesDeep(schema: ZodType, options: Omit<ZodToRulesOptions, 'deep'> & {
    getValues: () => Record<string, unknown>;
}): FormRulesMap;
export declare function zodIssuesToFormErrors(error: {
    issues: Array<{
        path: PropertyKey[];
        message: string;
    }>;
}, fallbackPath?: string): Record<string, string[]>;
export {};
