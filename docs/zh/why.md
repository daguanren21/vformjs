# 为什么要多一层 vformjs

Element、Naive UI、Ant Design Vue 已经有成熟的 Form。后台项目里，字段渲染和校验只覆盖了一部分工作。模式切换、重置基线、提交状态、条件规则、动态行和接口错误，还是会散进每个弹窗和页面。

vformjs 继续使用宿主 Form 的红字、焦点和滚动，把重复的生命周期放进一个有类型的实例里。

## 两边各管什么

UI 组件库继续管理：

- 输入框、标签、布局和可访问性；
- rules 执行和字段错误展示；
- 焦点、滚动和组件自己的交互。

vformjs 管理：

- 新建、编辑、详情三个模式；
- 默认值、重置基线、dirty 和 changedPaths；
- 提交状态和结构化结果；
- 条件显隐、动态规则和联动；
- 带稳定 key 的动态数组；
- 响应式接口字段错误。

## 哪些项目值得试

下面这些场景可以拿一个表单试接：

- 项目已经使用 Element Plus、element-ui、Naive UI 或 Ant Design Vue；
- 后台有很多 CRUD 弹窗和表单页；
- 团队要保留原生模板和业务组件；
- load、reset、submit、linkage 代码反复出现；
- Vue 2.7 和 Vue 3 项目希望沿用同一套表单 API。

## 哪些项目直接用别的方案

表单很少、逻辑简单时，UI 库原生 Form 足够用。

团队需要独立的字段级表单引擎时，可以选 vee-validate、Vuelidate 或 TanStack Form。同一批字段只留一个状态主人。

产品需求包含 Schema 渲染、自动生成控件或可视化设计器时，FormKit、FormCreate、Vueform、Formily 已经覆盖得更完整。

## 校验归属写清楚

vformjs 的 `rules` 交给真实宿主 Form 执行。有 active rules 却没有 adapter 时，提交会返回配置错误，不会带着未校验的数据继续走。没有 UI 宿主的表单用 `useZodForm`，校验由 Zod 完成。

```ts
// Element Plus 宿主负责红字和字段校验
const form = useElForm({ defaults, rules, onSubmit })

// 没有 UI 宿主，Zod 负责校验
const form = useZodForm({ schema, defaults, onSubmit })
```

[打开快速开始](/zh/guide)，或者先看[可运行示例](/zh/examples)。
