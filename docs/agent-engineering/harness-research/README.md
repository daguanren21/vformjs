# Harness 研究汇总:10 个开源 AI coding agent 实现对比

研究对象与单仓报告见同目录各文件。本文件做横向对比与可借鉴点提炼。

## 一、全景速览

| 项目 | 语言/形态 | 自研 loop | 定位 | 最值得看的点 |
|---|---|---|---|---|
| **codex** | Rust,CLI/TUI/app-server | 是(task/run_turn) | OpenAI 官方终端 agent | 上下文 diff、按需拉起 MCP、协议独立 crate |
| **opencode** | TS,TUI | 是 | 开源终端 agent(原 sst/opencode) | 权限规则集、双 LLM 运行栈、事件总线 |
| **kimi-code** | TS,CLI | 是(agent-core 循环包) | Moonshot 官方 CLI | 渐进式工具披露(select_tools)、媒体降级重试 |
| **grok-build** | Rust,60-crate workspace | 是(chat-state actor) | xAI 官方 harness+TUI | 能力边界按 crate 隔离、ACP 终端变身 agent |
| **pi-mono** | TS 库 monorepo | 是(纯函数 agentLoop) | agent 工具包/积木库 | 双层循环+steering、JSONL append-only 会话树 |
| **MiMo-Code** | TS,CLI | 是 | 小米 MiMo 官方 CLI | (见单仓报告) |
| **CodePilot** | TS,Next.js+Electron | 是(双运行时) | 桌面 agent 工作台 | 自研 loop 与 Claude SDK 并存、IM 桥接 |
| **deepchat** | TS,Electron | 是(逻辑轮引擎) | 桌面 agent 宿主 | 每轮双落盘、halted 三态、no-progress 护栏 |
| **Kun** | TS,无头运行时+Electron GUI | 是(ports/adapters) | 本地优先 agent 工作台 | steering 封存、tool-storm 熔断、history healing |
| **multica** | Go server + TS 端 | **否**(驱动 17 家 CLI) | 托管 agent 编排平台 | 准入原因协议化、prompt-cache 感知注入 |

## 二、架构形态三分法

1. **终端型**(codex、opencode、kimi-code、grok-build、MiMo-Code、pi-mono):单进程循环 + 工具表,差异在协议层抽离程度与 TUI 解耦方式。
2. **桌面/平台型**(CodePilot、deepchat、Kun):agent 即服务,UI 只是众多出口之一;交互工具(通知/提问/仪表盘)进工具表。
3. **编排型**(multica):不实现推理循环,把别家 CLI 当黑盒执行器,核心工程在**准入语义、环境归一化、会话生命周期**。

## 三、Agent loop 设计的收敛与分歧

**收敛点**(几乎家家都有):
- 循环退出 = stop_reason 判断 + 步数/工具数硬上限。
- 工具批执行后与 assistant 输出一起持久化,再进下一轮(deepchat 的 `updateOutput`+`afterRoundPersisted` 是最显式的版本)。
- 用户中途输入不进主循环阻塞,走旁路:pi 的 steering messages、Kun 的 drain+seal、deepchat 的 pendingInput 准入/泵、codex 的 input_queue 续跑。**四家独立实现了同一模式**。

**分歧点**:
- 循环可测性:pi 把 `agentLoop` 做成不依赖 Node/UI 的纯函数(streamFn 注入),Kun 走 ports/adapters 全内存替身,codex/grok 靠 actor+crate 边界。测试策略直接反映架构选择。
- 暂停语义:deepchat 的 terminal/halted/continue 三态 + turnResumeContract 最完整;多数仓只有取消。
- 防死循环:CodePilot 看工具名重复、deepchat 看"有无实际进展"、Kun 的 tool-storm-breaker 独立成组件——三种精度。

## 四、工具系统

- **渐进披露**:kimi-code 的 `select_tools`(完整 schema 按 system 消息注入、loop 每步重读工具表、ToolAccesses 声明并发批次)是最工程化的实现;codex 的 `tool_search` 同思路。
- **动态工具**:codex 让模型 `request_plugin_install` 自己装插件、`list_available_plugins_to_install` 发现能力——能力边界运行时拓宽。
- **GUI 工具**:CodePilot/deepchat 把通知、仪表盘、widget 做成模型可调用工具。
- **防注入**:kimi-code 对全访问声明专门设防(动态 schema 不落进不可变 tools[] 顶层)。

## 五、上下文与持久化

- **codex 的 world_state diff** 是唯一把"模型视角上下文"做成增量数据结构的;multica 从宿主侧做了互补:**恒定 brief + 每轮增量注入**(prompt cache 友好,MUL-5377)。
- **压缩**:家家有 compaction;codex 有远端压缩服务 + 模型 fallback,pi 是 branch-summarization(树形会话上压缩成分支)。
- **会话格式**:pi 的 append-only JSONL 树(支持分支)与 codex 的 rollout JSONL(Cursor 分页、归档、budget 截断)是两种成熟范式;Kun 用 append-only log + healing。
- **崩溃恢复**:Kun 的 history-healing(修孤儿 tool_call)、multica 的 fresh-session 披露(resume 失败显式告知 agent)、deepchat 的每轮双落盘——三家分别治"脏数据、断链、丢轮"。

## 六、可扩展性

- **协议抽出**:codex-protocol、grok 的 ACP、deepchat 的 ACP 后端、multica 的 ReasonCode——把协议当独立制品的仓,多前端/多宿主都顺。
- **MCP**:codex 双向(client+自身当 server);multica 把平台能力以 MCP 暴露给被托管 agent。
- **provider 归一化**:multica execenv(17 家)、kimi-code kosong、opencode native+ai-sdk 双栈。

## 七、最值得借鉴的十件事(按投入产出排序)

1. **steering/pending-input 旁路模式**(pi/Kun/deepchat/codex 四重验证):用户输入与 turn 生命周期解耦。
2. **准入原因在决策点产生并透传**(multica):错误语义不再从字符串反推。
3. **恒定前缀 + 每轮增量**(multica):注入不炸 prompt cache。
4. **halted 三态 + 恢复契约**(deepchat):长任务可中断续跑。
5. **渐进式工具披露**(kimi-code select_tools / codex tool_search):工具多时保 token。
6. **无进展熔断**(deepchat noProgressToolLoopGuard):比工具名重复检测准。
7. **上下文 diff/world_state**(codex):token 效率与可观测性兼得。
8. **纯函数 loop + 依赖注入**(pi):harness 核心脱离 Node/UI 可测可复用。
9. **history healing**(Kun):脏会话修复成一等启动步骤。
10. **断链披露 prompt**(multica):resume 失败时向 agent 声明上下文丢失,避免连续性幻觉。

## 八、给 vformjs 的映射(可选落地)

- `dirty/changedPaths/server errors` 已对齐"显式状态契约"思路;若做 agent 驱动的表单场景,可借鉴:steering 旁路(表单填写中插入指令)、准入原因协议化(校验失败原因结构化透传)、恒定 schema + 增量值注入(prompt cache 友好的表单上下文)。
