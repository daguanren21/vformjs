# 可运行示例

本页直接运行三个现场示例，按一次接入通常遇到的顺序排列：弹窗 CRUD、条件联动、动态数组与 Zod。每个示例持有独立的表单实例，可以直接改字段、提交和重置来观察状态。

- [弹窗 CRUD](#dialog-crud)：`form.load()` 贯穿新建、编辑、详情
- [条件联动](#conditional-linkage)：`when`、`whenRules` 与 `linkage`
- [动态数组与 Zod](#zod-list)：`form.list()` 管理成员行，提交返回 schema 解析后的数据

<LiveCrudDialogDemo locale="zh" />

<LiveConditionalDemo locale="zh" />

<LiveZodListDemo locale="zh" />

## 仓库 playground

仓库里还有四套接真实 UI 组件库的 playground。

### Element Plus · Vue 3

覆盖基础表单、CRUD 弹窗和页面、条件字段、跨字段规则、动态数组、Zod、自定义 adapter。

```bash
pnpm dev:vue3
```

[查看源码](https://github.com/daguanren21/vformjs/tree/main/playgrounds/vue3-element-plus)

### element-ui · Vue 2.7

同一套新建、编辑、详情、重置和提交流程，可以放进遗留项目验证。

```bash
pnpm dev:vue2
```

[查看源码](https://github.com/daguanren21/vformjs/tree/main/playgrounds/vue2-element-ui)

### Naive UI · Vue 3

使用官方 `@vformjs/naive-ui` 包，覆盖 `useNaiveForm`、弹窗模式、宿主校验和 Zod。

```bash
pnpm dev:naive
```

[查看源码](https://github.com/daguanren21/vformjs/tree/main/playgrounds/vue3-naive-ui)

### Ant Design Vue · Vue 3

使用官方 `@vformjs/ant-design-vue` 包，覆盖局部校验、滚动、弹窗模式和 Zod。

```bash
pnpm dev:antd
```

[查看源码](https://github.com/daguanren21/vformjs/tree/main/playgrounds/vue3-antd-vue)

## 验证哪些行为

一次有意义的接入至少跑完下面五步：

1. 空表提交，确认宿主显示字段错误。
2. 加载编辑数据，改一个值，查看 `dirty` 和 `changedPaths`。
3. 重置，确认回到刚加载的记录。
4. 用 `setErrors()` 写入接口错误，再修改出错字段。
5. 切到详情模式，确认 submit 被拒绝。

[回到首页改一遍现场表单](/zh/#live-demo)。

## 反馈

接入问题和评估结果直接发到仓库：

- [GitHub Discussions](https://github.com/daguanren21/vformjs/discussions)：用法问题与案例展示
- [Integration-feedback issue](https://github.com/daguanren21/vformjs/issues/new?template=integration-feedback.yml)：记录接入中可行或被阻塞的部分
