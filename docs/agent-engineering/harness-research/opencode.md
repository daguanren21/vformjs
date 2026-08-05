# opencode (anomalyco/opencode, TypeScript) — Harness 研究

## 1. 架构总览
大型 monorepo(~30 packages)。核心在 `packages/opencode/src`,Effect(effect-ts)架构贯穿:
- **运行内核**:`session/`(processor/llm/compaction/overflow/retry/revert/run-state)、`agent/`、`tool/`、`permission/`、`bus/`(事件总线)、`llm/`、`mcp/`、`plugin/`。
- **接入面**:`server/`(HTTP)、`tui/`、`cli/`、`web/`、`desktop/`、`console/`、`slack/`、`acp/`、`sdk`/`sdk-next`。
- 另有独立的 `effect-drizzle-sqlite`/`effect-sqlite-node`(存储)、`identity`、`enterprise`。
证据:packages/opencode/src 目录;session/processor.ts;session/llm.ts。

## 2. Agent loop
- `session/processor.ts`:`SessionProcessor.create` 产出 Effect 状态机;`process(streamInput)` 消费 LLM fullStream 事件(`handleEvent` 按 StreamEvent 类型分发),工具调用即来即执:`ensureToolCall` → `updateToolCall` → `completeToolCall`/`failToolCall`,`settleToolCall` 用 Deferred 等结果。
- 停止由 finish 事件驱动;`ctx.shouldBreak`/`ctx.blocked` 处理权限拒绝后中断;summary 生成期间禁用工具(显式抛错 "Tool call not allowed while generating summary")。
- **双运行时**:`session/llm.ts` 优先 native runtime,不可用时回退 AI SDK `streamText`(日志记录选择原因);`experimental_repairToolCall` 修幻觉工具名:大小写不匹配→纠正,彻底未知→改写成 `invalid` 工具(把错误塞回对话让模型自愈)。
- 多步循环与排队在 `session/run-state.ts` + `prompt.ts`(`while(true)` 主驱动)。

## 3. 工具系统
`tool/` 一工具一文件 + 同名 `.txt` prompt:read/write/edit/grep/glob/shell/apply_patch/lsp/webfetch/websearch/todo/task(子代理)/skill/question(向用户提问)/plan(plan-enter/exit)/invalid(幻觉工具兜底)。
- **权限**:`permission/index.ts`——规则集按 `Wildcard.match(permission, pattern)` 匹配(`findLast` 取最后命中,即"后写覆盖先写"),默认动作 `ask`;ask 创建 `Deferred` 挂起,UI 答复 `reply` 放行/拒绝(`RejectedError`/`CorrectedError`,后者可让用户修正参数再执行)。
- 工具上下文带 session/metadata,输出统一 `{title, metadata, output, attachments}`。

## 4. 上下文管理
- `session/compaction.ts` + `session/overflow.ts`(上下文溢出处理)+ `summary.ts`;`instruction.ts` 沿目录树向上收集 AGENTS.md 类指令(while 逐层上溯)。
- `session/reminders.ts` 系统提醒;`system.ts` 系统提示组装。

## 5. 会话与持久化
- `session/session.ts` + `session/message-v2.ts`(消息/parts 模型:reasoning、tool、file 等 part 类型)+ `storage/`(schema.ts/storage.ts,SQLite via effect-drizzle)。
- `session/revert.ts` 回滚;`status.ts` 会话状态;事件经 `bus` + `event-v2-bridge` 广播给 TUI/服务端订阅者。

## 6. 可扩展性
- `plugin/`:provider 插件(azure/cloudflare/github-copilot/openai/xai/modal…)+ `loader.ts` 动态加载 + `pty-environment`。
- `mcp/`:完整 MCP client(auth/oauth/browser 流程)。
- `agent/` + `tool/task.ts` + `agent/subagent-permissions.ts`:子代理带独立权限集。
- 接入面极广:ACP、Slack、桌面、Web、SDK——内核与界面彻底分离的红利。

## 7. 差异化亮点
1. **Effect 全栈**:并发、取消、资源清理(addFinalizer 自动 reject 挂起的权限请求)、错误通道全部类型化——大型 harness 里最严格的工程底座。
2. **工具幻觉自愈链**:`repairToolCall`(大小写修复)+ `invalid` 工具(错误回喂)双层兜底,模型笔误不打断会话。
3. **CorrectedError 权限流**:用户拒绝时可"修正参数后放行",比二元 approve/deny 细一档。
4. **双 LLM 运行时**(native + ai-sdk 回退):既能吃自研协议优化,又保留广兼容逃生门。
5. **事件源架构**:session 状态全部由 part 事件累积而成,bus 广播天然支持多客户端(TUI/Web/Slack)同时订阅同一会话。
