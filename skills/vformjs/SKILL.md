---
name: vformjs
description: >-
  Implement Vue forms with vformjs: useElForm, r.* rules, load modes,
  defineAdapter for UI hosts, Zod. Use when user mentions vformjs, useElForm,
  useElForm, useForm, defineAdapter, form adapter, Element Plus form state,
  Naive/Ant Design Vue form bridge, or simplifying Element form rules/submit/load.
  Do NOT use defineAdapter for vee-validate, Vuelidate, or PrimeVue+VeeValidate —
  those are parallel engines.
---

# vformjs

Vue 表单**状态 + 校验周期**层。UI 库只负责画控件和跑宿主 validate；  
`defaults` / `rules` / `submit` / `load` / 联动 / 动态数组在本库。

## 何时读本 skill

- 用 Element Plus / Element UI 写可提交表单、弹窗 CRUD
- 换 Naive / Ant Design Vue / TDesign 等，要 `defineAdapter`
- 问「rules 太繁琐怎么简化」「form hook 怎么写」
- 评估某个 Vue 组件库能不能接

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
├─ 有 Form 实例 + Form 级 rules（Naive / Antd / TDesign / Arco / View UI…）
│     → 优先包一层 useXxxForm({ defaults, rules }) 内部映射 defaultValues + adapter
│     → 或 useForm({ defaultValues, adapter, rules })
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
`validate`/`submit` 只看已有 errors 或宿主；无宿主 + 仅 `rules` = 空表也能 `ok: true`。  
无 UI Form 时用 **Zod `useZodForm`** 或接 A/B 宿主，不要写「headless + r.*」。

参考：[@references/adapter-matrix.md](references/adapter-matrix.md)

---

## 包与入口

| 场景 | 安装 | 入口 |
|------|------|------|
| Vue3 + Element Plus | `@vformjs/element-plus` | `useElForm` `useZodForm` `r` |
| Vue2.7 + element-ui | `@vformjs/element-ui` | `useElForm` `useZodForm` `r` |
| 换 UI / 自研 | `@vformjs/vue` + 可选 core | `useForm` `defineAdapter` `r` |
| Zod 跨 UI | `@vformjs/zod` | `useZodForm({ adapter, schema, defaults })` |

命名：

- `useElForm` / playground `useXxxForm` / `useZodForm`：**`defaults`**
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
| `packages/core/src/types.ts` | `when` / `whenRules` / `CreateFormOptions` |
| `playgrounds/vue3-naive-ui/src/form/` | Naive adapter + useNaiveForm |
| `playgrounds/vue3-antd-vue/src/form/` | Antd adapter |
| `docs/guide.md` | 安装与用法 |
| `docs/api.md` | API 表 |

---

## 标准实现流程（Agent）

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
<el-form v-bind="form.el" label-width="100px">
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
- 模板优先 `v-bind="form.el"`（含 ref→bindHost + model + rules）
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

`rules` 可为对象或 `(values) => rules`（`RulesSource`）。

条件：

```ts
when: { extra: (m) => m.type === 'b' }           // true = 显示
whenRules: { extra: (m) => m.type === 'b' ? [r.required()] : [] }
```

Zod：

```ts
import { useZodForm } from '@vformjs/element-plus'
const form = useZodForm({ schema, defaults, onSubmit })
```

换 UI 时用 `@vformjs/zod` 并传入 `adapter`。

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

// 推荐：业务封装与 useElForm 对齐（见 playground use-naive-form）
// useXxxForm({ defaults, rules, onSubmit }) → 内部 defaultValues + adapter
```

bindHost：

- Element：`v-bind="form.el"`
- 其它：`:ref="(inst) => form.bindHost(inst)"` 或 watch ref，卸载传 `null`

### 5. C 类库（Quasar / Vuetify…）

- 保留：`defaultValues`/`defaults`、`model`、`load`、`list`、`when`、`submit`
- 放弃：`form.rules` 驱动宿主红字
- 控件自己写库的 `rules` 函数；adapter 只做整表 boolean → `adapterFail({ _form: [...] })`

### 6. 验收清单（实现后勾选）

```text
[ ] defaults/defaultValues 正确；onSubmit 无 any
[ ] 空提交有宿主红字（A/B）或控件红字（C）
[ ] reset / load('create') 后红字消失
[ ] 弹窗卸载 bindHost(null)，再开无脏校验
[ ] 列表页无 useForm
[ ] detail 用 Descriptions 而非 disabled form
[ ] D 引擎未创建 adapter
[ ] 无「无 adapter + 仅 rules 当校验」
[ ] 动态 list / when 若使用：隐藏字段不挡提交（按 hiddenValues 配置）
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
9. 无 adapter 时写 `rules: { x: [r.required()] }` 并以为 submit 会校验  
   （core **不会**跑 FormRulesMap；无宿主时用 Zod 或接 A/B 宿主）

---

## 输出约定（Agent 交付）

实现表单时交付：

1. **等级判定** A/B/C/D 一句
2. **包名 + 入口 API**
3. **可编译代码**（defaults 或 defaultValues / rules / adapter / template）
4. **bindHost 方式**（`form.el` 或 ref 回调）
5. **未做项**（局部校验、scroll 等宿主没有的能力）

更细：

- [@references/recipes.md](references/recipes.md)
- [@references/modes.md](references/modes.md)
- [@references/define-adapter.md](references/define-adapter.md)
- [@references/adapter-matrix.md](references/adapter-matrix.md)
