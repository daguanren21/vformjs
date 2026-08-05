# CodePilot (op7418/CodePilot, TypeScript/Next.js+Electron) — Harness 研究

## 1. 架构总览
桌面优先的 agent 工作台:Next.js(renderer/UI)+ Electron(`electron/`:main/preload/terminal-manager)+ 自研 harness 层(`src/lib`)。**双运行时并存**:自研 loop(`agent-loop.ts`)与 Claude Agent SDK 桥(`bridge/permission-broker.ts` 依赖 `@anthropic-ai/claude-agent-sdk`),两条路径共享同一套 provider 选项消毒器防语义漂移。
证据:src/lib/agent-loop.ts 头注;bridge/;electron/。

## 2. Agent loop
- `agent-loop.ts`(1023 行):Vercel AI SDK `streamText()` **手动 while 循环**(明确不用 maxSteps/stopWhen),`while (step < maxSteps)`;`timeoutCtl.guardStream(result.fullStream)` 给流加超时护栏。
- **doom loop 检测**:`lastToolNames` 追踪最近工具调用序列;**skill-nudge 启发式**:`distinctTools` 集合判断该不该提示模型用 skill。
- **provider 选项消毒**:`sanitizeClaudeModelOptions` 统一处理 Opus 4.7 迁移(manual thinking→adaptive、跳过 context-1m beta),自研路径与 Claude Code SDK 路径共用——"两个 runtime 不许漂移"写成注释;第三方代理走额外过滤。不兼容参数降级时发 SSE `status` 通知告知用户。
- `agent-loop-anthropic-wire.ts` 处理 Anthropic 原始 wire 格式;`aisdk-trace.ts` 追踪。

## 3. 工具系统
- `builtin-tools/`:ask-user-question、cli-tools、dashboard、media、memory-search、notification、session-search、widget-guidelines——明显 GUI/工作台导向(通知、仪表盘、部件指南都是一等工具)。
- `agent-sdk-agents.ts`/`agent-sdk-capabilities.ts`:子代理由 Claude Agent SDK 提供;`builtin-mcp-bridge.ts` + `builtin-mcp-catalog.ts` 内置 MCP 目录。
- 权限:`bridge/permission-broker.ts` 把 SDK 的 PermissionUpdate 代理到 GUI 审批;`bash-validator.ts` 命令校验。

## 4. 上下文管理
- `memory-search.ts`(记忆检索)、`session-search.ts`(跨会话搜索)、`assistant-workspace.ts`/`assistant-heartbeat.ts`(常驻 assistant 工作区与心跳);上下文策略集中在 GUI 会话管理中。[INFERENCE] 深度压缩逻辑主要依赖 Claude SDK 侧。

## 5. 会话与持久化
- Electron 桌面持久化 + `archive-html-asset-client`/`artifact-export`(工件导出 HTML);`notification-lifecycle`/`notification-click-queue`(系统通知队列与点击跳转回会话)。

## 6. 可扩展性
- **IM 桥**:`bridge/channel-adapter|channel-router|delivery-layer|conversation-engine` + `feishu-app-registration`——同一会话引擎可挂飞书等 IM 渠道,消息路由/投递分层。
- MCP:builtin-mcp-catalog 内建目录 + 标准 MCP 桥。
- `agent-registry.ts`、`auto-discover-models.ts`(自动发现可用模型)。

## 7. 差异化亮点
1. **双运行时防漂移**:自研 loop 与官方 SDK 共享 sanitize 函数——既保留官方能力更新,又握有自研路径的可控性,工程上很务实。
2. **doom loop 检测进主循环**:同一工具序列反复出现即干预,在 harness 层兜底模型卡死。
3. **渠道路由架构**:conversation-engine 与 delivery-layer 解耦,桌面通知、飞书机器人共用一条会话管线——agent 即服务,GUI 只是其中一个出口。
4. **GUI 原生工具集**:notification/dashboard/widget 都是模型可调用工具,模型能主动操作桌面界面元素。
5. **SSE status 通知降级事件**:参数被消毒降级时主动告知用户"实际发送值",而不是静默改写。
