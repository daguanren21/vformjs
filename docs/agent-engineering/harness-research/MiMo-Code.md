# MiMo-Code (XiaomiMiMo/MiMo-Code) Harness 研究报告

> 调研对象：`harness_source/MiMo-Code`，main 分支（tree `6674db7a`）。仓库克隆不完整（仅 `.git`），研究报告基于 main 分支源码全量补齐后阅读。
> 一句话定性：**MiMoCode 是 sst/opencode 的深度 fork**（monorepo 布局、`packages/opencode` 核心、API 形态均继承），在其上叠加了一整套面向"超长任务 + 跨会话记忆"的自有机制（checkpoint/memory/actor/workflow/orchestrator），CLI 包名 `@mimo-ai/cli`（`packages/opencode/package.json`）。

## 1. 架构总览

**语言/运行时**：TypeScript + Bun（`bun.lock`、`bunfig.toml`、turbo monorepo）。核心服务层用 **Effect-TS** 组织（`Context.Service` / `Layer.effect` 遍布 `packages/opencode/src/**`），LLM 调用基于 **Vercel AI SDK v5**（`session/llm.ts:6` 的 `streamText` / `wrapLanguageModel`），持久化用 **Drizzle ORM + SQLite**（`storage/db.bun.ts` 用 `bun:sqlite`，`storage/db.node.ts` 用 `node:sqlite` 双适配），HTTP 服务用 **Hono**（`server/routes/`）。

**包划分**（`packages/`，17 个）：

| 包 | 职责 |
|---|---|
| `opencode` | 核心：agent loop、工具、session、provider、MCP、TUI、server，发布为 `@mimo-ai/cli` |
| `app` (`@mimo-ai/app`) | Web 前端（Solid，prompt-input、file-tree、dialog-fork 等组件） |
| `desktop` (`@mimo-ai/desktop`) | Electron 壳（electron-vite），在 main 进程内**内嵌启动 core server**：`src/main/server.ts` 的 `spawnLocalServer()` 直接 `import("virtual:opencode-server")` 并 `Server.listen()`，CORS origin `oc://renderer` |
| `web` / `ui` / `storybook` | Web 端页面 / 共享 UI 组件库 |
| `sdk` / `plugin` | `@mimo-ai/sdk`（客户端 SDK）、`@mimo-ai/plugin`（插件类型与 hook 契约） |
| `console` / `enterprise` / `identity` / `slack` / `function` / `containers` | 云端/企业侧（SST 部署，`infra/` + `sst.config.ts`） |

**进程模型**：单进程多前端。core 起一个 Hono server（`server/server.ts`，路由挂在 `server/routes/` 下，含 mdns 发现 `server/mdns.ts`、basic-auth/压缩/CORS 中间件 `server/middleware.ts`）；TUI（`packages/opencode/src/cli/cmd/tui/app.tsx`，用 `@opentui/solid` 渲染）与 core 同进程跑在同一 Bun 运行时；desktop/web/app 通过 HTTP + SSE 事件流连接同一 server（desktop 把 core server 直接 in-process 拉起，见上）。CLI 入口命令在 `cli/cmd/`（`run.ts`、`serve.ts`、`web.ts`、`session.ts`、`mcp.ts`、`import.ts`、`export.ts`、`stats.ts` 等）。多“项目实例”由 `project/instance.ts` 的 `Instance` / `InstanceState` 隔离（每个工作目录一份运行时状态）。

多 workers/线程：Turn 级并行主要依赖 Effect-TS fiber 调度；工具/引擎本体在单进程 Bun 中执行；长任务并行度来自 (a) 单 step 内多工具调用并发，(b) actor 体系并发代理，(c) Orchestrator 的 peer 子会话，(d) workflow 的并行 task。`packages/opencode/src/cli/cmd/tui/worker.ts` 是 TUI 的 worker 线程。

**核心源码布局**（`packages/opencode/src/`）：`session/`（loop、compaction、checkpoint、memory 注入）、`tool/`（81 个文件，工具定义 + `.txt` 提示词）、`agent/`（agent 定义与 system prompt）、`actor/`（subagent 运行时）、`task/`（任务树）、`memory/`（FTS5 记忆索引）、`history/`（会话历史 FTS 搜索）、`workflow/`（QuickJS 沙箱 + 4 个内置工作流）、`skill/`（技能发现/检索/内置包）、`mcp/`、`permission/`、`storage/`、`snapshot/`、`provider/`、`cron/`（实验）、`team/`、`inbox/`、`control-plane/`。

**内置 agent 注册表**（`agent/agent.ts:131-430`，Agent.Info 含 `mode: primary|subagent|all`、`native`、`hidden`、`steps`、`permission.ruleset`、`prompt`）：
- primary：`build`（默认）、`plan`（只读）、`compose`（14 技能课程式编排）、`orchestrator`（实验，多会话调度）、`max`（Max Mode，5 候选 + judge）；
- subagent（可见）：`general`、`explore`（只读代码探索）；subagent（hidden，系统级 bounded-computation）：`title`、`summary`、`compaction`、`checkpoint-writer`、`dream`、`distill`；
- `SYSTEM_SPAWNED_AGENT_TYPES = {checkpoint-writer, dream, distill}`（`agent/config.ts:5`）：无人工审批、自己维护记忆文件。

Agent 定义可用 config 覆盖/新增（`config/agent.ts:56` 支持 `maxSteps/steps`；`agent.steps ?? agent.maxSteps`）；`AGENTS.md` 兼容（opencode 惯例）。`agent.steps` 达上限时注入 `session/prompt/max-steps.txt` 警告并把 `toolChoice="none"`（prompt.ts:3524, isLastStep，与"200 步"类超长任务的步数上限机制对应：步数本身无硬上限（默认 `Infinity`），长程持续性由 checkpoint/memory 系统保障）。

## 2. Agent Loop

一次 turn 的主循环是 `session/prompt.ts` 的 `SessionPrompt.run`（:2554）内 `while (true)`（:3131）。单步流程：

1. **取历史**：`MessageV2.filterCompactedEffect(sessionID, { contextFrom, contextWatermark, agentID })` 只取 compaction 边界之后、**按 agentID 切片**的消息（主代理与 subagent 共享 sessionID，靠 `agent_id` 列隔离，F37 注释）。
2. **前置判定**：对上一条 assistant 消息做 `classifyAssistantStep()`（`session/classify.ts`），分类为 `filtered / failed / text-tool-call / think-only / invalid / final / continue`，分别走内容过滤错误写入、`autoRetryTextToolCall`（模型把工具调用写成正文 → 有界重试）、`autoContinueInvalidOutput`（空输出/纯 thinking 自动续跑，上限 `MIMOCODE_INVALID_OUTPUT_CONTINUATION_LIMIT=2`）、`goalGate` 等。
3. **记忆提醒注入**：最后一条 user 消息上动态 push synthetic `<system-reminder>`（recall hint，~120 token/turn，prompt.ts:3170 附近）。
4. **上下文管理挂钩**：`prune.fireCheckpoints()` 按阈值触发后台 checkpoint writer；`overflowCheck()` 命中则走 rebuild-from-checkpoint（主代理）或 per-actor compaction（subagent），详见 §4。
5. **组请求**：`resolveTools()`（prompt.ts:1080，注册 MCP 工具、按 agent 白名单/插件/`chat.params` hook 过滤）；fork agent（subagent/peer）走**冻结 ForkContext**（spawn 时捕获的 system + inheritedMessages，prompt.ts:3612-3660，字节级保 prefix cache）。
6. **发起流式**：`processor.create()` → `handle.process(streamInput)`（`session/processor.ts`）→ `llm.stream()` → `streamText()`（llm.ts:690）。`maxRetries` 主动压到 2（llm.ts:753 长注释：AI SDK 内部重试静默且退避无上限，真正的长重试交给可见的 `SessionRetry.policy`）。
7. **事件消费**：processor 的 `handleEvent` 处理 `reasoning-* / text-* / tool-input-* / tool-call / tool-result / tool-error / start-step / finish-step`，增量 `updatePartDelta` 落库（TUI 实时渲染靠 DB + bus 事件）。工具执行由 AI SDK 在 step 内自动调度（工具 `execute` 是 Effect 闭包，prompt.ts 的 `resolveTools` 里包装权限询问）。
8. **收尾判定**：`finish-step` 时记录 token/费用/快照 hash、发 metrics、`summary.summarize()` 异步更新标题摘要；`isOverflow()` 置 `needsOverflowHandling`。`goalGate`（session/goal.ts）在模型想停时用**独立 judge 模型**评估 `/goal` 停止条件，Verdict 结构 `z.object({ok, impossible, reason})`，不满足则 `continue` 继续跑，最多 `MAX_GOAL_REACT=12` 次再审（prompt.ts:165, 2816），防“乐观早停”。

**输出长度续跑**：`finishReason === "length"` 且无工具调用时 `autoContinueOutputLength` 自动接续输出，上限 `MIMOCODE_OUTPUT_LENGTH_CONTINUATION_LIMIT=3`（flag/flag.ts）；结构化输出（`lastUser.format.type == "json_schema"`）时追加一个 `StructuredOutput` 工具并 `toolChoice="required"`，解析失败走 `autoRetryStructuredOutput`（有界重试，`lastUser.format.retryCount` 默认 2）。

**重试策略**（`session/retry.ts` 的 `SessionRetry.policy` + processor 层）：`retrable(error)` 只对瞬时错误（provider 容量、网络）重试；Schedule 指数退避但**每次等待上限 30 s**，每次重试发 bus 事件让 TUI 显示 `[retrying attempt #N]` banner；AI SDK 内置 `maxRetries` 被刻意压成 2（llm.ts:749-753 注释：SDK 内置 retry 静默且退避无上限，曾导致最长 ~34 min 死等）。

**阶梯截尾**：`agent.steps`（config 里的 `maxSteps`）到上限的最后一次迭代，追加 `session/prompt/max-steps.txt` 文本（要求模型只输出文字总结）且 `toolChoice="none"`，保证有体面的收尾报告而不是沉默截断。

**防死循环**三件套：
- **doom loop**：连续 3 次同名同参工具调用 → 弹 `doom_loop` 权限询问（processor.ts:31, 505-524）；
- **repeated-step nudge**：最近 REPEATED_STEP_THRESHOLD 步 action 签名相同 → 注入"换方法"提醒（prompt.ts:3357-3396）；
- **text n-gram 重复**：流中检测 4-gram 连续重复 20 次（`MIMOCODE_TEXT_NGRAM_*`，flag/flag.ts）→ remind → replan → terminate；另有 **try-best 检测器**（`session/try-best-detector.ts`）识别"低收益循环"并暂停 turn 交给用户选择换 harness（Mix of Harness，`docs/harness/Mix of Harness and Hand-off.md`）。

**并行工具调用**：单 step 内多工具由 AI SDK 并发执行；processor 用 `ctx.toolcalls: Record<toolCallID, {done: Deferred}>` 跟踪，`cleanup` 时先 `Deferred.await` 再对仍 `pending/running` 的 part 做两遍（内存 + DB 驱动）aborted 收尾（processor.ts:738-777，注释解释了竞态）。

**中止/恢复**：`cancel` 靠 `AbortController` 贯穿（llm.ts:794 的 `Effect.acquireRelease`）；中断后 `cleanup` 把未完成工具标 aborted；用户中断后继续发言即可续跑。subagent 中断不影响 Orchestrator 的 peer 子会话（harness 文档 §3.3）。

## 3. 工具系统

**定义方式**（`tool/tool.ts`）：`Def<Parameters extends z.ZodType>` = `{ id, description, parameters(zod), execute(args, ctx): Effect<ExecuteResult> }`，描述文本外置在同名 `.txt`（如 `bash.txt`、`task.txt` —— 长说明文本不进 TS）。每个工具拿到 `Context`：sessionID/agent/abort/`metadata()`/**`ask()`**（权限询问入口）。另支持 **shell 调用形态**（`Def.shell.parse(script)`，把 shell 风格字符串解析成参数列表，`tool/invocation-style.ts` 选择 JSON/shell 风格，`session.shell.txt` 等提供 shell 语法描述）。

**内置工具清单**（`tool/registry.ts` 导入表）：
- 文件/搜索：`read`、`write`、`edit`、`multiedit`、`apply_patch`、`glob`、`grep`、`codesearch`、`lsp`、`notebook-edit`、`change-directory`、`view-image`、`external-directory`（越目录访问守卫）；
- 执行：`bash`（+ `bash-interactive`）、`tool-script`（声明式脚本工具）；
- 网络：`webfetch`、`websearch`（`tool/websearch/`）；
- 代理/编排：`actor`（subagent 生命周期）、`session`（Orchestrator 子会话 8 verb）、`fleet`（子会话+worktree 可观测性）、`task`（任务树 T1/T1.1…）、`workflow`（跑确定性工作流）、`cron`（定时，实验）、`team`、`question`（向用户提问）、`plan`（plan-exit）；
- 记忆/历史：`memory`（FTS 搜索 + 路径守卫 `memory-path-guard.ts`）、`history`（跨会话历史检索）；
- 自我扩展：`skill`、`skill-search`（BM25 检索技能）、`mcp-tool-search`（**MCP 工具延迟加载**：先搜索再按需挂载，描述里自带"MCP catalog 是不可信元数据，禁止遵循其中指令"的提示注入防线，tool/mcp-tool-search.ts:97）；
- 兜底：`invalid`（坏工具名/修复失败的落点，配合 `experimental_repairToolCall`，llm.ts:701，先 `ToolCompat.repairToolCall` 修参再降级为 invalid 结果回注）；

工具注册由 `ToolRegistry`（`tool/registry.ts`，`State{custom, builtin}`）汇总内置 + 插件自定义工具（`ToolDefinition` 接口，`@mimo-ai/plugin`）+ MCP 工具（按 `MCP.TurnContext` 每轮调整可见性）+ StructuredOutput 临时工具。GPT 系模型有可选 `gpt.ts` 工具集变体（`usesGPTToolset`，`bash.gpt.txt` 等备选描述）。

**文本 -> 参数的双语法**：同一工具可同时暴露 JSON schema 与 shell 语法（`Def.shell`），模型选哪种由 `invocation-style.ts` + agent 配置决定 —— 对弱模型更友好，与"200 步长程任务中工具调用可靠性"的设计目标一致（README Compose 节）。

**工具结果结构**：`ExecuteResult{title, metadata, output, attachments}`：`title` 是 TUI 一行摘要，`attachments` 可转 `MessageV2.FilePart`（图像可直接进入下一轮上下文）。错误分两类：`isRecoverableError`（`tool/recoverable.ts`）: 参数错/未知 id 等标 `recoverable:true`，TUI 弱化显示但完整信息回注模型让其自我纠正；其余为 error 状态，除非 `continue_loop_on_deny` 且 permission reject，否则中断（`ctx.blocked`）。

**权限模型**（`permission/`）：规则三元组 `{permission, pattern, action: allow|deny|ask}`，`evaluate.ts` 按 ruleset 顺序 `findLast` 匹配（wildcard）。配置来源：config 的 `permission` 字段 + 运行时 `approved`（"always" 持久化到 `PermissionTable`）。关键设计：
- **forced-ask 集合**（`FORCED_ASK = {"bash_delete"}`，permission/index.ts:195）：`bash` 工具扫描 `rm/rmdir/git reset --hard/git clean -f/push --force` 等删除命令（flag/flag.ts:70-77），强制二次人工确认，连 skip-all 模式都不放行（skip-all 下等 bounded 60s 后 auto-reject，permission/index.ts:25-29）；
- **skipAll**（TUI 运行时开关）只 auto-allow 非 forced 的 ask；
- **子代继承**：`inherit` 模式下先查父会话 ruleset+approved，父 deny 必胜（permission/index.ts:278-311）；
- **无人工的代理**（系统 spawn 的 checkpoint-writer/dream/distill）`interactive:false`，ask 直接 fail closed；Orchestrator peer 的 ask 走 **forward 模式**路由给 Orchestrator 会话回答，5 分钟无人答 resolves DENY（permission/index.ts:21-23）。

**沙箱/隔离**：无 OS 级沙箱（与 opencode 一致）；隔离靠权限 + git snapshot（`snapshot/`，独立 GIT_DIR 于 `<data>/snapshot/<proj>/<hash>` 跟踪工作树）+ Orchestrator 子会话可选 `--isolate` git worktree（`<data>/worktree/<projID>/<slug>`，分支 `mimocode/<slug>`）+ 工作流脚本的 QuickJS WASM 沙箱（见 §6）。

## 4. 上下文管理

这是 MiMoCode 相对 opencode 改造最深的子系统，设计文档在 `docs/superpowers/specs/` 与 `docs/compose/spec/context-budget-control.md`。

**窗口与触发点**（`session/overflow.ts`）：`contextWindow()` 给出 `hard/effective/usable` 三层：`usable = effective - reserved(20K compaction buffer 或 maxOutputTokens) - min(maxOutput, 20K)`。`compaction.max_context` 支持按模型（含通配符）设预算（"300K"、"50%"），只能提前不能推后 —— 应对 `past a point, not better` 与 OpenAI 长上下文价格跳档（README `/context-limit` 一节）。`isOverflow()` 用 `total || input+output+cache.read+cache.write` 判定。

**双轨压缩**（prompt.ts 溢出分支，:3420-3510）：
- **主代理：checkpoint + 重建**。平时按 token 阈值梯队（`session/prune.ts:43`：`≤200K→4 次@20%`、`≤500K→9 次@10%`、`>500K→18 次@5%`，预留 13K）后台 fire **checkpoint-writer 子代理**（`session/checkpoint.ts`，prompt 在 `agent/prompt/checkpoint-writer.txt`，是一个 hidden+native 的 bounded-computation agent），把 11 节结构化状态写到 `<data>/memory/sessions/<sid>/checkpoint.md`（+ `MEMORY.md`/`notes.md`/`tasks/<id>/progress.md`，模板与分节 token 预算在 `session/checkpoint-templates.ts`：`CHECKPOINT_SECTION_BUDGETS` ~15.6K、`MEMORY_SECTION_BUDGETS` ~10K）。溢出时 `rebuildEnsuringCheckpoint()` 插入 boundary marker（**不删 DB 消息**），下一轮从 checkpoint + 项目记忆 + 任务进度 + 保留的近期消息重建上下文（`renderRebuildContext`，budgeted 注入，截断处给 `Read(path, offset)` 指引）。无 checkpoint 且 writer 失败才退化到 compaction。
- **subagent：per-actor compaction**（没有 checkpoint 机制），向该 actor 的 (sessionID, agentID) 切片插 compaction 边界；compaction 的两条路径都在 `session/compaction.ts`：`process` 跑一个 summary turn，或 `create` 裸插边界（其前历史不落 summary 直接丢弃，注释明说"which is exactly why we tried to write a checkpoint first"）。

**前缀注入物（每轮）**：`insertReminders`（prompt.ts:755）会在 fresh user turn（step==1）注入技能目录等多项提醒；`skill-search-reminder.ts` 进一步注入 BM25 匹配到的技能候选项；`session/instruction.ts` 管理注入并在 turn 结束时 `instruction.clear(message.id)`（prompt.ts:3563 ensuring），避免重复叠加。

**prefix cache 工程**：
- fork 代理冻结 `ForkContext`（system + inheritedMessages 字节相等，`session/llm-request-prefix.ts` 的 `buildLLMRequestPrefix` 父子共用同一构造函数，注释："byte-equal invariant … structural consequence"）；
- 首条 user 消息 step>1 时改写成 `<system-reminder>` 包裹而非新增消息（prompt.ts:3583-3597）；
- `provider/transform.ts:498` 按 provider 注入 `cacheControl: ephemeral`（anthropic/openrouter/openaiCompatible/copilot/alibaba）；
- `prune.isCacheCold`（cacheTTL）避免 checkpoint 触发打断热缓存；
- 请求头带 `x-session-affinity: <sessionID>` 做服务端亲和（llm.ts:739）。

**大输出截断**（`tool/truncate.ts`）：默认 `MAX_LINES=2000` / `MAX_BYTES=50KB`，超限写全文到 `TRUNCATION_DIR`、返回头/尾预览 + 提示"用 Grep/Read offset 或派 explore agent 处理"（7 天保留期）；错误输出优先保尾部（`ERROR_PATTERN` 探测）；`pressureCaps` 按上下文压力收紧配额。

**记忆注入（每步）**：`llm.ts:146` 的 `buildMemoryInstructions(sessionID, projectID, memoryRoot)` 拼出 system 附加段，指向 4 类记忆文件的绝对路径（项目 `MEMORY.md`、会话 `checkpoint.md`、任务进度 `tasks/<id>/progress.md`、全局 `MEMORY.md`），并教会协议：writer 是唯一维护者，主代理只可通过 Edit/Read/Grep 增补 `MEMORY.md` 与 `notes.md`；包含"激活回忆"子协议（checkpoint 重建后如何有效使用已在 context 中的 dump；预算截断时用 `Read(path, offset=L)` 补齐）。写入后由 `Memory.reconcile` 的 `reconcileMemory({mimo, cc})` 同步进 FTS 索引。

**检索通道**：`tool/memory.ts` 的 `memory` 工具（对 `<data>/memory/**` 做 FTS5 搜索 + scope/type 过滤）+ `Read/Grep` 常规文件访问 + `tool/history.ts` 检索历史会话。子代理 spawn 时可传 `task_id`，其发现写入 `tasks/<TID>/progress.md` 并在下一次 checkpoint 由 writer 归并 —— 这是"跨会话记忆"宣称的具体实现。（可关闭项：`cfg.checkpoint.memory_reconcile_on_search`、`cfg.memory.cc_index` 等。）

## 5. 会话与持久化

**存储格式/位置**：单文件 SQLite（`<data>/mimocode.db`，`storage/db.ts:32`；可按项目分库 `mimocode-<safe>.db`），drizzle 表：`SessionTable / MessageTable / PartTable / TodoTable / PermissionTable`（`session/session.sql.ts`，消息-part 二级、级联删除）；旧 JSON 存储由 `storage/json-migration.ts` 迁移。数据根目录 `<XDG data>/mimocode/`（README：SQLite、auth.json、memory、logs；state/cache 分开；`MIMOCODE_HOME` 可整体覆盖）。记忆文件树 `<data>/memory/{global,projects/<pid>,sessions/<sid>}/*.md` 由 `memory/reconcile.ts` 增量索引进 FTS5 表（`memory/fts.sql.ts`），搜索走 token 级 phrase OR + BM25 + **相对分数地板**（top1 的 15%，`memory/service.ts:90`），还可索引 `~/.claude/projects/*/memory/`（`cfg.memory.cc_index`，兼容 Claude Code 记忆）。

**resume / fork / share**：
- resume：`mimo -c <sessionID>` attach 任意会话；**恢复时自动注入记忆**（README "Persistent Memory"，checkpoint/memory 进入 rebuild dump；每轮还有 recall reminder）。
- fork：`Session.fork()`（`session/session.ts:656`），标题自动 `"(fork #N)"` 递增；app 端 `dialog-fork.tsx`。checkpoint-writer 的 spawn 也是一种"fork agent"（冻结父 prefix）。
- undo：`session/revert.ts` 的 `revert/unrevert` 基于 `snapshot/` 的独立 GIT_DIR 快照（每 step `snapshot.track()`，processor 在 `start-step/finish-step` 记录 hash 与 patch part）。
- 跨会话历史：`history/`（FTS 索引 + `tool/history.ts` 供 agent 查询旧会话）；外部导入：`session/{claude-import,codex-import,opencode-import}.ts` 一键迁移别家会话/认证。
- **消息/part schema**（`session/message-v2.ts`）：一条消息挂多个 part，类型含 `text / reasoning / tool / file / step-start / step-finish / snapshot / patch / subtask / compaction / agent`。`MessageV2.filterCompactedEffect` 按 `contextFrom`/`contextWatermark` 加 `agentID` 切片提取"模型实际看到的上下文"；`toModelMessagesEffect` 把 DB part 转回 AI SDK `ModelMessage`（provider 特定的 reasoning 来回由 metadata 保留）。边界/水印字段存在 `SessionTable` 行里，不删消息——compaction 是无损标记。

## 6. 可扩展性

- **MCP**（`mcp/index.ts`）：stdio + StreamableHTTP + SSE 三 transport，OAuth 2.0（`mcp/auth.ts`、`oauth-provider.ts`、`oauth-callback.ts`），**sampling**（`mcp/sampling.ts`，注释里明说避免 MCP server 采样撞上人工 permission 死锁），工具结果转换 `mcp/tool-result.ts`；每轮构造 `MCP.TurnContext{sessionId, turnId, actorId}`（prompt.ts:2584），再经 `mcp-tool-search` **按需加载**（不把全部 MCP 工具常驻 context——解决 MCP 工具多时 context 爆炸问题，设计见 `docs/compose/spec/mcp-tool-search.md`）。
- **插件/hooks**（`plugin/index.ts`）：`Hooks` 契约在 `@mimo-ai/plugin`；hook 点包括 `chat.params`、`chat.headers`、`experimental.chat.messages.transform`、`experimental.text.complete`、`session.userQuery.pre/post`（可 cancel 一轮）、`session.llm.request`、`actor.preStop/postStop`（支持 ReAct 再进入，上限 `MAX_PRE_REACT=3`）；除 npm 插件外还支持**文件 hooks**：`{hook,hooks}/*.{js,ts}` 目录监视 + mtime 500ms 节流热重载（plugin/index.ts:108）。内置插件 `plugin/{mimo,codex,xai,cloudflare,checkpoint-splitover,subagent-progress-checker}.ts`。
- **Skills**（`skill/`）：扫描本地 `.mimocode/skills/` + `.claude/.agents/.codex/.opencode/skills/**/SKILL.md`（同名后扫描者覆盖内置）+ `cfg.skills.paths/urls` 远程目录（`skill/discovery.ts` 拉 index.json + 并发下载）；内置 20+ 技能（README 表格；`skill/builtin/` 2.9MB 打包进二进制，`bundle.macro.ts`）；路由用 **BM25 + exact name + 本地化别名**（`skill/search.ts`，K1/IDF 参数走 flag）；一条消息提及 ≥2 技能自动注入多技能编排计划（`docs/harness/Agent Multi-Skill Workflow Orchestration Design.md`）。`evolve` 技能允许自我改写 agent 各层。
- **Subagent/多代理**：`actor/` 体系 —— spawn(默认后台)/run(阻塞特例)/status/wait/cancel/send 六操作（`tool/actor.txt`），三类 SpawnMode：`subagent`（会话内切片）、`peer`（独立子会话，Orchestrator 用）、`main`；ForkContext 冻结 prefix（`actor/spawn.ts`）、注册表在 SQLite、45s watchdog + 6min stall/10min abandon 活性推导（`actor/schema.ts`）、inbox 通知父代理（`inbox/`）。`session` 工具的 Orchestrator 模式（`MIMOCODE_EXPERIMENTAL_ORCHESTRATOR`）支持跨目录、跨项目派发 + worktree 隔离 + 审批路由（`docs/harness/MiMo Orchestrator Mode.md`）。
- **Workflows**（`workflow/`）：用户 `.mimocode/workflows/*.js`（或同名覆盖内置）+ 4 个内置（compose/deep-research/fact-check/research-experiment，`workflow/builtin/`）；运行在 **QuickJS WASM 沙箱**（`workflow/sandbox.ts`：12h 墙钟、64MiB 内存、active-time 预算、协作中断），为可恢复做了**确定性设计**（剥 Date/Math.random、按 runID 播种 PRNG、`workflow/persistence.ts` 文件断点续跑）；通过 host 函数回调 agent/工具。
- **自定义 provider**：`provider/` 接 Vercel AI SDK 全家 + `@ai-sdk/openai-compatible` 自定义端点（README 给了完整 jsonc 契约，含模态声明 `/modalities`）；`Custom Provider` TUI 对话框（`packages/app/src/components/dialog-custom-provider.tsx`）；多步 turn 还可接 GitLab DWS workflow 模型（llm.ts 的 `GitLabWorkflowLanguageModel` 分支，tool 执行经 WebSocket 回桥）。

## 7. 差异化亮点（值得借鉴）

1. **Checkpoint-writer 子代理 + 双轨压缩**（`session/checkpoint.ts` / `session/prune.ts`）：把"context 压缩"从"LLM 有损摘要"改成"专职 hidden writer 按窗口百分比梯队（5%/10%/20% 密度自适应）持续维护结构化 checkpoint.md，溢出时用 checkpoint **重建**上下文，裸压缩只作兜底"。好处：恢复保真度高（11 节模板 + 分节 token 预算）、writer 与主流异步不阻塞 turn、`servesCheckpoint` 判断与 system prompt 的记忆教学共用一处避免漂移（prune.ts:251 注释）。这是"200 步超长任务"宣称的核心支撑。
2. **fork 代理冻结 prefix 保 prompt cache**（`session/llm-request-prefix.ts` + prompt.ts fork 分支）：父子代理的 system+inheritedMessages 由同一构造函数产出、spawn 时冻结，字节级相等——并行 subagent/peer 共享父前缀缓存。多数 harness 的 subagent 重建 prompt 导致 cache 全毁，这个设计把"cache 命中"当结构性质而非运气。
3. **三级防死循环 + Mix of Harness 逃生舱**（processor.ts doom_loop / prompt.ts repeated-step nudge / text-ngram / try-best-detector + `docs/harness/Mix of Harness and Hand-off.md`）：不只检测重复输出，还分"同参工具循环、同步签名循环、token 级文本重复、低收益 turn"四个层次，最后一层可以直接把 turn 暂停、把任务通过 skill 交给 Codex CLI / Claude Code CLI 继续 —— 控制平面不动、执行平面可换。
4. **确定性的 QuickJS 工作流沙箱**（`workflow/sandbox.ts` + `persistence.ts`）：剥离 Date/随机源 + runID 播种 + 文件断点，使"多 agent 编排脚本"可 resume 重放；12h 预算 + 64MiB + active-time 计费。把 agent 编排当成可重放的确定计算而非又一摊对话，和交互式 compose 路径互补（README Workflows 一节的取舍说明很清醒）。
5. **权限的工程细节**：forced-ask（`bash_delete` 删除类命令不可通配预批，skip-all 也只给 60s bounded wait）+ 父会话审批继承（父 deny 必胜的规则序）+ 无人代理 fail-closed + Orchestrator forward-ask 5 分钟兜底。把"无人值守长任务"的权限语义逐角落实，而不是一个 `--yolo` 开关了事。

**其他值得一提**：MCP 工具的延迟加载 + 提示注入防线（`tool/mcp-tool-search.ts:97`）；`compaction.max_context` 按模型/通配符的降窗预算；记忆 FTS 的相对 BM25 分数地板；goal/judge 停止条件（`session/goal.ts`）；Max Mode（`session/max-mode.ts`，5 路候选 + judge 重放，`experimental.maxMode`）。
