import type { RuleItem } from './types';
type Trigger = string | string[];
export type ValidatorFn = (rule: RuleItem, value: unknown, callback: (error?: Error) => void) => void | Promise<void>;
/** Fluent / callable rule builders used by `r.*` and string sugar. */
export declare const ruleBuilders: {
    required(message?: string, trigger?: Trigger): RuleItem;
    email(message?: string, trigger?: Trigger): RuleItem;
    url(message?: string, trigger?: Trigger): RuleItem;
    min(min: number, message?: string, trigger?: Trigger): RuleItem;
    max(max: number, message?: string, trigger?: Trigger): RuleItem;
    len(len: number, message?: string, trigger?: Trigger): RuleItem;
    range(min: number, max: number, message?: string, trigger?: Trigger): RuleItem;
    number(message?: string, trigger?: Trigger): RuleItem;
    integer(message?: string, trigger?: Trigger): RuleItem;
    numberMin(min: number, message?: string, trigger?: Trigger): RuleItem;
    numberMax(max: number, message?: string, trigger?: Trigger): RuleItem;
    numberRange(min: number, max: number, message?: string, trigger?: Trigger): RuleItem;
    pattern(pattern: RegExp, message?: string, trigger?: Trigger): RuleItem;
    phone(message?: string, trigger?: Trigger): RuleItem;
    idCard(message?: string, trigger?: Trigger): RuleItem;
    /** Array / multi-select not empty */
    arrayRequired(message?: string, trigger?: Trigger): RuleItem;
    /** Custom sync/async validator (async-validator style) */
    custom(validator: ValidatorFn, trigger?: Trigger, message?: string): RuleItem;
    /** Cross-field equal (password confirm etc.) */
    equalTo(getOther: () => unknown, message?: string, trigger?: Trigger): RuleItem;
    /** Reject if empty string after trim */
    trimRequired(message?: string, trigger?: Trigger): RuleItem;
};
export type RuleBuilders = typeof ruleBuilders;
export {};
