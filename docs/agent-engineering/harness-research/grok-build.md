# grok-build (xai-org/grok-build, Rust) — Harness 研究

## 1. 架构总览
超细粒度 Cargo workspace(~50 个 crate,全部 `xai-*` 前缀)。分层:
- **入口/TUI**:`bin/grok-build`、`xai-grok-pager*`(自研分页器/PTy harness,带 durable log 可 reattach)、`xai-grok-shell`(会话宿主,含 ACP server)。
- **核心 harness**:`xai-grok-agent`(Agent 定义/策略)、`xai-chat-state`(actor 模型会话状态机)、`xai-agent-lifecycle`(local/send 两类生命周期)、`xai-grok-tools` + `xai-grok-tools-api`(工具实现与桥接)、`xai-grok-sampler` + `xai-grok-sampling-types`(模型采样抽象)。
- **支撑**:`xai-grok-config(-types)`、`xai-grok-memory`、`xai-grok-hooks`、`xai-grok-sandbox`、`xai-grok-secrets`、`xai-grok-mcp`、`xai-grok-subagent-resolution`、`xai-codebase-graph`、`xai-fast-worktree`、`xai-acp-lib`(Agent Client Protocol)、`ptyctl`(PTY 控制)。
证据:Cargo.toml workspace members;xai-chat-state/src/actor/mod.rs;xai-grok-agent/src/agent.rs。

## 2. Agent loop
- `xai-chat-state::actor` 是主循环:单 actor `loop {}`(mod.rs:96-98)消费命令通道(events/commands/state/mutations/queries/request_builder 分离),session 事件走 channel 推给主循环。
- 每个 Agent 由 `AgentDefinition` 驱动:name/description/system_prompt、`ToolBridge`、`PermissionMode`、`CompactionPolicy`、`ReminderPolicy`、`CompletionRequirement`(agent.rs:58-239)——即"agent = 可序列化定义 + 策略对象"的声明式模型。
- turn 生命周期在 `xai-agent-lifecycle` 的 local/send registry 与 contributors 中编排;工作流级运行在 `xai-grok-shell/src/session/workflow/manager.rs`(`WorkflowManager`,支持 SubagentCancelTarget::WorkflowRunId 细粒度取消)。工具执行经由 `ToolBridge` 路由到 `xai-grok-tools/implementations`。
- [INFERENCE] 流式消费在 shell 层 `session/upload/turn.rs` 与 workflow manager 的 `while let Some(event)` 循环(manager.rs:685)中完成,事件经 raw_rx/persist_rx 双通道:实时派发 + 持久化解耦。

## 3. 工具系统
- 目录即清单:`xai-grok-tools/src/implementations`(含 lsp、grok_build/task 子代理工具、computer/local/terminal 等),另有 attribution.rs、normalization.rs、retry.rs、tool_taxonomy.rs、reminders/、notification/。
- 权限:Agent 级 `PermissionMode` + `xai-grok-sandbox` crate;工具桥 `ToolBridge` 统一派发(bridge.rs)。
- 特色:工具带 `versions.rs`(工具 schema 版本化)、`tool_taxonomy.rs`(分类)、`attribution.rs`(改动归因)。

## 4. 上下文管理
- `xai-chat-state/compaction_mode.rs + compaction_transcript.rs + compaction_utils.rs` 独立成模块;`xai-grok-agent/compaction.rs` 持有 `CompactionPolicy`,`agent.should_auto_compact()`(agent.rs:201)。
- `system_reminder.rs` + `ReminderPolicy`:系统提醒作为一等公民注入(agent.rs 的 `agents_md_user_reminder`、`personas_user_reminder`)。
- prompt 组装集中在 `xai-grok-agent/prompt`,区分 `PromptAudience`。

## 5. 会话与持久化
- `xai-chat-state/persistence.rs` + `xai-grok-shell/session/chat_persistence.rs`;pager 带 durable log 支持 PTY 断线重连回放(tests/leader_pty_e2e/*reattach*)。
- `xai-fast-worktree` 提供 worktree 级隔离/快照能力(快速 git worktree)。

## 6. 可扩展性
- `xai-grok-mcp`(MCP)、`xai-grok-hooks`(hooks 独立 crate)、`xai-grok-plugin-marketplace`(插件市场)、`xai-acp-lib` + shell 的 acp_session*(Zed 系 ACP 协议接入编辑器)。
- 多代理:`xai-grok-subagent-resolution`(子代理解析)、task 工具下 coordinator_state.rs(子代理协调)、workflow 级运行管理。
- 模型接入:`xai-grok-sampler`/`xai-grok-sampling-types` 抽象采样层,`xai-grok-models` 模型清单。

## 7. 差异化亮点
1. **声明式 AgentDefinition**:agent 一切行为(权限/压缩/提醒/完成条件)收敛到一个可序列化定义,`update_policies_from_definition` 热更新——天然适合多代理编排与远程下发配置。
2. **持久化与实时双通道**(raw_rx/persist_rx):事件流一边驱动 UI 一边落盘,pager durable log 支持 PTY 断线重连,移动/远程场景体验好。
3. **CompletionRequirement 作为一等概念**:子代理"何时算完成"可配置,配合 workflow 取消目标(WorkflowRunId)做可靠的批量子代理管理。
4. **crate 级能力边界**:hooks/memory/sandbox/secrets 全部独立 crate,编译期隔离,测试矩阵清晰。
5. **内建 ACP**:既是终端 agent 又直接实现 Agent Client Protocol,编辑器集成不走 MCP 模拟层。
