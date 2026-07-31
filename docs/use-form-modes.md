# useForm：新增 / 编辑 / 详情

更多业务场景（联动、数组、服务端错误、自定义 UI）见 [scenarios.md](./scenarios.md)。  
接入 Naive 等其它库见 [custom-adapter.md](./custom-adapter.md)；  
主流库能不能接、难度见 [ecosystem-adapters.md](./ecosystem-adapters.md)。


## 谁持有 form？

| 场景 | form 在哪 | 列表做什么 |
|------|-----------|------------|
| **弹窗** | `XxxDialog.vue` 内部 | `dialogRef.openCreate/Edit/Detail(id)` |
| **独立页面** | create/edit **表单页** | `router.push` |

列表页 **永远不** `useForm`。

详情有两种 UI 策略（推荐 2）：

1. ~~整表 `:disabled="true"`~~ —— 体验差，不像详情  
2. **`Descriptions` / 纯文字展示** —— 正确做法  

`form.mode === 'detail'` / `form.readonly` 只表示「当前是详情态」；  
**是否渲染 form 由页面/弹窗自己决定**，不要默认 disabled 表单。

---

## 场景 A：弹窗

```
ListPage（无 form）
  └─ <TaskDialog ref="dialogRef" />

TaskDialog（有 form）
  openCreate → form.load('create') + 显示表单
  openEdit   → fetch + form.load('edit', detail) + 显示表单
  openDetail → fetch + form.load('detail', detail) + 显示 Descriptions
```

```vue
<!-- Dialog 内 -->
<el-form v-if="form.editable" v-bind="form.el">...</el-form>

<el-descriptions v-else-if="form.readonly" border>
  <el-descriptions-item label="标题">{{ form.model.title }}</el-descriptions-item>
  ...
</el-descriptions>
```

详情也可以完全不调用 `form.load('detail')`，单独 `detailView = await api.get(id)` 更干净。  
`load('detail')` 的价值是：和 create/edit **共用一套状态机/关闭逻辑**，UI 仍用文字展示。

---

## 场景 B：路由页面

```
/tasks              ListPage（无 form）
/tasks/create       FormPage  form.load('create')
/tasks/:id/edit     FormPage  form.load('edit', detail)
/tasks/:id          DetailPage  纯展示，可以没有 form
```

### 推荐拆页

```ts
// FormPage.vue — 只服务 create + edit
const form = useElForm({ defaults, rules, onSubmit })
onMounted(async () => {
  if (route.meta.mode === 'create') {
    form.load('create')
  } else {
    form.load('edit', await api.get(route.params.id))
  }
})
```

```vue
<!-- DetailPage.vue — 没有 useForm，或仅用 model 快照 -->
<el-descriptions v-loading="loading" border>
  <el-descriptions-item label="标题">{{ detail?.title }}</el-descriptions-item>
</el-descriptions>
```

### 若坚持单页切换

```ts
// 同一组件内 page = list | create | edit | detail
// create/edit 分支渲染 <el-form>
// detail 分支渲染 <el-descriptions>，不要 :disabled form
```

Playground：`页面 新增/编辑/详情` demo 即此模式（假路由 state）。

---

## API

```ts
form.load('create')
form.load('edit', detail)     // 回填；reset → 本次 detail
form.load('detail', detail)   // 模式=详情；submit 拒绝

form.mode       // create | edit | detail
form.readonly   // detail
form.editable   // create | edit
```

| mode | 建议 UI |
|------|---------|
| create | 表单 |
| edit | 表单 |
| detail | **Descriptions / 文本**，不是 disabled 表单 |

---

## 不要

```vue
<!-- ❌ 详情像被锁死的编辑页 -->
<el-form :disabled="true">...</el-form>
```

```ts
// ❌ 列表页持有 form
const form = useElForm(...)
form.load('edit', row)
```

---

## 与 useZodForm

`useZodForm` 同样支持 `load` / `mode` / `readonly`：

```ts
import { useZodForm } from '@vformjs/element-plus'

const form = useZodForm({
  schema,
  defaults: { title: '', owner: '' },
  onSubmit: async (v) => api.save(v),
})

// Dialog 内
form.load('create')
form.load('edit', detail)
// 详情仍用 Descriptions，不要 disabled 表单
```

字段 rules 由 schema 生成，**整表 safeParse**（含 refine）在字段 blur/change 时就会跑，
错误挂在对应 `prop` 上，ElForm 正常红字。