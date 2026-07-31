# Adapter 兼容矩阵（写法）

完整说明见仓库 `docs/ecosystem-adapters.md`。本文件给 Agent 速查。

## 等级

| 级 | 含义 | Agent 动作 |
|----|------|------------|
| **A** | 官方/示例完备 | 用现成包或 playground 复制 |
| **B** | Form 级 rules + validate 实例 | `defineAdapter` 20～40 行 |
| **C** | 状态兼容，校验 DSL 不兼容 | useForm 状态 + 控件 rules；adapter 仅 boolean |
| **D** | 并列完整引擎 | **禁止 adapter**；二选一 |

## 总表

| 库 | 级 | 字段 path | 规则位置 | 备注 |
|----|----|-----------|----------|------|
| Element Plus | A | `prop` | Form + Item | `useElForm`；`r` 从 adapter 包导入 |
| Element UI | A | `prop` | Form + Item | element-ui |
| Naive UI | A | `path` | Form `rules` | playground `create-naive-adapter` |
| Ant Design Vue | A | `name` | Form `rules` | playground `create-antd-adapter` |
| TDesign Vue Next | B | `name` | Form | validate 可能返回对象非 throw |
| Arco Design Vue | B | `field` | Form | 类似 Ant |
| View UI Plus | B | `prop` | Form | 近 Element |
| Vant 4 / NutUI / Varlet | B～C | `name` 等 | Field rules 为主 | 状态可接；`r.*` 勿原样当 Field rules |
| Quasar | C | 子控件 | 控件 internal rules | 整表 `validate()`→boolean |
| Vuetify 3 | C | 输入 | 控件函数 rules | `validate()`→`{valid}` |
| Semi | B～C | 文档 | Form 或控件 | 先确认 Form 级 rules |
| PrimeVue + Vee | **D** | — | 外部引擎 | **不接 adapter** |
| vee-validate | **D** | — | 自有 | **不接 adapter** |
| Vuelidate | **D** | — | 自有 | **不接 adapter** |
| headless 无 Form | **D/特殊** | — | — | **禁止**「无 adapter + 仅 r.*」；用 Zod `useZodForm`（schema 闸门）或接 A/B 宿主 |

## 关键：无 adapter 时 rules 不跑

`createForm.validate()` **没有 adapter 时不会执行 FormRulesMap**。  
它只检查 core `errors` 里是否已有消息；否则直接 `{ ok: true }`。

因此：

```ts
// ❌ 危险：空 required 也能 submit 成功
useForm({ defaultValues, rules: { name: [r.required()] }, onSubmit })

// ✅ Zod 无 UI 宿主（schema 在 zod 包内跑）
useZodForm({ schema, defaults, adapter, onSubmit }) // 仍建议有宿主红字；跨 UI 必传 adapter

// ✅ 真实宿主
useForm({ defaultValues, rules, adapter: createXxxAdapter(), onSubmit })
```

## D 判定

```
if (target has own form state machine AND own validate/submit cycle)
  → D: do not call defineAdapter
  → tell user: pick vformjs OR the other engine
```

## C 判定

```
if (formRef.validate exists AND rules live on inputs not Form.rules map)
  → C: useForm for model/load/list/submit only
  → adapterFail({ _form: [...] }) on false
  → do not map entire r.* to widget rule fns as "full support"
```

## defineAdapter 最小契约

| Hook | 必须 | 说明 |
|------|------|------|
| `validate(host, { paths? })` | 是 | throw 或 `adapterFail` / void 成功 |
| `clearValidate` | 强烈建议 | 清红字 |
| `afterModelReset` | 可选 | 默认 clear |
| `scrollToField` | 可选 | |
| `mapErrors` | 可选 | 默认 `normalizeHostErrors` |

`normalizeHostErrors` 已覆盖：Naive 二维数组、Antd `errorFields`、Record、Error、string。
