# kimi-code (MoonshotAI/kimi-code, TypeScript) — Harness 研究

## 1. 架构总览
pnpm monorepo。分层清晰:
- **apps**:`kimi-code`(CLI)、`kimi-inspect`、`kimi-web`、`vis`、`vscode`。
- **核心**:`agent-core`(harness 主体)+ `agent-core-v2`(下一代实验)、`kosong`(LLM 抽象:provider/catalog/generate/message/tool/usage)、`klient`、`protocol`、`transcript`、`minidb`、`pi-tui`(自研 TUI)、`acp-adapter`/`acp-server`(Agent Client Protocol)、`kaos`、`kap-server`、`tree-sitter-bash`。
证据:packages/ 目录;agent-core/src/loop/run-turn.ts。

## 2. Agent loop
- 单文件可读:`loop/run-turn.ts`,`while(true)` → `executeLoopStep`(turn-step.ts)→ `stopReason === 'tool_use'` 继续,否则问 `hooks.shouldContinueAfterStop` 决定是否续跑;`maxSteps` 上限 + `AbortSignal` 贯穿。
- step 内:`buildMessages` → llm → `tool-scheduler.ts` 调度工具;`tool-access.ts` 声明工具并发访问集(`ToolAccesses.all()` 串行、否则可并行),调度器据此合并同 batch 的并行工具调用。
- **媒体降级链**:normal → `media-degraded` → `media-stripped` 三档 buildMessages;图片格式拒绝或二次 413 时自动剥掉媒体重发,且降级状态对后续 step 持久生效(run-turn.ts:120-200)。
- 事件经 `dispatchEvent` 外流;`llm-request-logger/recorder` 记录每次请求 trace。

## 3. 工具系统
- `tools/builtin/{file,shell,web,collaboration,planning,goal,state}`:read/write/edit/glob/grep/bash/fetch-url/web-search 等,每个工具配同名 `.md` prompt 文件。
- `args-validator.ts` 参数校验,`tools/policies` 策略层,`tools/providers` 外部工具源,`store.ts` 工具表;`agent/permission`(policies + matches-rule)做规则匹配审批。
- 错误即工具:`describeMissingTool` 处理幻觉工具名。

## 4. 上下文管理
- `agent/compaction/`:`full.ts`、`micro.ts`、`handoff.ts` 三种策略 + `strategy.ts` 选择器,compaction 指令独立成 markdown(compaction-instruction.md)。
- **渐进式工具披露**:`select_tools` 工具——动态工具 schema 不进 immutable 顶层 `tools[]`,模型按需按名加载,schema 以 `role:'system'` + `messages[].tools` 注入,下一 step 即可执行;循环每 step 重读工具表(select-tools.ts 头注释)。与 compaction 协同:beforeStep 跑压缩后 tool table 与 messages 取自同一状态,避免 schema/ledger 错位。
- 上下文组装在 `agent/context/`(含 dynamic-tools 变体)。

## 5. 会话与持久化
- `transcript` 包(会话记录)+ `minidb`(轻量存储);`agent/replay/` 支持按 turn 重放(build.ts/turns.ts);`agent/records` 记录用量与轨迹。

## 6. 可扩展性
- MCP:`agent-core/src/mcp`;plugin:`plugin.ts` + 顶层 `plugins/` 目录;skill:`agent/skill` + `agent-core/src/skill`。
- 多代理:`agent/swarm`(enter/exit reminder md)、`tools/builtin/collaboration`、`agent/background`(后台代理)、`agent/cron`(定时)。
- 模型接入:`kosong` 统一抽象(provider/catalog/capability),能力×flag 双门控(如 toolSelectEnabled)。
- 前端接入:ACP(adapter+server 双包)接 Zed 类编辑器,另附 vscode app。

## 7. 差异化亮点
1. **渐进式工具披露(select_tools)**:工具 schema 按需注入对话而非塞进系统提示,省 token、可无限扩展工具集;subagent 同权。这比"全集 tools[] + 截断"更优。
2. **媒体降级链**:413/格式错误时降级重发且状态持久——多模态会话的韧性设计,别家多是直接报错。
3. **ToolAccesses 并发声明**:工具自报资源访问面,调度器自动并行化安全组合;select_tools 故意声明全量访问强制串行,防双注入——设计意图写成注释的范例。
4. **三档压缩策略**(full/micro/handoff)分文件实现,handoff 直接产出交接文档形态。
5. **hooks 贯穿 loop**:`beforeStep`、`shouldContinueAfterStop` 等钩子使停止判断可编程(如验证器让 agent 继续改)。
