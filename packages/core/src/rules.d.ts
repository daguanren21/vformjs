import { ruleBuilders } from './rule-builders';
import type { FormRulesInput, FormRulesMap, RuleInput, RuleItem, RulesSource } from './types';
export declare function normalizeRuleInput(input: RuleInput): RuleItem[];
export declare function normalizeRulesMap(map: FormRulesInput | FormRulesMap | undefined): FormRulesMap;
export declare function resolveRulesSource<T extends Record<string, unknown>>(source: RulesSource<T> | undefined, values: T): FormRulesMap;
export declare function mergeFieldRules(base: FormRulesMap, overrides: Map<string, RuleItem[] | null>): FormRulesMap;
export { ruleBuilders };
