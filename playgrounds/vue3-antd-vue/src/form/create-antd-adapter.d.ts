import type { FormInstance } from 'ant-design-vue/es/form';
/**
 * Ant Design Vue a-form adapter（defineAdapter）。
 *
 * validateFields 失败 throw ValidateErrorEntity：
 * { errorFields: [{ name: NamePath, errors: string[] }] }
 * → core.normalizeHostErrors 已支持 errorFields。
 */
export declare const createAntdAdapter: import("@vformjs/core").DefineAdapterFactory<FormInstance>;
