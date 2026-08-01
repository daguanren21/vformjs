# 从 Prompt 到 Loop：Skills、AGENTS.md 与 AI 编程工程的下一层

过去两年，很多人把 AI 编程理解成「把需求说清楚」。这个判断对了一半。单次对话里，说清楚目标、补齐背景，确实能换来更好的回答。任务一多、仓库一大、还要并行改代码，瓶颈就会从「模型会不会写」变成另一组问题：任务怎么进队列，上下文怎么交接，结果怎么被验证，中断之后怎么恢复。

2026 年前后，这套工作方式常被叫做 Loop Engineering：工作逐渐从「亲手 prompt agent」变成「设计会 prompt agent 的系统」。我对照组件库流程里的落地，把 Loop、Skills、AGENTS.md 相关工程判断整理成这篇讲解稿。适合做团队分享，也可以直接发知乎、掘金或公众号。

---

## 一、先分清三层：Harness、Loop、Graph

近两个月，「Graph Engineering」又开始热。名词会轮换，层可以先固定：

**Harness** 管单次 agent 的运行环境：工具、MCP、沙箱、worktree、hooks、权限边界。同一模型换 harness，token 消耗可以差一个数量级。有一组公开对比：同一任务、同一模型，不同 harness 的 token 差到 30 倍量级。成功率接近时，你付的往往是「反复重读上下文、反复重开推理」的税。

**Loop** 管闭环：发现工作、分发工作、校验结果、写下状态、决定下一步。一个直白定义：loop 是一个带目标的递归过程，系统迭代到完成条件成立。你设计的是系统，不是单条提示词。

**Graph** 管多个 loop 的编排：串行、并行、依赖、回退。复杂产品里常是 loop + graph 混用，很少有人只押一边还把生产系统做稳。

把三层混成一个口号，讨论会空转。写代码时先问：现在缺的是环境，是闭环，还是编排？

---

## 二、Loop Engineering 在讲什么

Loop 可以拆成五块积木，外加一块磁盘记忆：

1. **Automations**：定时发现与 triage。Codex 的 Automations、Claude Code 的 `/loop`、cron、hooks、GitHub Actions，都是心跳。
2. **Worktrees**：并行 agent 各改各的工作区，避免同文件互踩。
3. **Skills**：把项目知识写成可加载流程，避免每轮从零猜约定。
4. **Plugins / MCP connectors**：接到 issue tracker、CI、Slack、staging、浏览器。
5. **Sub-agents**：写的人和查的人分开。
6. **Memory on disk**：markdown、Linear、GitHub Issue 都行。模型会忘，仓库不能忘。

这和「再试一次」的死循环不同。queue over loops 强调：Issue 队列、Agent 执行队列、人工审阅队列分流。失败任务带着证据停在队列里，而不是无限重试。`agent:implement`、`agent:review` 这类标签同时当状态和权限边界。

我自己落地时，把状态流写成下面这样：

```text
intake
 → needs_clarification
 → wayfinding / grilling
 → awaiting_spec_approval
 → ready_for_implementation
 → implementing
 → automated_verification
 → independent_review
 → human_review
 → awaiting_commit_approval
 → completed | blocked
```

每个状态要有进入条件和退出证据。产品决策、升级风险、连续重复阻塞，交回给人。中间的搜索、脚手架、测试、验证可以自动推进。

人至少守两个关口：

1. 规格批准
2. 提交 / 发布批准

规则文件和 skill 行为语义的改动，也建议单独走人审。自动化可以提议，不能直接改项目法。

---

## 三、Skills：流程的压缩包，不是提示词仓库

Skills 在 2026 年已经是跨工具的公共格式：一个目录，里面有 `SKILL.md`，可选 scripts、references、assets。Claude、Codex 都能吃。设计原则仍旧好用：

- 短
- 可组合
- 按需加载（progressive disclosure）
- 尽量 harness-agnostic

调用层级值得单独记住：

| 层级 | 含义 | 代价 |
|---|---|---|
| user-invocable | 人显式 `/skill` 或 `$skill` | 认知负载 |
| model-invocable | description 匹配时自动加载 | 上下文负载 |
| skill-invocable | skill 调 skill，做 handoff | 契约复杂度 |

对比很清楚：model-invoked 换 context；user-invoked 换认知。能降低认知负载的设计，通常更划算。稳定、低风险、高频的流程，再考虑自动触发。

### grill-me / wayfinder 这一套怎么用

规划侧最常见的是：

- `/grill-me`：澄清决策树。v1.2 起默认按轮次批量提问，不再一问一轮。
- `/grill-with-docs`：单会话规划，结合文档。
- `/wayfinder`：多会话规划，维护 decision map，只在 frontier 上推进。
- `/to-spec`、`/to-tickets`、`/implement`、`/code-review`

大任务常用链：

```text
/wayfinder → /to-spec → /to-tickets → /implement → /code-review
```

小任务可以更短：

```text
/grill-with-docs → /implement
```

还有一个很实用的升级路径：先 `/grill-with-docs`，发现比想象中大，再 `/wayfinder make a map of this`。Wayfinder 产出的是 decision tickets，不是 implementation tickets。有人把 wayfinder 当完整实现流水线，实践里更常把它当 planner，地图做完再 to-spec。

batch-grill 的意义也很具体。一问一轮时，人很容易每轮回「I agree」，决策质量掉、token 也烧。按依赖分轮批量提问后，同样 13 个问题可以从 13 轮压到大约 3 轮，仍只问当前 frontier。

### 写 skill 时我建议盯的细节

1. **一个 skill 只做一段可复用工作。**
 需求 skill 可以写到 `awaiting_spec_approval`，不要偷偷改业务代码；Issue skill 只消费已批准规格。

2. **description 写无聊一点、准一点。**
 触发靠 description。社区里常见吐槽：skill 没坏，agent 根本看不见它。

3. **优先写「如何不该用」。**
 库和框架的 docs，agent 自己会爬。更缺的是 footguns，按严重度排。这一点仍然成立。

4. **轻量优先。**
 过长 skill 又烧 token 又难 review。先砍重复和 no-op。一个常见对比是：有的 skill 集给 agent 超能力，有的 skill 集更想给人超能力。

5. **用 handoff contract 交接。**
 稳定输入输出：文档路径、状态字段、验收证据。不要每轮把整本项目规则塞进提示词。

6. **失败模式要沉淀。**
 从会话纠正和 PR 纠正里提炼规则。只禁 “em dash / delve” 这种词，解决不了写作系统和工程判断问题。

7. **MCP 和 skill 分工。**
 MCP 接外部系统；skill 管流程与判断。认证、权限这类高频摩擦，企业自研时常内置进 harness，比每步绕 skill/MCP 鉴权省事。

分发上，分发上可以用 Claude plugin 或 `npx skills add/update`。安装成本下降后，维护成本会变成「更新后行为是否还符合你的团队」。

---

## 四、AGENTS.md：索引，不是百科

`AGENTS.md` / `CLAUDE.md` 很容易写成第二本 README，再写成第三本内部 Wiki。写肥了，每次会话都付 token 税；写空了，agent 每轮重猜。

更稳的定位是：**索引 + 硬约束**。

放进去的：

- 架构入口和包边界
- 常用命令
- 绝对不能碰的区域
- 测试与验证入口
- 指向 skills / docs 的指针

不要长期塞进去的：

- 可按需加载的完整流程
- 临时失败日志
- 和 README / plan / PR 互相打架的说明
- 没有本仓失败上下文的「别人家的规则」

修剪 AGENTS.md 时，有几条反复出现的经验：

1. **规则是失败长出来的疤。**
 有人说 CLAUDE.md / AGENTS.md 的全局设置，该共享的是「结构 + 要防止的 failure mode」，不是脱离失败语境的字面文本。拷来一套别人的文件，却无法验证规则是否还成立，价值有限。

2. **大仓库不靠更大 context window。**
 更小的文件、更描述性的目录、AGENTS.md 里更好的 context pointers，通常比「把一切塞进 100 万 token」更稳。

3. **文档会忘，机械约束不会。**
 会话一长，agent 会漂。能做成 linter、hook、CI 的规则，优先做成机械门禁。文档负责说明意图，工具负责卡住回退。

4. **从纠正回写，但要人批。**
 一个可行流程：看最近 30 天会话或 PR 里你纠正过什么 → 找模式 → 写成候选规则 → 人审后再进 AGENTS.md 或 skill。self-improvement loop 可以提议，不能直接改项目法。

5. **写作系统优于禁词列表。**
 只写 “don’t use em dash / delve / AI 味” 往往无效。给 prose 和工程输出一套可执行标准，再配合检查，效果更稳。

我建议的记忆分层：

```text
AGENTS.md # 索引 + 硬约束
.agents/skills/ # 可复用流程
docs/requirements/ # 已确认需求与边界
docs/issues/ # 根因、证据、影响
docs/plans/ # 计划（可过期）
.agent-runs/ # 可丢弃运行态
```

一手材料始终优先：需求原文、当前实现、类型声明、测试结果、运行日志。计划、总结、agent 自述是二手材料，不能覆盖前者。

---

## 五、Maker 与 Checker 为什么必须拆开

Loop 一旦无人值守，最大的风险是「写代码的人给自己打分」。

实现 agent 可以改代码、补测试、跑 demo。Checker 应只读：

- 需求与行为矩阵
- diff
- 测试与验证结果
- 升级说明

然后专门找遗漏。`/goal` 用独立小模型判断完成条件，也是同一思路：停止条件不要交给刚写完代码的那个上下文。

组件库场景里，这一点特别痛。DatePicker 加一个 `default-time`，表面上是新 prop，实际要回答：日期切换时保留旧时间还是重置；`string` / `Date` 是否都支持；其他日期类型是否受影响；旧 demo 和 E2E 是否仍代表产品预期。行为变化应先写成矩阵：

```text
场景 旧行为 批准后的行为 兼容性
datetime 切换日期 保留当前时分秒 使用 default-time changed
未提供 default-time 保留当前逻辑 保留当前逻辑 unchanged
date 类型 不接受时间 不增加时间语义 unchanged
```

测试失败也要先分类：产品回归、旧断言、缺 demo、过时 selector、环境故障、已批准的行为变化。直接改断言让 CI 变绿，会把几种情况揉在一起，后续审核很难判断真实影响。

---

## 六、Wayfinding：允许地图上有雾

需求分析最容易犯的错，是为了让计划「看起来完整」，把未知项写成确定结论。

Wayfinder 相关讨论里，decision map 和 frontier / fog of war 反复出现：

- 已确认的决定：必须有需求、代码或测试证据
- 假设和开放问题：必须写验证方式
- 决策前沿：当前无法安全决定的部分

开放问题如果会改变 API、兼容性或迁移方式，任务停在需求阶段。如果只是实现细节，可以在批准范围内继续推进。

规格因此可以保留未知项。完整的假方案，往往比诚实的缺口更危险。

---

## 七、一套能直接抄的最小实践

如果你只想先落地一版，不必一次上齐 graph 编排平台。最小包可以是：

**1. 一份瘦的 AGENTS.md**
只放导航、命令、硬约束、验证入口、skill 指针。

**2. 一组短 skill**

```text
grill-with-docs # 单会话澄清
wayfinder # 多会话决策地图
to-spec # 决策落地成规格
to-tickets # 规格拆跨会话任务
implement # 实现 + 本地验证
code-review # 独立审查
handoff # 会话交接
```

没有 Matt 原版时，也可以按同样边界自写。关键是边界清楚，而不是名字好看。

**3. 文档分层**
`docs/requirements`、`docs/issues`、`.agent-runs` 分开。长期事实和短期运行态不要混。

**4. 两个批准点**
规格批准、提交批准。其余步骤能自动就自动。

**5. 每周修剪一次**
看纠正模式，删失效规则，把长流程挪进 skill，检查 README / AGENTS.md / skills 是否冲突。

日常节奏可以很朴素：

```text
早：automation 扫 CI / issue，写入队列
中：在 frontier 上 grill 或 wayfind，批量决策
夜：AFK implement + independent review
周：从会话和 PR 纠正里回写规则候选
```

---

## 八、Loop 放大的是判断，也放大理解债

有三点值得反复提醒：

1. **验证仍在人。** 无人值守的 loop 也会无人值守地犯错。
2. **理解会腐烂。** 代码生产越快，你没读过的表面积越大。
3. **舒服姿势可能有风险。** 同一条 loop，有人用它加速自己懂的工作，有人用它逃避理解。系统分不清，人要分清。

token 成本也会被放大。quota 加了 500 或 1000，不等于产出同比例变好。先看任务边界和验证证据，再谈加额度。

所以我把目标定成：让 agent 稳定交付可复盘的变更，而不是让聊天更像「有个很能干的同事」。能干的同事也会交糊弄事；可复盘的系统至少留下矩阵、diff、测试和批准记录。

---

## 九、你可以怎么读这件事

如果你现在还在「打开对话 → 贴需求 → 看代码 → 再改提示词」，下一阶段优先补三样：

1. **磁盘上的状态**：队列、规格、运行记录
2. **按需加载的流程**：skills，而不是无限变长的 system prompt
3. **独立检查**：maker / checker 分离，完成条件可验证

Prompt Engineering 没有消失，它退到了局部。Context Engineering 也没有消失，它变成了导航和一手材料管理。Loop Engineering 往上抬了一层：谁在找活，谁在分发，谁在验收，状态写在哪。

名词还会继续换。能留下来的，多半是这些工程判断：短 skill、队列边界、决策地图上的雾、索引型 AGENTS.md、以及人对规格和发布的最终责任。

---
