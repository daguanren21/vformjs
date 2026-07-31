# Vue 主流组件库接入评估

目标：把「校验生命周期」说清楚——哪些库能直接挂 `defineAdapter`，哪些只能半接入，哪些不适合硬接。  
方便后续自己写 adapter，或给社区 PR 一个官方/示例包。

官方**只内置** Element UI / Element Plus。Naive、Ant Design Vue 有可运行 playground 示例。其余库下面给接入等级 + 草图。

```bash
pnpm dev:vue3    # Element Plus  :5283
pnpm dev:vue2    # element-ui    :5284
pnpm dev:naive   # Naive UI      :5285
pnpm dev:antd    # Ant Design Vue:5286
```

---

## 我们需要宿主提供什么

`defineAdapter` 只认四件事：

| Hook | 必须？ | 含义 |
|------|--------|------|
| `validate(host, { paths? })` | 必须 | 整表或局部校验；失败 throw 或 `adapterFail` |
| `clearValidate(host, paths?)` | 强烈建议 | 清红字 |
| `afterModelReset(host)` | 可选 | 默认等于 clearValidate |
| `scrollToField(host, path)` | 可选 | 滚到出错字段 |
| `bind` | 框架代管 | 你不用写 |

另外业务模板要能：

1. 把 **model** 绑到宿主  
2. 把 **rules**（async-validator 风格或可映射）绑到宿主 / 字段  
3. **ref** 拿到实例，`form.bindHost(inst)`  

`normalizeHostErrors` 已覆盖：

- Naive：`ValidateError[][]`（`field` + `message`）  
- Ant Design Vue：`{ errorFields: [{ name, errors }] }`  
- 常见 `Record<path, string[]>` / `Error` / `string`  

新库若错误形状奇怪，加 `mapErrors` 即可。

---

## 接入等级（按「写法兼容」）

| 等级 | 含义 |
|------|------|
| **A 官方/示例完备** | 同一套写法：`defaults` + `rules`/`r.*` + `form.model` + `submit`/`load` + 宿主红字 |
| **B 可直连** | 同一套写法，只改模板属性名（`prop`/`path`/`name`/`field`）和 adapter 钩子 |
| **C 写法半兼容** | **状态层写法能复用**（model/load/list/when/submit）；**校验写法不能原样复用**（rules 挂控件 / 非 async-validator） |
| **D 写法不兼容（并列引擎）** | 对方也是完整表单状态机；**不要**再套 `defineAdapter` 当宿主，二选一或只借一层 |

---

## 总表

| 库 | Vue | 接入 | Form 实例 API（常见） | 字段名 | 规则挂哪里 | 备注 |
|----|-----|------|----------------------|--------|------------|------|
| **Element Plus** | 3 | **A 官方** | `validate` `validateField` `clearValidate` `scrollToField` | `prop` | Form + Item | `useElForm` / `form.el` |
| **Element UI** | 2.7 | **A 官方** | 同上（偏 callback） | `prop` | Form + Item | `element-ui` |
| **Naive UI** | 3 | **A 示例** | `validate` `restoreValidation` | `path` | Form `rules` | `pnpm dev:naive` |
| **Ant Design Vue** | 3 | **A 示例** | `validateFields` `clearValidate` `scrollToField` | `name` | Form `rules` | `pnpm dev:antd`；错误 `errorFields` |
| **TDesign Vue Next** | 3 | **B** | `validate` `clearValidate` `reset` 等 | `name` | Form `rules` + `data` | 返回值可能是 `{ validateResult }` 非 throw，要在 hook 里判断 |
| **Arco Design Vue** | 3 | **B** | `validate` `clearValidate` `resetFields` | `field` | Form `rules` + `model` | 字节系；类似 Ant 思路 |
| **View UI Plus** (iView) | 3 | **B** | `validate` `validateField` `resetFields` | `prop` | 接近 Element | 老项目常见 |
| **Vant 4** | 3 移动 | **B～C** | `validate` / `validate(name)` `resetValidation` | `name` | Field `rules` 为主 | 整表/局部 validate 可接；**`r.*` 不能原样当 Vant rules** |
| **NutUI** | 3 移动 | **B～C** | `validate` 等 | `prop`/`name` | 类似 Vant | 同 Vant：状态兼容，规则形状要转 |
| **Varlet** | 3 移动 | **B～C** | Form validate | 看文档 | 控件 rules | 同 Vant |
| **Quasar** | 3 | **C** | `validate()`→boolean `resetValidation` | 子组件 | **控件 internal rules** | 见下「C 写法兼容」 |
| **Vuetify 3** | 3 | **C** | `validate()`→`{valid}` `resetValidation` | 输入 | **控件函数 rules** | 见下「C 写法兼容」 |
| **PrimeVue** | 3 | **C～D** | 自有 Form / 常绑 VeeValidate | 视版本 | resolver / schema | 官方主路径偏 D；自建 Form 壳可当 C |
| **Semi Design Vue** | 3 | **B～C** | Form 实例 API | 文档为准 | Form rules 或控件 | 先看是否 Form 级 rules |
| **无 Form 宿主 / headless** | — | **D** | 无 | — | — | 只用 core 状态 + 自绘错误，无 bindHost |
| **vee-validate / Vuelidate** | — | **D** | 自有状态机 | — | schema / $rules | **并列引擎，不是 host** |

---

## 按库说明

### A. 已跑通

#### Element Plus / Element UI

- 包：`@veform/element-plus` / `element-ui`  
- 模板：`v-bind="form.el"`  
- 周期：`validate` → 红字 → `clearValidate` → `load`/`reset` 清状态  

#### Naive UI

```ts
// 见 playgrounds/vue3-naive-ui/src/form/create-naive-adapter.ts
defineAdapter<FormInst>({
  name: 'naive-ui',
  async validate(host, { paths }) {
    if (paths?.length) {
      const set = new Set(paths)
      await host.validate(undefined, (rule) => {
        const field = String(rule.key ?? '')
        return !field || set.has(field)
      })
      return
    }
    await host.validate()
  },
  clearValidate(host) {
    host.restoreValidation()
  },
})
```

要点：局部校验用第二参数 `shouldRuleBeApplied`，不是 `fields: string[]`。

#### Ant Design Vue

```ts
// 见 playgrounds/vue3-antd-vue/src/form/create-antd-adapter.ts
defineAdapter<FormInstance>({
  name: 'ant-design-vue',
  async validate(host, { paths }) {
    if (paths?.length)
      await host.validateFields(paths)
    else
      await host.validateFields()
  },
  clearValidate(host, paths) { /* clearValidate */ },
  scrollToField(host, path) {
    host.scrollToField(path)
  },
})
```

要点：失败 throw `{ errorFields }`；字段属性是 **`name`**。

---

### B. 可直连（建议下一波 playground）

#### TDesign Vue Next

| 项 | 值 |
|----|-----|
| 文档 | https://tdesign.tencent.com/vue-next/components/form |
| model | 常见 `data` / `:data` |
| 字段 | `name` |
| validate | 实例 `validate`；注意返回值可能是对象而非 throw |
| clear | `clearValidate` |

草图：

```ts
defineAdapter({
  name: 'tdesign-vue-next',
  async validate(host, { paths }) {
    // 以你安装版本的 FormInstance 为准
    const r = await host.validate(paths ? { fields: paths } : undefined)
    // 若 r 表示失败且不 throw：
    // if (r !== true && r?.validateResult !== true)
    //   return adapterFail(mapTDesignErrors(r))
  },
  clearValidate(host, paths) {
    host.clearValidate?.(paths)
  },
})
```

落地前用真实 `FormInstance` 类型核对一版 API。

#### Arco Design Vue

| 项 | 值 |
|----|-----|
| 文档 | https://arco.design/vue/component/form |
| model | `model` |
| 字段 | **`field`** |
| validate | `validate` / 局部 fields |
| clear | `clearValidate` / `resetFields` |

草图：

```ts
defineAdapter({
  name: 'arco-design-vue',
  async validate(host, { paths }) {
    if (paths?.length)
      await host.validate(paths)
    else
      await host.validate()
  },
  clearValidate(host, paths) {
    host.clearValidate?.(paths)
  },
})
```

#### View UI Plus

几乎按 Element 思路：`prop` + `validate` + `resetFields`。可从 `createElementPlusAdapter` 抄结构改方法名。

#### Vant 4（移动）

| 项 | 值 |
|----|-----|
| 文档 | https://vant-ui.github.io/vant |
| validate | `formRef.validate()` / `validate(name)` |
| clear | `resetValidation()` |
| 规则 | Field `rules`；与 async-validator 不完全一致 |

```ts
defineAdapter({
  name: 'vant4',
  async validate(host, { paths }) {
    if (paths?.length) {
      for (const p of paths)
        await host.validate(p)
      return
    }
    await host.validate()
  },
  clearValidate(host) {
    host.resetValidation()
  },
})
```

注意：rules 形状可能要 `mapRules`（业务层把 `r.*` 转成 Vant Rule），或字段上直接写 Vant rules、core 只做 submit/load 状态。

NutUI / Varlet：同一类「移动端 Form + Field rules」，按各自文档把 validate/reset 填进 hook。

---

### C. 写法半兼容（无 demo 要求）

问的是：**业务代码能不能还按我们的习惯写**，不是能不能出 playground。

我们完整写法 = 四层：

| 层 | 典型代码 | C 库通常能否保留 |
|----|----------|------------------|
| 状态 | `defaults` `form.model` `load` `list` `when` `submitting` | **能** — 不依赖 UI 库 |
| 提交周期 | `form.submit` / `onSubmit` / `validate` / `reset` | **能** — adapter 只桥接 boolean 或弱 errors |
| 规则 DSL | `rules: { x: [r.required(), r.email()] }` 挂 Form | **不能原样** — 规则在控件上，形状是函数数组 |
| 宿主红字 | `form.rules` + Item `prop` 自动红字 | **弱** — 红字靠控件自己的 `rules`；core `errors` 与 UI 不同步 unless 手写 map |

结论：**C = 状态/生命周期写法兼容，校验 DSL 写法不兼容。**

#### 兼容写法（推荐在 C 库里怎么写）

```ts
// ✅ 仍用我们的状态与模式（底层选项名 defaultValues）
const form = useForm({
  defaultValues: { name: '', email: '' },
  // 不要指望 form.rules 驱动 QForm/VForm 红字；校验写在控件上
  adapter: createQuasarOrVuetifyAdapter(),
  onSubmit: async (values) => api.save(values),
})

// 模板：model 绑定保留；校验规则写在控件上（库自己的 rules 函数）
// <q-input v-model="form.model.name" :rules="[val => !!val || '必填']" />
// <v-text-field v-model="form.model.email" :rules="[v => /@/.test(v) || '邮箱']" />
```

```ts
// adapter：只桥「整表能不能过」，不假装 FormRulesMap 驱动红字
defineAdapter({
  name: 'quasar-or-vuetify',
  async validate(host) {
    // Quasar: Promise<boolean>
    // Vuetify: { valid: boolean, errors?: ... }
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

#### 不兼容 / 不要硬拧的写法

| 我们的习惯 | C 库现实 | 别硬做 |
|------------|----------|--------|
| `form.rules` + `r.*` 一处声明 | 规则散落在每个 input | 不要写 `mapRules` 把整个 `r.*` 转成 Vuetify/Quasar 函数数组当「官方能力」 |
| `form.validate(['email'])` 局部 + 只亮一格红字 | 多数只有整表 `validate()` | 局部可调用，但 path→红字无保证 |
| Zod `useZodForm` 与宿主红字同源 | 宿主不吃 async-validator/Zod issue | Zod 可做 submit 闸门；红字仍靠控件 rules |
| `v-bind="form.el"` | model/rules 属性名不同且 rules 无用 | 只用 `form.model` + `bindHost`，别绑 `rules` |

#### 分库一句话

| 库 | 状态写法 | 校验写法 | 你能不能「兼容写法」 |
|----|----------|----------|----------------------|
| **Quasar** | 兼容 | 控件 `rules` 函数；Form 无 FormRulesMap | **能**：`useForm` + 字段手写 rules；不能：一套 `r.*` 驱动 QForm |
| **Vuetify 3** | 兼容 | 控件 `rules: [(v)=>…]` | **同上** |
| **PrimeVue（自带 Form / resolver）** | 部分 | resolver/schema，常绑外部引擎 | 若只用控件 + 自建 validate 钩子 → 当 C；走官方 VeeValidate → **D** |
| **Vant/NutUI/Varlet（rules 挂 Field）** | 兼容 | Field rules 形状 ≠ `r.*` | **状态兼容**；`r.*` 需转换或字段手写，整表 validate 可 bridge |

---

### D. 写法不兼容：并列引擎（禁止 adapter）

这些方案**自己就是** `defaults + rules + validate + errors + submit`。  
**禁止**再 `defineAdapter` 把对方当宿主——双状态机，写法必炸。

| 方案 | 对方写法 | Agent / 业务方动作 |
|------|----------|-------------------|
| **vee-validate** | `useForm` / schema / defineRule | **二选一**。不写 adapter |
| **Vuelidate** | `$v` / helpers | 同上 |
| **PrimeVue + VeeValidate** | 官方绑外部引擎 | 跟 vee 或跟本库，不要桥接 |
| **无 Form 的 headless** | 无 validate 实例 | **禁止**「无 adapter + 仅 `r.*`」——core 不会跑 FormRulesMap。用 Zod 或接 A/B 宿主 |

#### D 下允许的组合（仍不是 adapter）

```ts
// 1) 全用 vee-validate：本库不出现

// 2) 只要本库 model/load/list，校验全交给 vee —— 可以，但禁止再挂 adapter
//    且不要指望本库 rules 生效
const form = useForm({
  defaultValues: defaults,
  onSubmit, // 无 rules、无 adapter
})
// 单一写入方；不要 form.model 与 vee values 双绑

// 3) 本库 + Zod（schema 闸门）+ 真实 UI 宿主 adapter（推荐跨 UI）
// useZodForm({ schema, defaults, adapter, onSubmit })
```

**判定口诀**：对方有没有「自己的 form 状态 + 自己的 validate 周期」？  
- 有 → **D，禁止 defineAdapter**  
- 没有、只有控件 rules + `formRef.validate()` → **C**  
- 有 Form 级 rules 且可映射 → **B/A**

Agent skill 强制同一决策树：`skills/veform/SKILL.md`。

---

## 统一接入清单（给写 adapter 的人）

复制这一份，换库时逐项打勾：

```text
[ ] 0. 先定等级：对方是 Form 级 rules（B）/ 控件 rules（C）/ 并列状态机（D）？
[ ] 1. 找到 Form 实例类型（没有实例且对方自管状态 → D，停）
[ ] 2. validate：整表怎么调？失败 throw 还是 boolean/对象？
[ ] 3. 局部 paths：有没有？没有则文档写「仅整表」
[ ] 4. clear：clearValidate / restoreValidation / resetValidation？
[ ] 5. scrollToField：有没有？
[ ] 6. 错误 payload：能否 map 到 path→messages？不能就只 _form
[ ] 7. 模板：model 属性名、字段 path 属性名
[ ] 8. rules 写法：Form 级 async-validator？控件函数？并列 schema？
[ ] 9. 业务是否仍用 defaults/load/list/when（C/D 也尽量只保留这些）
[ ] 10. 验收：空提交、reset、load 切换；C 不验收 r.*→宿主红字
```

### 验收最小矩阵（比两个 Input 重要）

| 用例 | 期望 |
|------|------|
| 空提交 | 宿主红字 + `submit()` → `errors` |
| 异步唯一 | loading 后字段错误 |
| 跨字段 equalTo | 确认密码错误 |
| when 显隐 | 隐藏字段不挡提交 |
| form.list 增删 | 新行可校验 |
| load create→edit→create | 无字段泄漏 |
| 卸载再开弹窗 | bind null 不脏校验 |

---

## 推荐优先级（后续投入）

| 优先级 | 库 | 理由 |
|--------|-----|------|
| P0 已完成 | Element / Naive / Ant Design Vue | 后台中后台主力 |
| P1 | TDesign、Arco | 国内后台增量大，API 接近 B |
| P1 | Vant | 移动端 H5 刚需 |
| P2 | View UI Plus | 老项目迁移 |
| P2 | Quasar / Vuetify | 文档写清 C 级边界即可 |
| P3 | NutUI / Varlet / Semi | 按社区需求 |
| 不做官方包 | vee-validate 系 | 避免双引擎 |

---

## 和「校验周期」的关系

```
defaults/rules → model 绑定 → 用户编辑
       ↓
  form.submit / validate
       ↓
  adapter.validate(host)     ← 各库差异集中在这里
       ↓
  成功 onSubmit(values)
  失败 mapErrors → 业务 errors + 宿主红字
       ↓
  reset / load → clearValidate / afterModelReset
```

状态、联动、数组、Zod、mode 都在 core/vue；  
**换库 = 只换 adapter + 模板字段属性名**。  
把上表补全，别人接新库就有固定步骤，不必再从零猜。

---

## 相关文档

- [custom-adapter.md](./custom-adapter.md) — defineAdapter 写法与 Naive/Antd 完整示例  
- [scenarios.md](./scenarios.md) — 业务场景  
- [use-form-modes.md](./use-form-modes.md) — create/edit/detail  
