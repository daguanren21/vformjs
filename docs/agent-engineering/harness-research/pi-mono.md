# pi-mono (earendil-works/pi, TypeScript) — Harness 研究

## 1. 架构总览
9 包 monorepo,依赖方向严格:`ai`(模型层)→ `agent`(循环层)→ `coding-agent`(应用层)→ `tui`/`client`/`server`;外加 `protocol`(通信协议)、`storage`、`evals`(评测)。应用与内核完全解耦——`agent` 包零 UI 依赖,可独立发布复用。
证据:packages/agent/src/agent-loop.ts;packages/coding-agent/src/core。

## 2. Agent loop
`agent-loop.ts`(~800 行,纯函数风格,注入 `StreamFn`,完全可测):
- **双层循环**:外层处理"agent 停后新到的 follow-up 消息",内层 `while (hasMoreToolCalls || pendingMessages.length > 0)`。
- **steering 消息**:用户在 agent 运行中输入的插队消息,在下一次 assistant 响应前注入上下文(`getSteeringMessages` 回调,循环开头必查)——"边跑边指挥"的一等支持。
- **截断保护**:`stopReason === "length"` 时该消息里所有 tool call 参数可能残缺,**全部直接 fail**,绝不执行截断参数(failToolCallsFromTruncatedMessage)。
- **每 turn 可换模型**:`prepareNextTurn` 返回快照可替换 context/model/thinkingLevel,`shouldStopAfterTurn` 钩子自定义停机条件。
- 事件流完整:turn_start/message_start/.../turn_end/agent_end,逐事件 emit。

## 3. 工具系统
`coding-agent/src/core/tools/`:bash、edit(独立 edit-diff 渲染)、read、write、grep、find、ls + `output-accumulator`(大输出聚合)、`truncate.ts`(输出截断)、`tool-definition-wrapper`。
- **`file-mutation-queue.ts`**:文件写操作排队串行化,避免并发工具调用互相覆写。
- `bash-executor.ts`/`exec.ts` 独立执行器;`project-trust.ts` + `trust-manager.ts` 实现目录级信任模型(未信任项目先问)。

## 4. 上下文管理
- `core/compaction/`:`compaction.ts` + **`branch-summarization.ts`**——因会话是树,压缩可以按分支做摘要。
- `agent/harness/messages.ts` + `prompt-templates.ts` + `system-prompt.ts` 组装上下文;`cache-stats.ts` 统计 prompt cache 命中。

## 5. 会话与持久化
- **append-only JSONL 树**(`session-manager.ts`):会话文件 `.jsonl` 按 `timestamp_sessionId` 命名,消息以树结构追加——天然支持 fork/回退/分支浏览,这也是 branch-summarization 的地基。
- `migrations.ts` 版本迁移;`export-html` 一键导出。

## 6. 可扩展性
- `extensions/`(应用内扩展)+ `sdk.ts`(编程接入)+ `protocol`/`server`/`client`(远程会话)。
- `skills.ts`、`slash-commands.ts`、`modes/`(模式切换)。
- 模型层 `packages/ai`:provider 插件目录 + `models.generated.ts`(生成的模型清单)+ oauth/bedrock/图片 API;`model-registry`/`model-resolver`/`remote-catalog-provider` 支持远程模型目录。

## 7. 差异化亮点
1. **双层 loop + steering 消息**:排队消息与工具调用在同一内层循环里统一调度,用户随时插话不打断流程——交互体验最接近"结对伙伴"。
2. **length 截断整批 fail**:对截断工具参数的零容忍,直接消掉一类隐蔽的文件损坏事故。
3. **会话即 JSONL 树**:fork/分支/按分支压缩摘要全部从存储模型自然导出,而不是另做快照系统。
4. **分层洁癖**:agent 循环不 import 任何 Node/UI 设施(streamFunction 注入),evals 包可直接驱动同一循环做回归评测。
5. **file-mutation-queue**:把"文件写串行化"做成显式队列而非散落在各工具的锁,简单可靠。
