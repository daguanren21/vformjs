# 从需求到 Issue：我如何在 Giga UI 里搭一条可复盘的 Agent 工作流

当 Agent 开始参与真实项目，效率的瓶颈很快从“模型会不会写代码”变成“任务怎么进入队列、上下文怎么交接、结果怎么被验证”。

Loop Engineering 关注的是一套能自己找工作、分发工作、校验结果、保存状态、决定下一步的系统。人逐条发提示词适合探索小问题，任务一多，就需要 queue、skills、handoff 和 review 来约束协作过程。

我把这些观点落到了 Giga UI 的组件开发流程里，先拆开需求分析和 Issue 修复，再让两者通过明确的文档交接。

## 七个工程判断

**Skills 应该短、可组合、按需加载。** 设计原则包括 concise、composable、progressive disclosure 和 harness-agnostic。user-invocable、model-invocable 和 skill-invocable 三种调用层级需要分清。这套分层能减少系统提示词膨胀，也让一个 Skill 只承担一段明确工作。

**Queue 给 Agent 明确的等待点和交接点。** queue over loops 描述了 Issue 队列、Agent 执行队列和人工审阅队列之间的流转，也可以用 GitHub 标签触发不同 Agent。`agent:implement`、`agent:review` 这类标签同时承担状态和权限边界。失败的任务留在队列里等待证据，不进入无限重试。

**Wayfinding 先暴露决策空间。** `/wayfinder`、decision maps 和 frontier / fog of war 都在处理计划阶段的过度确定。Agent 应该标记已经确认的事实、仍需验证的假设和当前无法决定的边界，相关关键词：decision maps、frontier / fog of war。规格文档因此可以保留未知项，不需要用一个看起来完整的方案掩盖证据缺口。

**上下文要区分一手材料和二手总结。** `/teach` 让 Agent 阅读原始资料，再把学习结果组织成可以继续追问的上下文。一手材料与二手总结也需要明确区分。放到代码仓库里，一手材料包括需求原文、当前实现、类型声明、测试结果和运行日志；计划、总结和 Agent 生成的说明属于二手材料，不能覆盖前者。

**文档承担跨阶段记忆。** ADR 记录非显然决策，AGENTS.md 作为索引，Skill 保存可复用流程，运行日志留给短期诊断。docs、plan 与 PR description 应保持一致，每类记忆也要有清晰的保留期限，避免把整段对话和临时失败长期塞进项目规则。

**Agent 的表现由 model、harness 和 environment 共同决定。** Agent 可以看成模型、运行框架和环境的组合。相同需求可以交给两个 model/harness 组合实现，再根据真实 diff 和验证结果选择。模型能力强不代表环境可靠，浏览器状态、工作目录、依赖和测试入口都会改变结果。

**Checker 需要独立证据。** 代码审查要读取需求、行为变化、diff 和验证结果，不能只接收实现 Agent 的自述。self-improvement loop 也一样：自动化可以提出下一步，涉及规则、兼容性和发布的决定仍需独立检查。

## Agent 的工作单位应该是队列里的任务

我以前习惯从一句需求直接跳到代码。这个动作省掉了几分钟，却把很多判断藏进了实现过程：当前行为是什么，哪些场景不能变，改动会影响哪些使用者，失败的测试到底是在提醒回归，还是测试本身已经过时。

现在的状态流是：

```text
intake
 -> needs_clarification
 -> wayfinding
 -> awaiting_spec_approval
 -> ready_for_implementation
 -> implementing
 -> automated_verification
 -> independent_review
 -> human_review
 -> awaiting_commit_approval
 -> completed
```

每个状态都有进入条件和退出证据。Agent 可以继续推进没有争议的步骤，遇到产品决策、升级风险或连续重复的阻塞，就把任务交还给人。

队列让任务拥有边界；死循环却很容易变成“再试一次”。因此我把运行状态写入 `.agent-runs/`，把长期事实写进 `docs/`。恢复任务时读的是状态和文档，不依赖某次对话还留在上下文里。

## 需求 Skill 和 Issue Skill 不再做同一件事

我新增了 `requirement-workflow`，保留了 `issue-fix-workflow`，但给它们划了硬边界。

需求 Skill 接收需求编号、链接或自然语言。它负责读取资料、查代码、确认当前行为、写 User Stories、验收标准、旧/新行为矩阵和升级风险。没有 Issue 编号的需求使用 `local-YYYYMMDD-<slug>`，文档写入 `docs/requirements/`。需求 Skill 停在 `awaiting_spec_approval`，不会改业务代码，也不会用猜测填空。

Issue Skill 接收已批准的需求，或者从 requirements MCP 获取一个明确的 Issue。它负责 E2E、demo、单测、实现和验证，Issue 文档写入 `docs/issues/`，计划写入 `docs/plans/issues/`。需求计划单独放在 `docs/plans/requirements/`，两个命名空间不再混用。

一个 Skill 只解决一段可以复用的工作，Skill 之间通过稳定的 handoff contract 交接，Agent 无需把整套项目规则重复塞进每次提示词。

## 先记录行为，再讨论改法

组件库的风险经常来自默认行为。比如 DatePicker 的 `datetime` 类型增加 `default-time` 支持，表面上是增加一个 prop，实际还要回答几个问题：日期切换时保留旧时间还是重置，传入 `string` 和 `Date` 是否都支持，类型提示怎么约束，其他日期类型是否受影响，旧 demo 和 E2E 的断言是否仍然代表产品预期。

我现在要求每个行为变化先写矩阵：

```text
场景 旧行为 批准后的行为 兼容性
datetime 切换日期 保留当前时分秒 使用 default-time changed
未提供 default-time 保留当前逻辑 保留当前逻辑 unchanged
date 类型 不接受时间 不增加时间语义 unchanged
```

测试失败后也要先分类。它可能是产品回归、旧断言、缺少 demo、过时 selector、环境故障，或者已经批准的行为变化。直接改断言让 CI 变绿，会把这几种情况混在一起，后续审核很难判断改动的真实影响。

ADR 用来记录非显然决策。文档保留决策和证据，整段对话无需长期保存。

## Wayfinding 需要保留未知项

需求分析最容易出现的错误，是 Agent 为了让计划看起来完整，把未知项写成确定结论。decision maps 和 frontier / fog of war 都要求地图同时标出已经走过的区域和还没有证据的区域。

因此需求文档增加了三个区域：

- 已确认的决定，必须有需求、代码或测试证据。
- 假设和开放问题，必须写出验证方式。
- 决策前沿，记录当前无法安全决定的部分。

这个列表会直接影响状态。如果开放问题会改变 API、兼容性或迁移方式，任务停在需求阶段；如果只是实现细节，Issue Skill 可以在批准的范围内继续 wayfinding。

## Maker 和 Checker 要分开

Loop Engineering 里有一个我很赞同的安排：负责实现的 Agent 和负责检查的 Agent 不应该共享同一套自我解释。实现 Agent 可以修改代码、测试和 demo；Checker 只读行为矩阵、diff、测试结果和升级说明，专门寻找遗漏。

Giga UI 的默认隔离方式是独立 worktree。并行 builder 不能拥有重叠文件，reviewer 只读，最终由人决定是否提交。这套隔离方式包括 worktree、subagent 和独立 review，也依赖 sandbox 划定权限边界。

隔离解决的是误改和上下文污染，不能替代人的判断。Agent 越能自动推进，审阅重点越要落在行为边界、公共 API 和升级路径上。单看代码是否“像能运行”，无法判断改动有没有扩大影响范围。

## 记忆应该小而明确

我没有把所有经验塞进 `AGENTS.md`。AGENTS.md 应该是索引，具体规则放在可按需加载的 Skill 或 reference 中。

当前的持久化分三层：

- `docs/requirements/` 保存已确认的需求和边界。
- `docs/issues/` 保存 Issue 的根因、证据和实际影响。
- `.agent-runs/` 保存可丢弃的运行状态、baseline 和验证事件。

ADR 只记录不显然的架构决策。自动生成的“自我改进记忆”不会直接改项目规则。self-improvement loop 可以提出改进候选，但规则变更仍然需要人工确认。

## 这套方法解决了什么，没解决什么

它解决了三类以前经常混在一起的问题：需求没有确认就开始编码，需求文档和 Issue 文档互相覆盖，测试变绿却没人知道行为是否被意外改掉。它也让一次中断后的恢复变得可行，Agent 可以从状态、文档和验证记录继续工作。

它没有消除成本。并行 Agent 会增加 token 消耗，worktree 和浏览器验证需要环境管理，独立 review 也会占用人的时间。Loop 只会放大已有的判断，需求边界写得含糊，自动化只会更快地把含糊扩散到代码和文档里。

所以我给这套流程留下了两个必须由人通过的关口：需求批准和提交批准。中间的搜索、脚手架、测试和验证可以自动推进，产品意图和最终变更仍然由人负责。

## 我的落地顺序

第一步是让需求 Skill 先稳定产出 User Stories、行为矩阵和升级风险。第二步是让 Issue Skill 严格消费这些文档，补齐 E2E、demo、单测和验证记录。第三步再接入 GitLab，把类型检查、测试和构建交给确定性的流水线。

`wayfinder → to-spec → to-tickets → implement → code-review` 把“模型会不会写”之外的工程问题显式化了：谁在做决定，决定依据是什么，什么时候必须停下来问人，完成以后如何证明没有扩大影响范围。
