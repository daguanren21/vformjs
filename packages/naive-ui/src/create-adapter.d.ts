import type { FormInst } from 'naive-ui';
interface NaiveFormHost extends FormInst {
    $el?: ParentNode;
}
/**
 * Naive UI n-form adapter — defineAdapter 写法。
 *
 * 开发者只写「怎么调 n-form」：
 * - validate 成功 resolve，失败 throw（Naive 原生行为）
 * - 错误形状由 core.normalizeHostErrors 自动解析
 * - bind / 未绑定提示 / clear 生命周期框架处理
 *
 * @see https://www.naiveui.com/
 */
export declare const createNaiveAdapter: import("@vformjs/core").DefineAdapterFactory<NaiveFormHost>;
export {};
