# deepchat (ThinkInAIXYZ/deepchat, TypeScript/Electron) — Harness 研究

## 1. 架构总览
Electron 桌面应用:`main`(主进程,agent 运行时全在这里)+ `renderer` + `preload` + `shared`。主进程按域分目录:`agent/`、`provider/`、`mcp/`、`memory/`、`knowledge/`、`plugin/`、`hook/`、`exporter/`、`remote/`。agent 域内部再分 `deepchat/`(自研 agent)、`acp/`(ACP 外部 agent)、`manager/`(后端管理)。
证据:src/main/agent/deepchat/{loop,runtime};agent/manager。

## 2. Agent loop
`loop/deepChatLoopEngine.ts`,`while(true)` 按**逻辑轮次**推进:
- `consumeLogicalRound`(provider 出结果)→ `commits.updateOutput`(每轮落盘)→ 工具批 `settleToolBatch` → `afterRoundPersisted`(工具结果也落盘再继续)。
- 双重上限:`maxProviderRounds` + `MAX_TOOL_CALLS`,超限返回结构化原因(`max_provider_rounds`/`max_tool_calls` 带 attempted/limit)。
- 结果类型三分:terminal / halted / continue——halted 保留现场可恢复。
- **多后端**:`agentManager` 统一调度,`deepChatAgentBackend`(自研)与 `directAcpAgentBackend`(任何 ACP agent 直接接入)并存。
- 护栏:`runtime/noProgressToolLoopGuard.ts`(无进展工具循环熔断)、`preStreamWatchdog.ts`(流启动看门狗)、`deferredToolExecutor.ts`(延迟执行)。

## 3. 工具系统
- `runtime/deferredToolExecutor.ts` + `runtime/dispatch.ts`;`providerPermissionCoordinator.ts` + `providerPermissionResolution.ts` 权限解析与协调分离;`interactionCoordinator.ts` + `interactionProjection.ts` 处理向用户提问等交互块;`imageGenerationBlocks.ts` 图像生成块一等支持。

## 4. 上下文管理
- `runtime/contextBudget.ts` + `contextBudgetPolicy.ts`(预算与策略分离)、`contextBuilder.ts` + `contextContributions.ts`(上下文由各方 contributor 组装)、`promptAssemblyService.ts`。
- 压缩:`compactionService.ts` + `compactionRuntimeCoordinator.ts`;`contextWindowError.ts` 专门处理窗口溢出错误。
- `messageProjectionService.ts`:存储消息→模型输入的投影层(可见记录与模型视图分离)。
- `memory/`:`memoryExtractionChunks`/`memoryRuntimeCoordinator`/`memoryPromptContributor`/`memoryIngestionObserver`——记忆抽取、注入、摄入观察全流程。

## 5. 会话与持久化
- `turnResumeContract.ts`:**turn 恢复契约**(中断的 turn 按契约续跑);`pendingInputAdmissionCoordinator.ts` + `pendingInputContracts.ts` + `pendingInputPump.ts`:pending 输入的准入契约与泵(与 Kun 的 steering 封存、pi 的 steering 消息同族)。
- 每轮 `commits.*` 落盘保证崩溃可恢复;`accumulator.ts` 流式累积。

## 6. 可扩展性
- `agent/acp/` + `directAcpAgentBackend`:任何 ACP 兼容 agent 可作为后端挂入(自家 GUI 变成通用 agent 宿主)。
- `mcp/`、`plugin/`、`hook/`、`provider/`(aiSdk + openaiCodexAdapter + 模型能力事实库 `providerModelRuntimeFacts`/`modelCapabilities`/`capabilityIdentity`)。
- `knowledge/`(知识库)、`ocr/`、`remote/`、`exporter/`。

## 7. 差异化亮点
1. **每轮双落盘**(updateOutput + afterRoundPersisted):崩溃恢复粒度到逻辑轮,恢复契约(turnResumeContract)把续跑写成显式接口。
2. **halted 三态结果**:终止与暂停分流,暂停保留完整现场——长任务可中断恢复,而非简单取消。
3. **noProgressToolLoopGuard**:按"有无实际进展"判循环,比单纯工具名重复检测(CodePilot)更准。
4. **pending 输入准入/泵分层**:用户输入从到达、准入到注入全链路有契约,和 turn 生命周期正交。
5. **agent 后端可插拔**:自研 loop 与 ACP 外部 agent 统一在 agentManager 下,GUI 不绑定自家 agent。
