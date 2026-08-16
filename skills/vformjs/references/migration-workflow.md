# 存量表单迁移工作流（Agent）

## 核心判断

审计报告里的“需要手工”表示**不能由确定性 codemod 安全替换**，不表示必须由人逐行敲代码。

AI Agent 可以读取组件、类型、子组件合同和测试后完成大部分语义迁移；人只需要处理无法从仓库证据推出的业务决策，并审阅最终行为。

| 表单形态 | Agent 可直接处理 | 需要决策门 |
|---|---|---|
| 常规单表单 | defaults、rules、host/item、load、reset、submit | 成功后的页面动作是否保持 |
| 动态表单 | 顶层 `when`、条件 `rules`、`form.list`、通配规则、`options` | 隐藏值和级联值的保留/清空语义 |
| 复杂表单 | 生命周期、显式 tracking、草稿、接口错误、数组操作 | 领域计算、上传、payload 转换、性能目标 |
| 多表单 | 一成员一 form、`useFormGroup`、聚合校验/错误/模式 | section ownership 与最终 payload 边界 |
| 自定义 UI | A/B/C/D 分类、A/B adapter、C 整表 bridge | 缺失的宿主 API；D 类必须停止接入 |

## 前置证据

迁移前必须读完，不靠片段猜测：

1. 整个表单组件及同文件 template。
2. 被父组件调用的公开方法和所有调用方。
3. 子表单的 props、emits、`defineExpose` 或实例类型。
4. 表单模型、详情响应和提交 payload 类型。
5. UI Form 实例的 validate/reset/clear/scroll 合同。
6. 覆盖 create、edit、reset、invalid submit 的现有测试；没有时运行实际页面路径。
7. `package.json` 中的 Vue、UI、并列表单引擎和 vformjs 版本。

信息存在于仓库时直接读取。只有多个业务语义都合理且会产生不同结果时，才向维护者提出决策问题。

## 步骤一：分类，不写代码

先记录两个事实分类：

- UI/校验能力：A、B、C 或 D（见 `adapter-matrix.md`）。
- 页面形态：regular、dynamic、complex 或 multi-form。

分类只决定需要哪些配置和验证路径，不改变官方 form 入口。不要按页面代码量
或开发者角色切换 factory，也不要引入没有行为证据的能力。

然后列出迁移边界：

```text
模型 owner:
宿主 owner:
新建基线:
编辑数据来源:
激活规则:
隐藏字段策略:
动态行 identity:
远程选项依赖:
提交 payload:
接口字段错误:
成功后动作:
```

任何一项不清楚，先继续追调用方、类型和测试，不开始替换。

## 步骤二：冻结行为合同

至少记录下面的可观察行为：

| 状态/动作 | 期望 |
|---|---|
| create 首次打开 | 使用 factory defaults，没有上一条记录残留 |
| edit 加载 | 详情值成为 reset 基线，`dirty === false` |
| edit 后再 create | id、数组、条件字段回到 create defaults |
| invalid submit | 宿主显示字段错误，不调用 API |
| API 字段错误 | 回到拥有该字段的 form/section |
| reset | 值、错误、dirty、动态行恢复到当前基线 |
| 条件字段隐藏 | 按已确认策略保留或清空值，inactive rule 不阻塞提交 |
| 动态行删除/移动 | key 与错误跟随业务行，不写入 payload |
| 选项依赖变化 | 旧请求取消；字段按已确认策略重置 |
| 多表单失败 | API 不执行；滚动到第一个无效 section |
| 重复提交 | 默认 join；只有明确需要时才设 parallel |

## 步骤三：按形态迁移

### 常规

- 保留一个 model source of truth。
- 把所有 create 字段放入 `defaults`，包括 `undefined` id。
- 用 `form.load('create' | 'edit' | 'detail')` 替代手工 assign + clear。
- API 调用进入 `onSubmit` 或单次 `submit(handler)`，不能提交两次。
- 一次性迁移全部 template/caller；删除旧 ref、rules、reset 和提交锁。

### 动态

- 条件显示用 `when`，条件规则写进同一个 `rules` map。
- 数组结构操作用 `form.list()`；行内业务字段仍留在 model。
- 数组规则使用 `rows.*.field`，不手工重建每个索引的规则。
- 远程/级联选项优先顶层 `options`；确认 dep 变化是否重置当前值。
- 保留真正的领域 watcher；不要把所有 watcher 机械改成 `linkage`。

### 复杂

- UI 布局、上传、表格列和领域计算保持原位。
- 大模型先评估 `tracking: 'explicit'`，字段用 `form.field(path)` 或 `form.set` 更新。
- 可预期 API 失败用 `submitFail(error, { errors })`。
- 草稿用 `form.snapshotDraft()` / `form.restoreDraft()`；不要把恢复后的草稿 rebase 成 clean。
- payload transform 使用 resolver 或清晰的 submit mapper，不污染 UI model。

### 多表单

- 每个独立宿主持有自己的 form；禁止制造巨型共享 Form。
- 父级只用 `useFormGroup` 聚合 validate、submit、dirty、errors、load 和 reset。
- 子组件优先 props down / events up；必须暴露命令式 API 时，只暴露 `FormGroupMember` 最小合同。
- `group.load(mode, slices)` 的 key 必须和成员名、详情数据切片一致。

## 步骤四：干净切换

必须一次迁完当前边界：

- 所有旧 model/rules/ref/caller 已迁移或删除。
- 不保留“双状态机”兼容层。
- 不同时调用旧 `validate()` 与 `form.submit()`。
- 不同时把同一输入绑定到旧 model 和 `form.model`。
- 不为了减少 diff 保留失效 watcher、reset helper 或错误映射。

## 步骤五：验证

按改动表面运行最小但完整的验证：

1. typecheck 和目标项目 build。
2. 实际打开 create、edit、detail（若存在）。
3. 空提交、有效提交、API 字段错误。
4. edit → create → edit 的基线切换。
5. 动态场景：显隐、增删移动、级联竞态。
6. 多表单：任一 section 失败、全部成功、reset。
7. 大表单：目标数据规模下的输入响应与 submit 时延。

测试可观察行为，不测试源码文本。无法启动实际页面时，明确写出未验证项，不能把 build pass 当成行为通过。

## 必须由维护者决定的门

Agent 不能从仓库证据推出以下语义时，完成其余可达工作后再提问：

- 字段隐藏时值应保留、清空还是从 payload 删除。
- 上游选项变化时已选下游值是否允许保留。
- UI model 与 API payload 是否必须分离。
- 多个 section 是否必须原子提交。
- 子组件应保有 form ownership 还是上移到父组件。
- 现有并列表单引擎是替换还是保留。D 类禁止双绑。
- 性能目标和最大数组/模型规模。

## 敏感内容

Agent 可在授权工作区内读真实源码来完成迁移，但公共输出必须脱敏：

- 不复制项目路径、私有包名、内网地址、租户/人员信息、token、真实 payload。
- 文档和 issue 使用重新构造的最小示例，不贴业务源码片段。
- API、组件、模型和示例值改成 `recordApi`、`BaseSection` 等通用占位符。
- 验证日志只保留命令、结果和非敏感错误摘要。

## 推荐提示词

```text
使用已安装的 vformjs skill 迁移这个表单。

先读取完整组件、调用方、子表单合同、模型/API 类型和现有测试；
输出 A/B/C/D 等级、regular/dynamic/complex/multi-form 分类，以及行为合同。
能从仓库确定的内容直接处理；只有隐藏值、级联重置、payload 或 section ownership
存在多种合理语义时才提问。

要求干净切换：迁移所有 caller，删除旧 model/rules/ref/reset/submit 状态机，禁止兼容层。
迁移后运行 typecheck、目标 build，并实际验证 create/edit/reset/invalid submit；
动态或多表单场景补充对应行为验证。
公共说明必须脱敏，不输出项目路径、私有包名、内网地址或真实业务数据。
```

## 交付格式

1. A/B/C/D 与表单形态判定。
2. 保留的行为合同和已确认决策。
3. 修改文件与 clean-cutover 范围。
4. 运行过的命令和准确结果。
5. 未验证项或仍需维护者决定的业务门。
6. 脱敏后的变更摘要；真实业务 diff 只留在授权仓库。
