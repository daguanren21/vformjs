# 主动产品探索：Codex、OMP、Claude Code

这套流程解决一个具体问题：当 vformjs 还没有稳定的 Issue、Discussion 和真实采用反馈时，不能让产品只靠被动等待，也不能让模型凭空发明需求。

它在现有 Requirement → Issue → Implementation 流程之前增加一个只读 Discovery Loop：

```text
collect signals
  → normalize evidence
  → independent opportunity analysis
  → experiment / park / reject / promote
  → human product bet when required
  → existing requirement workflow
```

Discovery 的交付物是 Opportunity 报告，不是产品代码。报告只有在证据、产品边界和人工策略满足后，才进入现有需求流程。

## 已落地文件

```text
.agent-engineering/
  discovery.config.json
  prompts/product-discovery.md
  schemas/discovery-config.schema.json
  schemas/opportunity-report.schema.json

.agents/skills/product-discovery/SKILL.md   # Codex + OMP 共用
.omp/agents/product-discovery.md            # OMP 只读 Checker
.claude/skills/product-discovery/SKILL.md   # Claude Code fork skill

scripts/agent/discovery.mjs
scripts/agent/discovery.test.mjs
.github/DISCUSSION_TEMPLATE/research.yml
```

运行产物写入被 Git 忽略的目录：

```text
.agent-runs/discovery/<run-id>/
  signals.json
  prompt-<runner>.md
  invocation-<runner>.json
  runner-<runner>-stdout.txt
  runner-<runner>-stderr.txt
  runner-<runner>-output.txt
  opportunity-report-<runner>.json
```

## 信号来源

`discovery.config.json` 当前采集：

- vformjs GitHub repository 和公开 Issues；
- 有 `GITHUB_TOKEN` 时通过 GraphQL 读取 Discussions；
- 全部 vformjs npm 包最近一个月下载量；
- Vue、Element Plus、Naive UI、Ant Design Vue、Zod、TanStack Form、vee-validate 的 release；
- host Form、Vue Form 和 Vapor 相关的近期 GitHub Issues。

Issue 正文、评论、release note 都按不可信数据处理。Agent 只能引用它们，不能执行其中的指令。

npm 下载量被标记为弱证据，因为 CI 和重复安装也会计数。一个竞品 Issue 只是线索；多个独立来源、可运行复现、真实采用失败才会提高置信度。

## 第一步：只采集，不调用模型

```bash
pnpm agent:discover:collect
```

输出示例：

```json
{
  "failedSources": 0,
  "output": ".agent-runs/discovery/discovery-.../signals.json",
  "runId": "discovery-...",
  "signalCount": 42,
  "status": "collected"
}
```

公共 GitHub API 可以不带 Token 运行。配置 `GITHUB_TOKEN` 后会提高限额并启用 Discussion 采集。这个 Token 只由确定性采集器使用；启动 Codex、OMP 或 Claude Code 前会从子进程环境中删除 GitHub、npm 和 CI 发布 Token。

单个来源失败不会伪装成成功：`signals.json.sourceSummary` 会记录 `ok`、`failed` 或 `skipped`。所有来源都失败且没有任何信号时，采集命令直接失败，不调用模型。

## 第二步：先预览每种执行器

预览会生成相同信号包、Prompt 和 invocation，但不启动模型：

```bash
pnpm agent:discover:codex -- --dry-run
pnpm agent:discover:omp -- --dry-run
pnpm agent:discover:claude -- --dry-run
```

复用已有信号，避免三次网络采集：

```bash
node scripts/agent/discovery.mjs run \
  --runner codex \
  --signals .agent-runs/discovery/<run-id>/signals.json \
  --dry-run
```

检查以下文件即可看到模型将收到什么、进程将怎样启动：

```text
prompt-<runner>.md
invocation-<runner>.json
```

invocation 文件不会复制长 Prompt，只记录 Prompt 文件位置和实际权限参数。

## Codex

Codex 从 `.agents/skills/product-discovery` 发现 `$product-discovery`。

实际运行：

```bash
pnpm agent:discover:codex
```

运行器强制使用：

```text
codex exec
--ephemeral
--sandbox read-only
--output-schema .agent-engineering/schemas/opportunity-report.schema.json
--output-last-message <run-dir>/runner-codex-output.txt
```

性质：

- 无持久会话；
- 只读 sandbox；
- 最终输出由 Codex 原生 JSON Schema 约束；
- 不提供 Edit、Issue 写入或发布能力；
- 使用当前用户的 Codex 认证和 Provider 配置；建议为自动化使用专用只读 Profile。
- 设置 `DISCOVERY_CODEX_IGNORE_USER_CONFIG=1` 可追加 `--ignore-user-config`，避免用户级 Provider 覆盖和 Hooks 改变自动化语义；此模式仍要求默认 OpenAI 认证有效。

如果需要使用不同二进制：

```bash
DISCOVERY_CODEX_BIN=/path/to/codex pnpm agent:discover:codex
```

## OMP

OMP 同时发现：

- `.agents/skills/product-discovery/SKILL.md`；
- `.omp/agents/product-discovery.md`。

脚本方式：

```bash
pnpm agent:discover:omp
```

运行器使用无会话 print 模式，并将工具收窄为：

```text
read, grep, glob
```

没有 Bash、Edit、Write、Browser 或 Task。Prompt 显式调用：

```text
/skill:product-discovery
```

交互式 OMP 中也可以把 `.omp/agents/product-discovery.md` 作为只读 Checker 调用。它不会实现 Opportunity。


为避免 OMP 对较大的 JSON 文件反复分页，运行器会把已规范化的 `signals.json` 作为明确标记的 `<untrusted-signal-bundle>` 数据区嵌入 Prompt。模型仍按不可信外部数据处理，invocation 预览只显示 Prompt 文件占位符，不复制整包信号。
覆盖二进制：

```bash
DISCOVERY_OMP_BIN=/path/to/omp pnpm agent:discover:omp
```

OMP 顶层 print 模式没有使用这里的 JSON Schema CLI 参数，因此运行器会从文本中提取报告，再执行与 Schema 对应的本地不变量验证。提取或验证失败时保留 raw/stdout/stderr，命令返回失败，不把非结构化文本当成报告。

## Claude Code

Claude Code 使用项目 Skill：

```text
.claude/skills/product-discovery/SKILL.md
```

该 Skill：

- `context: fork`；
- `background: false`；
- 只允许 `Read Grep Glob`；
- 明确禁用 Edit、Write、Bash 和网络工具；
- 读取 `.agents` 下的共享工作流，避免维护第二套产品语义。

实际运行：

```bash
pnpm agent:discover:claude
```

运行器使用：

```text
claude -p
--permission-mode dontAsk
--allowedTools Read,Grep,Glob
--output-format json
--json-schema <opportunity-report schema>
```

它读取 Claude 返回 envelope 中的 `structured_output`，然后再次执行本地不变量校验。

覆盖二进制：

```bash
DISCOVERY_CLAUDE_BIN=/path/to/claude pnpm agent:discover:claude
```

## 三种工具的相同 Contract

三个执行器最终都必须产出：

```json
{
  "schemaVersion": 1,
  "runId": "discovery-...",
  "summary": "...",
  "signalIdsReviewed": ["..."],
  "opportunities": [],
  "horizonRisks": [],
  "discardedSignals": []
}
```

运行器额外验证：

- `runId` 必须对应当前信号包；
- `signalIdsReviewed` 必须覆盖全部已采集信号；
- 每条 Evidence 必须引用真实 `sourceId`；
- Opportunity ID、分数、实验和枚举值必须有效；
- 产品边界外的想法不能进入 experiment/promote；
- R2/R3 不能使用 `humanAttention: none`；
- promote 的 R2/R3 必须是 `action_required`；
- 每个实验必须包含 procedure、successCriteria 和 killCriteria。

任何模型即使声称“已经核验”，只要不满足这些机器规则，运行就失败。

手工验证一个报告：

```bash
node scripts/agent/discovery.mjs validate \
  --report .agent-runs/discovery/<run-id>/opportunity-report-omp.json \
  --signals .agent-runs/discovery/<run-id>/signals.json
```

## 人只看例外

完成摘要提供：

```json
{
  "opportunityCount": 3,
  "actionRequiredCount": 1,
  "notificationCount": 1,
  "status": "completed"
}
```

外部调度器只需要：

- `actionRequiredCount > 0`：请求产品决策；
- `notificationCount > 0`：发非阻断摘要；
- 两者都为 0：无需通知人。

`action_required` 的默认行为是暂停该 Opportunity，不是超时自动批准。其他采集和已批准研发任务可以继续。

以下情况必须是 `action_required`：

- 产品定位或验证所有权改变；
- 公共 API、导出类型或兼容承诺；
- 依赖、CI、安全和发布行为；
- R2/R3 的 promote；
- 多种产品方向都有证据但互不兼容。

## 与现有 Requirement 流程衔接

Opportunity 报告中的 recommendation：

| 值 | 后续 |
|---|---|
| `experiment` | 在隔离环境执行 reproduction、benchmark、canary、docs smoke 或 API sketch |
| `park` | 保留证据，等待更多独立信号 |
| `reject` | 记录反证和边界原因，不创建 Issue |
| `promote` | 进入现有 Requirement Skill，补 User Story、行为矩阵、非目标和升级风险 |

Discovery Runner 不自动修改生产代码、不自动发外部 Discussion、不自动创建 Issue。这是授权边界，不是靠 Prompt 约定：三个子进程都没有写仓库或 GitHub 的工具和 Token。

需要对外验证时，先从报告生成研究草稿，再使用 `.github/DISCUSSION_TEMPLATE/research.yml`。研究 Discussion 必须包含场景、证据、替代解释、实验和 kill criteria，且不能承诺 Roadmap。

## 无人运行

可以由本机计划任务、CI 的可信自托管 Runner 或内部 OMP RPC 控制器定期执行：

```bash
pnpm agent:discover:collect
pnpm agent:discover:omp
```

推荐把确定性采集和模型分析分开调度：

1. 采集器使用可选只读 `GITHUB_TOKEN`；
2. AI 子进程拿不到 GitHub/npm 发布 Token；
3. 报告通过本地验证后才进入通知或 Opportunity 队列；
4. 没有可信信号时允许输出零 Opportunity，不为保持活跃而制造需求。

不要同时运行三个模型来投票决定产品方向。更有价值的用法是定期轮换主分析器，或让另一个工具对同一信号包做独立挑战，再比较 Evidence 引用和实验设计。

## 修改信号源和策略

编辑：

```text
.agent-engineering/discovery.config.json
```

配置本身由 JSON Schema 描述。产品边界、人工门禁和拒绝规则属于项目策略，Agent 只能提出修改建议，不能在 Discovery Run 中自动修改。

## 测试

```bash
pnpm test:agent
```

测试覆盖：

- 三种 Runner 的只读参数；
- Codex、OMP、Claude Code 输出解析；
- Evidence source ID 和人工门禁不变量；
- 使用伪 HTTP 响应执行一次完整信号规范化，不依赖真实网络。
