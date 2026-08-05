# multica (multica-ai/multica, Go server + TS 客户端) — Harness 研究

## 1. 架构总览
**不自研 agent loop,而是"管理 agent 的平台"**。pnpm/turbo monorepo:
- `server/`(Go):cmd + internal(service/handler/realtime/dispatch/scheduler/auth…)+ `daemon`(跑在用户机器上的执行代理)+ `runtimeapps` + `daemonws`(daemon↔server WebSocket/wsrpc)。
- `apps/{desktop,mobile,web}` + `packages/{core,ui,views}`(TS 客户端)。
- daemon 通过 PATH 探测并驱动 **17 家第三方 agent CLI**(claude/codex/opencode/kimi/grok/qwen/cursor/kiro/qoder/traecli/openclaw/hermes/pi/codebuddy/copilot/agy…)。
证据:server/internal/daemon/config.go:94;server/internal/{dispatch,runtimeapps,daemonws}。

## 2. Agent loop
无自研推理循环;核心是**执行准入与派发语义**:
- `internal/dispatch/reason.go`:ReasonCode 是跨层唯一词表(queued/coalesced/deferred/invocation_not_allowed/target_unavailable/runtime_offline/agent_runtime_required…),**在服务层决策点产生、原样带到 wire**,绝不从人类可读错误串反推——客户端可本地化、不泄露私有 agent 存在性。
- 语义区分极细:runtime_offline(机器可回来,排队等待)vs agent_runtime_required(没绑 runtime,排队无意义)——防止用户去找一台不存在的电脑。
- coalesced:重复触发合并;deferred:延迟。

## 3. 工具系统
- 平台自身把能力以 MCP 暴露:`runtime_mcp.go`(runtime MCP overlay,按 run 解析 connected-app 集合)、`skill/`(skill 包管理、skill_cache、skill_bundle_resolve、slash_skill)。
- daemon 侧 `local_skills.go` + `claude_plugins.go`:把平台 skill 落到各家 agent 的本地 skill/插件目录。

## 4. 上下文管理(亮点所在)
- `daemon/prompt.go`:
  - **prompt-cache 感知分层**:runtime brief(CLAUDE.md/AGENTS.md 写入 messages[0])**字节级恒定**,易变值(initiator、continuity 通知、connected-app 集)渲染进本轮 user message——只花本轮 token,不炸整段缓存(MUL-5377)。
  - **turn 模式标记**:Reply/Ownership 两行标记从 BuildPrompt 同一分支无条件发出,brief 与标记永不漂移;用错模式会静默改 issue 状态。
  - **fresh-session 重试披露**:resume 被拒(transcript 丢失/账号不符/历史被 provider 拒绝)时,在新会话 prompt 前缀显式声明"这是全新会话、无任何先前上下文,重读 issue 再动手"——阻止 agent 假设连续性。
- `daemon/execenv/` 按 provider 归一化执行环境:codex_home/sessions/memory/sandbox/skill_strip/multi_agent、channel_type…每家 CLI 的怪癖由 execenv 吸收。

## 5. 会话与持久化
- 会话归 provider 所有,平台管理其**生命周期**:按 issue 隔离的 session store(`~/.codex/multica-sessions/<agent>/<issue>`)、`GCCodexSessionTTL`(14d 回收)、`gc.go`/`repocache`(repo 缓存与逐出)、`poisoned.go`(毒化检测)、`reconcile.go`(对账)。
- `semantic_inactivity_timeout`、`handshake_timeout` 按 provider 可调;`leader_workdir_reuse` 复用 leader 工作目录。

## 6. 可扩展性
- agent = 配置项(`Agents map[string]AgentEntry`),新增 provider = probe + execenv + 超时参数;`agents_probe*.go` 探测版本/能力。
- `runtime_profile*` + drift 检测:机器画像漂移上报;`selfexec`(自我执行)、`auto_update`(daemon 自更新)。
- server 侧完整业务面:issue/squad/attribution/analytics/integrations/scheduler/featureflags/realtime。

## 7. 差异化亮点
1. **准入原因即协议**:ReasonCode 在决策点产生、跨层透传、安全枚举——dispatch 语义是一等工程对象。
2. **为第三方 agent 做缓存友好的宿主**:恒定 brief + 每轮增量上下文,把"平台注入"从缓存破坏者变成缓存利用者。
3. **断链显式披露**:resume 失败不静默降级,而是在 prompt 里向 agent 声明上下文丢失并指引重建。
4. **per-provider execenv 归一化**:17 家 CLI 的环境怪癖集中在一个目录吸收,新增 provider 成本低。
5. **队列语义诚实**:offline 与 unbound 分开、coalesce/deferred 显式化——排队系统的失败模式全部可解释。
