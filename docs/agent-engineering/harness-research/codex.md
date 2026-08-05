# codex (openai/codex, Rust) — Harness 研究

## 1. 架构总览
巨型 Cargo workspace(60+ crate,`codex-rs/`)。分层:
- **协议层**:`codex-protocol`(EventMsg/ResponseItem/TurnAbortReason 等协议类型独立成 crate,前后端共享)。
- **核心**:`core`(Session/TurnContext/tasks/tools/hook_runtime)、`codex-client`/`codex-api`(模型访问)、`rollout`(会话持久化)、`sandboxing` + `linux-sandbox` + `windows-sandbox-rs` + `bwrap`(跨平台沙箱)。
- **接入面**:`tui`、`cli`、`exec`、`app-server*`(JSON-RPC 服务全家桶)、`codex-mcp`(自身作为 MCP server)、`chatgpt`、`cloud-tasks`。
- **可观测**:`otel`(TURN_* 指标)、`analytics`、`rollout-trace`。
证据:codex-rs/ 目录;core/src/tasks/mod.rs;core/src/session/turn.rs:149。

## 2. Agent loop
- **任务模型**:turn 内跑一组 `Task`(RegularTask/CompactTask/ReviewTask/UserShellCommandMode),统一 `RunningTask` 生命周期;`abort_all_tasks(TurnAbortReason)`(Interrupted/Replaced/…)按原因分流处理,中断时先让任务观察取消再丢弃 pending approvals。
- `RegularTask.run`:预热模型会话(SessionStartupPrewarm)后 `loop { run_turn(...) }`,**turn 结束但 input_queue 还有 pending input 就立即续跑**——排队用户输入不丢。
- `run_turn`(session/turn.rs):pre-sampling compact → **`required_mcp_servers_for_input`**(按本轮输入只拉起需要的 MCP server)→ `capture_step_context` → `record_context_updates_and_set_reference_context_item`(world_state,上下文 diff 记录)→ `build_skills_and_plugins`(按输入提及动态注入 skill/plugin)→ hooks → 采样-工具循环(tools/orchestrator + parallel + router)。
- 中断语义:`interrupted_turn_history_marker` 让模型可见"上轮被打断";fork 快照共享同一标记。
- hook_runtime 贯穿:`run_pending_session_start_hooks`、`run_turn_stop_hooks`、pending input 检查/记录。

## 3. 工具系统
- `tools/handlers/`:shell、apply_patch(独立 .lark 语法文件定义补丁文法)、plan、view_image、sleep、unified_exec、request_user_input、request_permissions、tool_search(**工具检索**)、get_context_remaining、multi_agents(含 v2)、dynamic/extension_tools。
- 派发链:`router.rs`(路由)→ `parallel.rs`(并行执行)→ `orchestrator.rs`;`approvals.rs` + `network_approval.rs` 审批;`sandboxing.rs` 决策沙箱档位;`runtimes/`(托管/本地运行时)。
- 沙箱:macOS Seatbelt / Linux Landlock+bwrap / Windows 独立 crate,`exec` 路径全程沙箱化。

## 4. 上下文管理
- `compact.rs` + `compact_token_budget.rs` + `compact_remote*`(远端压缩服务,含 v2 双实现)+ `compact_model_fallback`;pre-sampling 触发。
- `context/` + `context_manager/`;`turn_diff_display_roots`——**上下文以 diff/world-state 形式管理**,模型看到的是相对上轮的增量。
- `agents_md*.rs` 指令收集;`current_time` 等注入。

## 5. 会话与持久化
- `codex-rollout` crate:JSONL rollout 文件、`Cursor` 分页、`ARCHIVED_SESSIONS_SUBDIR` 归档;`rollout_budget`/`thread_rollout_truncation` 控制单文件体积。
- `session_rollout_init_error` 独立类型;fork/中断快照模型可见。

## 6. 可扩展性
- MCP 双向:client(core 内 mcp handlers + mcp_search)+ **codex 自身可当 MCP server**(codex-mcp crate)。
- 插件:`list_available_plugins_to_install`/`request_plugin_install`——模型可发现并申请安装插件;`extension_tools` 动态工具。
- 多代理:`multi_agents` + `multi_agents_v2` 工具组、`MultiAgentVersion` 协议字段、`cloud-tasks`(云端任务)。
- `hook_runtime`:hook 脚本可注入上下文/拦截输入。

## 7. 差异化亮点
1. **上下文即 diff**(world_state + reference context item):每轮记录增量而非重放全量,token 效率与可观测性兼得。
2. **按需拉起 MCP server**:根据本轮输入解析所需 server/plugin,冷启动成本按 turn 摊销。
3. **协议独立成 crate**:EventMsg 等与实现解耦,TUI/app-server/云任务共用一份协议,前后端版本可演进。
4. **工具即模型可扩展的入口**:tool_search 找工具、request_plugin_install 装插件、request_user_input 问人——harness 的能力边界由模型在运行时拓宽。
5. **全平台沙箱一等公民**:三个平台各自独立 crate + 统一 sandboxing 决策层,权限审批与文件系统隔离绑定。
