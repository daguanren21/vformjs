# 实践案例:草稿持久化的"修复式恢复"

> 来源:本目录 10 份 harness 研究报告(见 [README](./README.md))。
> 本文记录从研究报告到 vformjs 真实 API 的一次完整落地:借了哪几个零件、为什么、各自改成了什么样。

## 借鉴矩阵

| 借来的概念 | 出处 | vformjs 落点 |
|-----------|------|-------------|
| 结构化 ReasonCode(源头决策,不做字符串解析) | multica `dispatch/reason.go` | `DraftRestoreReason`:`empty / malformed / unsupported-version` |
| history healing:按当前 schema 修复陈旧状态,而非拒绝 | Kun `history-healing` | 按**当前 reset 基线**的形状修复草稿:未知路径丢弃、缺失路径补齐 |
| 显式 fresh 状态,绝不静默半成品 | multica `FreshSessionRetryPrompt`、deepchat `turnResumeContract` | `status: 'fresh'`:草稿不可用时原值不动,原因随结果返回 |
| 显式 resume 契约,restore 返回结构化结果 | deepchat `turnResumeContract.ts` | `DraftRestoreResult`:`status + reason? + droppedPaths + filledPaths` |

没借的:steering 注入/队列、compaction、select_tools 渐进披露——agent 循环的零件,表单状态机没有对应物。借鉴的前提是"问题同构",不是"功能照搬"。

## 最终 API

```ts
const snap = form.snapshotDraft()           // { version, savedAt, values },JSON 安全
const result = form.restoreDraft(unknown)   // 绝不抛异常

result.status === 'restored'  // 草稿与基线形状完全一致
result.status === 'healed'    // 已应用,但有裁剪(droppedPaths)或补齐(filledPaths)
result.status === 'fresh'     // 草稿被拒(reason 给出原因),当前值分毫未动
```

## 从 harness 概念到表单语义的四个转译

**1. 修复基准 = 当前 reset 基线,不是默认值。**
Kun 的 healing 以"当前会话 schema"为基准;表单里对应物是 baseline——`load('edit')` 会把它 rebase 成服务端记录。草稿对齐的是"用户此刻看到的那张表",不是出厂默认值。基线之外的草稿路径(上个版本删掉的字段)进 `droppedPaths`,基线里新增的字段进 `filledPaths`。

**2. restore 不 rebase——dirty 必须诚实。**
harness 的 fresh-session 哲学是"状态边界显式化"。落到表单:恢复的草稿是**未保存的用户输入**,不是新基线。所以 restore 后 `dirty === true`、`changedPaths` 如实反映差异,`reset()` 仍回到基线。偷偷 rebase 等于对用户撒谎说"这已经保存了"。

**3. 修复报告到子树根,不逐叶子刷屏。**
`filledPaths` / `droppedPaths` 只报**第一个分叉点**:整个 `profile` 子树缺失就报 `'profile'`,而不是把 `profile.city`、`profile.zip` 逐条列出。ReasonCode 的精神是"可行动",逐叶子报告会把 UI 提示淹掉。

**4. 数组和原子值是叶子,不做深修复。**
草稿里 `tags: ['a','b']` 直接采信;草稿是对象、基线是数组(或反过来)才算结构错配,回退基线值并记入 `filledPaths`。数组元素级 healing 是版本迁移的活,不该藏在 restore 里。

## 为什么不内置 localStorage

core 保持存储无关:`snapshotDraft()` 返回 plain JSON,`restoreDraft()` 接受 `unknown`。Vue/React/小程序各自接线,防抖、加密、多端同步都是宿主策略。这和 multica 把 provider 差异收进 `codex_*` 文件是同一招——**易变层靠边放,核心契约保持小而硬**。

## 验证

- `packages/core/test/draft.test.ts`:11 例,覆盖快照隔离、三态恢复、结构错配、垃圾输入不碰原值、错误清理、不 rebase、edit 基线形状、reset 事件。
- `packages/vue/test/draft.test.ts`:2 例,验证响应式 `dirty` / `changedPaths` / `errors` 投影随 restore 更新。
