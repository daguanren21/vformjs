# Kun (KunAgent/Kun, TypeScript) — Harness 研究

## 1. 架构总览
双层:`kun/` 是无头运行时(HTTP/SSE server + TUI 入口 `serve-entry.js tui`),根仓是 Electron workbench(kun-gui)。运行时 `kun/src` 是十仓里最严格的**六边形架构**:
- `ports/`(approval-gate、model-client、session-store、thread-store、tool-host、user-input-gate、event-bus、workspace-inspector、browser-controller…全部接口化)
- `adapters/`(in-memory 全系测试替身 + browser-use/computer-use/file/hybrid/model/tool/workspace)
- `loop/`(30+ 文件的 agent 循环域)、`delegation/`、`graph/`、`skills/`、`hooks/`、`memory/`、`security/`、`supplychain/`、`review/`、`quality/`、`reliability/`。
扩展 SDK 在 `packages/extension-api|extension-react|create-kun-extension`。
证据:kun/src 目录;loop/agent-loop.ts。

## 2. Agent loop
`loop/agent-loop.ts` 类式实现,`for(step=0;;step++)` 主循环 + 大量专职协作者:
- **steering 准入/封存语义**:用户运行中输入的指导消息在 turn 内注入(`drainSteering`),终结路径前 `drainAndSealSteering` 落盘已接受的指导并关闭准入(`steering.sealIfEmpty`)——比 pi 的 steering 多了"封存"生命周期。
- **turn 限制**:`turn-limits.ts`(maxSteps/maxWallTimeMs)+ thread 级 `extensionBudget`(线程可申请延长预算,取 min);**graph 监督**:多代理 graph 运行时 lead 限制归属判定(`graphRunOwnsLeadLimits`),lead episode 独立计步。
- `inflight-tracker`(在飞请求追踪)、`interactive-tool-bridge`(交互式工具)、`turn-finalizer`、`turn-lifecycle-hooks`、`loop-telemetry`。
- **tool-storm-breaker**:检测模型陷入工具风暴(反复无效调用)并熔断。

## 3. 工具系统
- `turn-tool-catalog.ts`(每 turn 工具目录)、`adapters/tool`、`delegation/`(任务委派);`ports/approval-gate.ts` + `approval-review.ts` 双闸门(批准 + 复核)。
- `security/` + `supplychain/` 独立目录——供应链安全进入 harness 层(扩展/依赖审查)。

## 4. 上下文管理
- 压缩四件套:`compaction-history/marker/summary` + `history-compaction-service`;`compaction-history` 保留完整可见 transcript 同时从最近 marker 投影模型历史(测试明示该语义);**自动合并旧自动 marker、保留手动压缩**。
- `context-estimator.ts`(token 估算)、`context-compactor.ts`、`history-healing.ts`(**修复残缺历史**,如孤儿 tool_call)、`continuation-instructions.ts`、`memory-instructions.ts`(记忆注入)。
- `auto-model-router.ts`:按流自动路由模型。

## 5. 会话与持久化
- `append-only-session-log.ts`(append-only 日志)+ `session-store`/`thread-store` 端口;thread 是持久化一等实体(携带 extensionBudget)。
- `goal-resume-coordinator.ts` + `goal-turn-coordinator.ts`:跨会话目标恢复——崩溃/中断后按目标续跑。

## 6. 可扩展性
- 正式扩展体系:`extension-api`/`extension-react`/`create-kun-extension` 三包 + `extensions/` 运行时;GUI 侧 Electron renderer 消费同一 HTTP/SSE 协议。
- `delegation/` + `graph/`:多代理图编排(lead/episode 语义);`skills/`、`hooks/`、`memory/`。

## 7. 差异化亮点
1. **steering 准入/封存生命周期**:用户插话何时可入、何时封存落盘有明确状态机,杜绝"消息到了但 turn 已终结"的竞态丢失。
2. **tool-storm-breaker**:显式检测并熔断工具调用风暴,所有 harness 都该有。
3. **历史自愈合**(history-healing):启动时修复孤儿 tool_call/残缺结构,脏会话不再让模型崩溃。
4. **六边形 + 全 in-memory 替身**:每个 port 都有内存实现,loop 的 30+ 协作者几乎全部可单测(测试文件与实现一一对应)。
5. **目标级恢复**(goal-resume):resume 的不是会话而是"目标",配合 graph 编排做长任务断点续跑。
