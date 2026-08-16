---
name: vformjs
description: >-
  Implement or migrate Vue forms with vformjs: useElForm, useNaiveForm,
  useAntdForm, r.* rules, load modes, dynamic/complex/multi-form lifecycles,
  official UI adapters, and Zod. Use when the user mentions vformjs,
  Element Plus, element-ui, Naive UI, Ant Design Vue, form lifecycle,
  server errors, dirty state, simplifying CRUD forms, or migrating an
  existing form. Do NOT use defineAdapter for vee-validate, Vuelidate, or
  PrimeVue+VeeValidate — those are parallel engines.
---

# vformjs

Vue 表单**状态 + 校验周期**层。UI 库只负责画控件和跑宿主 validate；  
`defaults` / `rules` / `submit` / `load` / 联动 / 动态数组在本库。

## 何时读本 skill

- 用 Element Plus、element-ui、Naive UI、Ant Design Vue 写可提交表单、弹窗 CRUD
- 问「rules 太繁琐怎么简化」「form hook 怎么写」
- 评估某个 Vue 组件库能不能接
- 把存量常规、动态、复杂或多表单迁移到 vformjs

## 强制决策树（先走再写代码）

```
用户目标 UI / 校验方案是什么？
│
├─ Element Plus (Vue3)
│     → useElForm / useZodForm  (@vformjs/element-plus)
│
├─ Element UI (Vue2.7)
│     → useElForm / useZodForm  (@vformjs/element-ui)
│
├─ Naive UI (Vue3)
│     → useNaiveForm / useZodForm  (@vformjs/naive-ui)
│
├─ Ant Design Vue (Vue3)
│     → useAntdForm / useZodForm  (@vformjs/ant-design-vue)
│
├─ 其它有 Form 实例 + Form 级 rules 的 UI（TDesign / Arco / View UI…）
│     → useForm({ defaultValues, adapter, rules })
│     → defineAdapter 只写 validate / clear / scroll
│
├─ 仅有 formRef.validate() + 规则挂在控件上（Quasar / Vuetify / 部分 Vant）
│     → 仍可用 useForm 做 model / load / list / submit（defaultValues）
│     → adapter 只桥整表 boolean；控件自己写 rules
│     → 不要假装 form.rules 驱动宿主红字
│
└─ vee-validate / Vuelidate / PrimeVue+VeeValidate / 完整并行表单引擎
      → STOP。禁止 defineAdapter
      → 二选一：全用对方，或全用本库 + 真实 Form 宿主（A/B）或 Zod useZodForm
      → 禁止：无 adapter 却指望 rules/r.* 在 submit 时自动校验
      → 禁止双绑 form.model 与 vee values
```

### D 类硬禁令（并列引擎）

| 方案 | Agent 行为 |
|------|------------|
| vee-validate | **不写** adapter；不包一层 host |
| Vuelidate | 同上 |
| PrimeVue 官方 Form + VeeValidate | 同上 |
| 用户已选 vee/zod-vee 栈 | 用对方文档实现；本 skill 退出 |

口诀：**对方是否自带 form 状态 + validate 周期？** 有 → D，不接 adapter。

**无 adapter 时 core 不会执行 `FormRulesMap`/`r.*`。**  
有 active `rules` 却没有宿主时，`validate`/`submit` 返回带 `_form` 配置错误的
`{ ok: false }`，不会再静默成功。无 UI Form 时用 **Zod `useZodForm`**
做 schema 校验，或接 A/B 宿主。

参考：[@references/adapter-matrix.md](references/adapter-matrix.md)

---

## 包与入口

| 场景 | 安装 | 入口 |
|------|------|------|
| Vue3 + Element Plus | `@vformjs/element-plus` | `useElForm` `useZodForm` `r` |
| Vue2.7 + element-ui | `@vformjs/element-ui` | `useElForm` `useZodForm` `r` |
| Vue3 + Naive UI | `@vformjs/naive-ui` | `useNaiveForm` `useZodForm` `r` |
| Vue3 + Ant Design Vue | `@vformjs/ant-design-vue` | `useAntdForm` `useZodForm` `r` |
| 换 UI / 自研 | `@vformjs/vue` + 可选 core | `useForm` `defineAdapter` `r` |
| Zod 跨 UI | `@vformjs/zod` | `useZodForm({ adapter, schema, defaults })` |

命名：

- `useElForm` / `useNaiveForm` / `useAntdForm` / `useZodForm`：**`defaults`**
- 底层 `useForm`（`@vformjs/vue`）：**`defaultValues`**

adapter 包已 re-export `r` / `fieldPath`，单包安装即可：

```ts
import { useElForm, r } from '@vformjs/element-plus'
```

源码地图：

| 路径 | 内容 |
|------|------|
| `packages/element-plus/src/use-el-form.ts` | 官方入口 |
| `packages/element-plus/src/create-adapter.ts` | Element 宿主桥 |
| `packages/vue/src/use-form.ts` | 通用 useForm |
| `packages/core/src/define-adapter.ts` | defineAdapter / normalizeHostErrors |
| `packages/core/src/rule-builders.ts` | `r.*` |
| `packages/vue/src/use-form.ts` | 单一 facade、`fields` / `submission` 配置与底层 `useForm` |
| `packages/naive-ui/src/` | Naive UI 官方 adapter 与入口 |
| `packages/ant-design-vue/src/` | Ant Design Vue 官方 adapter 与入口 |
| `docs/guide.md` | 安装与用法 |
| `docs/api.md` | API 表 |

---

## 标准实现流程（Agent）

存量迁移先读 [@references/migration-workflow.md](references/migration-workflow.md)。
报告里的“需要手工”表示不能由确定性 codemod 猜语义；Agent 应读取完整组件、
调用方、类型和测试后迁移。只有仓库证据无法确定的业务门才交给维护者决定。

### 0. 单一入口与能力边界（强制）

- 官方 UI 包只使用一个业务入口：`useElForm`、`useNaiveForm` 或
  `useAntdForm`。禁止按页面复杂度另造 factory 名。
- `model`、`host`、`load`、`submit`、`reset` 等生命周期和高级能力都直接
  在同一个 `form` 上。
- 路径读写用 `get` / `set` / `field`；字段行为、校验、草稿分别用
  `hidden` / `options` / `list`、`validate` / `setErrors`、
  `snapshotDraft` / `restoreDraft`。
- 条件、远程选项、提交策略使用顶层 `when`、`rules`、`linkage`、
  `options`、`submitPolicy`；显式追踪使用 `tracking`。

Agent 只增加场景需要的顶层配置和方法调用，不引入无关能力，也不切换
form 类型。

### 1. Element 主路径（默认）

```ts
import { useElForm, r } from '@vformjs/element-plus'

const form = useElForm({
  defaults: { name: '', email: '' },
  rules: {
    name: [r.required(), r.min(2)],
    email: [r.required(), r.email()],
  },
  onSubmit: async (values) => {
    await api.save(values)
  },
})
```

```vue
<el-form v-bind="form.host" label-width="100px">
  <el-form-item label="姓名" prop="name">
    <el-input v-model="form.model.name" />
  </el-form-item>
  <el-button type="primary" :loading="form.submitting" @click="form.submit()">
    提交
  </el-button>
</el-form>
```

要点：

- **`defaults` 必填** → 推断 `form.model` / `onSubmit(values)`，勿写 `values: any`
- 模板先用宿主原生 prop；只有响应式/API 字段错误需要投影时才用 `form.item(path)`
- 列表页 **永不** `useForm`；form 在 Dialog 或 create/edit 页

### 2. 弹窗 / 路由模式

见 [@references/modes.md](references/modes.md)。

```ts
form.load('create')
form.load('edit', detail)
// 详情：Descriptions，不要整表 disabled
```

### 3. 规则

```ts
r.required() r.email() r.min(2) r.max(n) r.len(n)
r.number() r.integer() r.numberMin(n) r.numberMax(n) r.numberRange(min, max)
r.pattern(/.../) r.equalTo(() => other, '两次不一致')
// 异步：r.custom / async-validator validator
```

`rules` 可为对象或 `(values) => rules`。对象内静态规则与字段条件回调共存：

```ts
rules: {
  name: r.required(),
  extra: ({ values }) => values.type === 'b' ? r.required() : null,
},
when: { extra: values => values.type === 'b' }, // true = 显示
```

Zod：

```ts
import { useZodForm } from '@vformjs/element-plus/zod'
const form = useZodForm({ schema, defaults, onSubmit })
```

Naive UI / Ant Design Vue 使用各自官方包的 `/zod`；无 UI 直接用 `@vformjs/zod`，自定义 UI 才传入自定义 `adapter`。

### 4. 自定义 adapter（A/B 库）

见 [@references/define-adapter.md](references/define-adapter.md)。

```ts
import { defineAdapter, useForm, r } from '@vformjs/vue'

export const createXxxAdapter = defineAdapter<HostFormInst>({
  name: 'xxx-ui',
  async validate(host, { paths }) {
    // 只调宿主 API；失败 throw 或 return adapterFail(errors)
  },
  clearValidate(host, paths) {
    // 清红字
  },
})

// 底层
const form = useForm({
  defaultValues: defaults,
  rules,
  adapter: createXxxAdapter(),
  onSubmit,
})

// 推荐：业务封装与官方 useXxxForm 保持同一签名
// useXxxForm({ defaults, rules, onSubmit }) → 内部 defaultValues + adapter
```

宿主绑定：

- 官方适配器统一使用 `v-bind="form.host"`
- 字段使用 `v-bind="form.item(path)"` 映射 prop / path / name 与错误

### 5. C 类库（Quasar / Vuetify…）

- 保留：`defaultValues`/`defaults`、`model`、`load`、`form.list`、
  顶层 `when`、`submit`
- 放弃：`form.host.rules` 驱动宿主红字

### 6. 验收清单（实现后勾选）

```text
[ ] defaults/defaultValues 正确；onSubmit 无 any
[ ] 统一使用当前 UI 的单一 form 入口；只配置场景需要的能力
[ ] 空提交有宿主红字（A/B）或控件红字（C）
[ ] reset / load('create') 后红字消失
[ ] 弹窗卸载后 `form.host.ref` 收到 `null`，再开无脏校验
[ ] 列表页无 useForm
[ ] detail 用 Descriptions 而非 disabled form
[ ] D 引擎未创建 adapter
[ ] 无「无 adapter + 仅 rules 当校验」
[ ] 动态 list / when 若使用：隐藏字段不挡提交（按 `hiddenValues` 配置）
[ ] 存量迁移已删除旧 model/rules/ref/reset/submit 状态机，无双绑
[ ] create/edit/reset/invalid submit 已按行为验证，不只 build pass
[ ] 动态/多表单已验证显隐、行错误或 section 失败路径
[ ] 公共说明已脱敏，真实业务 diff 只留在授权仓库
```

---

## 反模式（禁止输出）

1. 给 vee-validate / Vuelidate 写 `defineAdapter`
2. 列表页持有 form 实例
3. `onSubmit: async (values: any)`
4. 详情页整表 `:disabled="true"` 当详情 UI
5. 手写完整 `FormHostAdapter`（应用 `defineAdapter`）
6. C 库硬把 `r.*` 转成控件函数数组并声称「官方完整接入」
7. 双状态机：本库 rules + vee validate 同时跑
8. 把 `useForm({ defaults })` 当合法 API（底层是 `defaultValues`）
9. 无 adapter 时写 `rules: { x: [r.required()] }` 并以为 rules 会自行校验
   （core 会返回宿主未绑定错误；无宿主时用 Zod 或接 A/B 宿主）
10. 普通 CRUD 无需求却引入 core 低层 API、resolver、linkage、group 或自定义 adapter

---

## 输出约定（Agent 交付）

实现表单时交付：

1. **场景判定** UI 能力分类 A/B/C/D + 页面形态
2. **包名 + 唯一入口 API**
3. **可编译代码**（只配置场景需要的能力）
4. **绑定方式**（`form.host` + 宿主 prop，或说明为何需要 `form.item(path)`）
5. **未做项**（局部校验、scroll 等宿主没有的能力）
6. **存量迁移合同**（保留行为、已确认决策、clean-cutover 范围）
7. **验证证据**（实际场景、命令、结果和未验证项）

更细：

- [@references/recipes.md](references/recipes.md)
- [@references/modes.md](references/modes.md)
- [@references/define-adapter.md](references/define-adapter.md)
- [@references/migration-workflow.md](references/migration-workflow.md)
- [@references/adapter-matrix.md](references/adapter-matrix.md)
