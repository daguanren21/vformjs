# create / edit / detail

## 谁持有 form

| 场景 | form 位置 | 列表 |
|------|-----------|------|
| 弹窗 | `XxxDialog.vue` 内 | 只调 `openCreate/Edit/Detail` |
| 路由 | create/edit 页 | `router.push`，列表无 form |

**列表页禁止 useForm / useElForm。**

## 详情 UI

- ❌ 整表 `:disabled="true"` 当详情  
- ✅ `Descriptions` / 纯展示  
- `form.readonly` / `mode === 'detail'` 只表示状态；是否渲染 form 由页面决定  

## API

```ts
form.load('create')                 // 工厂 defaults，清脏数据
form.load('edit', detail)           // defaults 打底 + payload
form.load('detail', detail)         // 可选；UI 仍建议 Descriptions
form.mode // 'create' | 'edit' | 'detail'
form.editable // create|edit
form.readonly // detail
```

## 弹窗骨架

```ts
const form = useElForm({ defaults, rules, onSubmit: save })

async function openCreate() {
  visible.value = true
  form.load('create')
}
async function openEdit(id: string) {
  visible.value = true
  form.load('edit', await api.get(id))
}
async function openDetail(id: string) {
  visible.value = true
  detail.value = await api.get(id)
  // 可不 load form
}
```

```vue
<el-form v-if="form.editable" v-bind="form.el">...</el-form>
<el-descriptions v-else border>...</el-descriptions>
```

卸载弹窗时 `form.el` 的 ref 会 `bindHost(null)`，避免下次脏校验。
