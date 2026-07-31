# defineAdapter 实现指南

仅用于 **A/B**（及 C 的弱桥）。**D 禁止**。

## API

```ts
import {
  defineAdapter,
  adapterOk,
  adapterFail,
  normalizeHostErrors,
} from '@veform/vue' // 或 @veform/core

export const createXxxAdapter = defineAdapter<HostInst>({
  name: 'xxx-ui',
  async validate(host, { paths }) {
    // 只调宿主 API
  },
  clearValidate(host, paths) {
    // 清红字；paths 可选
  },
  // 可选钩子（需要时再写，不要用 TS 可选标记语法）：
  // scrollToField(host, path) { ... }
  // afterModelReset(host) { ... }
  // mapErrors(err) { return normalizeHostErrors(err) }
  // unboundMessage: '请先绑定表单',
})
```

可选字段说明（对象里按需加入，省略即用默认）：

| 字段 | 默认 |
|------|------|
| `scrollToField` | 无 |
| `afterModelReset` | 调 `clearValidate` |
| `mapErrors` | `normalizeHostErrors` |
| `unboundMessage` | 框架默认文案 |

- 返回**工厂**：每次 `createXxxAdapter()` 新实例，多表单不抢 host
- `bindHost` / 未绑定错误由框架处理，不要自己存 host

## validate 约定

| 宿主行为 | adapter 写法 |
|----------|----------------|
| 失败 throw | `await host.validate()` 即可，错误走 mapErrors |
| 返回 boolean | `if (!ok) return adapterFail({ _form: ['...'] })` |
| 返回 `{ valid, errors }` | 判断 valid；有 path 错误则 `adapterFail(map)` |
| 局部 paths | 宿主支持则转发；不支持则忽略 paths 或整表 |

## 可复制模板

### Naive（A，已验证）

路径：`playgrounds/vue3-naive-ui/src/form/create-naive-adapter.ts`

- 整表：`await host.validate()`
- 局部：第二参 `shouldRuleBeApplied`
- clear：`host.restoreValidation()`
- 字段属性：`path`

### Ant Design Vue（A，已验证）

路径：`playgrounds/vue3-antd-vue/src/form/create-antd-adapter.ts`

- `validateFields` / `clearValidate` / `scrollToField`
- 字段属性：`name`
- 错误：`errorFields`（normalize 已支持）

### B 库骨架

```ts
defineAdapter({
  name: 'tdesign-or-arco',
  async validate(host, { paths }) {
    const r = await host.validate(/* paths 按文档 */)
    // 若非 throw：
    // if (r !== true) return adapterFail(mapHost(r))
  },
  clearValidate(host, paths) {
    host.clearValidate?.(paths)
  },
})
```

### C 库骨架（仅整表）

```ts
defineAdapter({
  name: 'quasar-or-vuetify',
  async validate(host) {
    const r = await host.validate()
    const ok = typeof r === 'boolean' ? r : !!r?.valid
    if (!ok)
      return adapterFail({ _form: ['请检查表单项'] })
  },
  clearValidate(host) {
    host.resetValidation?.()
  },
})
```

## 业务侧绑定

```ts
// 底层 API — 选项名是 defaultValues
const form = useForm({
  defaultValues: defaults,
  rules, // C 可省略 Form 级 rules
  adapter: createXxxAdapter(),
  onSubmit,
})

// 推荐：业务封装与 useElForm 对齐
// useXxxForm({ defaults, rules, onSubmit }) 内部 → defaultValues + adapter
```

```vue
<!-- 不要用 form.el 除非 model/rules 属性名与 Element 一致 -->
<n-form
  :ref="(inst) => form.bindHost(inst)"
  :model="form.model"
  :rules="form.rules"
/>
```

卸载时 `form.bindHost(null)`。

## 验收

1. 未 bind 时 validate → unbound 提示  
2. 空提交红字 + `submit()` errors  
3. reset 后红字消失  
4. 局部 paths（若支持）  
5. 多表单各 `createXxxAdapter()` 互不干扰  
