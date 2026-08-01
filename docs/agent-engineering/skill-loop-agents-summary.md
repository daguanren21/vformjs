# Skills / Loop Engineering / AGENTS.md 要点

> 
> 

---

## 1. 结论先说

近 2–3 个月 近期讨论里的共识，已经从「写更好的 prompt」迁到三层：

| 层 | 问题 | 关键动作 |
|---|---|---|
| **Harness** | 单次 agent 跑在什么环境里 | tools / MCP / sandbox / worktree / hooks |
| **Loop** | 谁找活、分发、校验、记状态、决定下一步 | automation + queue + maker/checker + disk memory |
| **Graph** | 多个 loop 如何并行/串行编排 | wayfinder map、DAG、orchestrator skill |

实用落地仍然是 Matt 那条链：

```text
/grill-me 或 /grill-with-docs
 → /wayfinder（多会话决策）
 → /to-spec
 → /to-tickets
 → /implement
 → /code-review
```

单会话小任务：`/grill-with-docs` → `/implement`
多会话大任务：`/wayfinder` 做决策地图，再 `/to-spec`，不要把 wayfinder 当完整实现流水线。

---

## 2. Loop Engineering 使用技巧

### 2.1 定义（常见定义）

Loop Engineering = **不再自己当逐轮 prompt 的人，而是设计那个会自己 prompt agent 的系统**。

五个积木 + 一块磁盘记忆：

1. **Automations**：定时发现与 triage（Codex Automations / Claude `/loop` / cron / hooks）
2. **Worktrees**：并行 agent 不互相踩文件
3. **Skills**：把项目知识写成可加载流程，避免每轮重猜
4. **Plugins / MCP connectors**：接到 issue tracker、CI、Slack、staging
5. **Sub-agents**：maker 与 checker 分离
6. **Memory on disk**：markdown / Linear / issue tracker；会话可忘，仓库不能忘

关键原话方向：

- steipete：不要再 prompt coding agents，要设计会 prompt 它们的 loop
- Boris Cherny：工作变成写 loop，不是写 prompt
- Addy：loop 在 harness 上一层；harness 是单 agent 环境，loop 是会定时、会 spawn、会自喂的系统

### 2.2 反复出现的技巧

**A. 把「生成 / 校验 / 编排」拆开**
不要做一个 continuous agent 通吃。工程 loop 要窄、要快；开发者反馈 loop 暂时最难自动化，应保留给人。

**B. Queue over infinite retry**
失败任务进队列等证据，不无限重试。Issue 队列 / Agent 执行队列 / 人工审阅队列分流。标签如 `agent:implement`、`agent:review` 同时当状态和权限边界。

**C. Maker ≠ Checker**
实现 agent 改代码；review agent 只读需求、行为矩阵、diff、测试结果。`/goal` 用独立小模型判完成条件，也是 maker/checker 分离。

**D. 停止条件必须可验证**
`/goal` 要写「tests pass + lint clean」这类硬条件，不是「看起来差不多」。

**E. 状态写盘，不写聊天**
`.agent-runs/`、issue tracker、wayfinder map 才是恢复点。断会话后从状态和文档继续。

**F. 人只守两个关口**
1. 需求/规格批准
2. 提交/发布批准
中间搜索、脚手架、测试、验证可以自动。

**G. 成本与理解债**
loop 会放大 token 与 comprehension debt。两个人建同一 loop，一个加速自己懂的工作，一个逃避理解——loop 分不清，人要分清。

**H. Harness / Loop / Graph 别混**
- Harness：模型周围的执行层
- Loop：直到合格为止的闭环
- Graph：多 loop 编排
近期「Graph Engineering」热度上升，但生产系统通常是 **loop + graph 混用**，不是二选一。

### 2.3 推荐状态流（结合你之前 Giga UI 文与本次检索）

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
 → completed
```

每个状态要有进入条件与退出证据。

---

## 3. Skill 使用技巧

### 3.1 设计原则（仍成立，且被反复强化）

- **短、可组合、按需加载**
- **progressive disclosure**：先 description 触发，再读 body / references
- **harness-agnostic**：同一 SKILL.md 跨 Claude / Codex / 其他 harness
- **调用层级**
 - user-invocable：人显式 `/skill` 或 `$skill`
 - model-invocable：描述匹配时自动加载（认知负载换 token）
 - skill-invocable：skill 调 skill（handoff）

可以这样对比：

> model-invoked skills = context load
> user-invoked skills = cognitive load
> 任何降低认知负载的设计都是赢

### 3.2 grill-me / grill-with-docs / wayfinder 怎么用

| Skill | 场景 | 注意 |
|---|---|---|
| `/grill-me` | 通用澄清决策树（已扩展到非工程） | v1.2 起默认 **batch / rounds**，不再一问一轮 |
| `/grill-with-docs` | **单会话**规划，结合文档 | 小 feature、可一次谈完 |
| `/wayfinder` | **多会话**规划；决策地图；frontier / fog of war | 产出 decision tickets，不是 implementation tickets |
| `/to-spec` | 地图/决策完成后写规格 | wayfinder 完成后应 to-spec |
| `/to-tickets` | 规格拆多 agent 会话任务 | 跨会话才需要 |
| `/implement` | 实现；内部可调 `/code-review` | 不要跳过批准 |
| `/handoff` + `/teach` | 被问住时交给教学 agent | 一手材料优先 |
| `/writing-great-skills` | 写 skill / 写给 agent 的文档 | 可扩展到 AGENTS.md |

常用流：

```text
1. /grill-with-docs <issue>
2. 「比我想的大」
3. /wayfinder make a map of this
4. 地图完成后 /to-spec → /to-tickets → AFK implement
```

或：

```text
/wayfinder <ambitious idea>
→ 只在 frontier 上决策
→ 研究/原型放后台
→ map 存在 issue tracker
```

### 3.3 写 Skill 的实操技巧（实践）

1. **一个 skill 只做一段可复用工作**
 需求 skill 停在 `awaiting_spec_approval`，不改业务代码；issue skill 只消费已批准规格。

2. **description 要无聊且精确**
 触发靠 description；花哨文案会漏触发或乱触发。
 社区观察：**坏 skill 经常不是坏，是 agent 看不见它。**

3. **优先写「如何不该用」**
 库/框架 skill 更需要 footguns 列表（按严重度），而不是再抄一遍 docs。docs agent 自己会爬。

4. **轻量优先**
 过长 skill = 烧 token + 难 review。先砍重复与 no-op。
 对比 superpowers：Matt 说 superpowers 给 agent 超能力；他的 skills 给 **人** 超能力。

5. **skill 之间靠 handoff contract**
 稳定输入输出（文档路径、状态字段、验收证据），不要每轮塞全项目规则。

6. **可配置，少改本体**
 尽量通过配置调 skill，而不是 fork 后改烂。

7. **Fat harness / Thin skills 辩论**
 有人写「Fat Harness, Thin Skills」：通用 agent 程序保持小，可复用流程放 Markdown skill。另一面是项目自定义 review standards 很难做成通用 skill——那时直接项目 review agent 更合适。

8. **MCP 与 skill 分工**
 - MCP：接外部系统（tracker、DB、browser、CI）
 - Skill：流程与判断
 企业自研常把认证等摩擦内置进 harness，避免每步 skill/MCP 鉴权摩擦。

9. **失败模式要 skill 化**
 从会话/PR 纠正模式里提炼规则，写成 skill 或 AGENTS.md 条目；不要只禁词（no em-dash / no delve）。

10. **batch-grill 是方向**
 一问一轮容易「I agree」空转；按依赖分轮批量提问更快、更省 token，仍只问 frontier。

### 3.4 安装与分发

- `npx skills add / update`
- Claude plugin / `npx skills add` 分发（减少手动同步）
- 可配置 alias 避免与内置 skill 撞名
- 课程：AI Skills for Real Engineers（含 pruning AGENTS.md 长课）

---

## 4. AGENTS.md 优化技巧

### 4.1 定位：索引，不是百科

AGENTS.md / CLAUDE.md 应是：

- 架构入口
- 命名与命令
- 硬约束（别碰什么）
- 测试/验证入口
- **指向** skills / docs / packages 的指针

不应：

- 塞满可按需加载的流程细节
- 长期堆临时失败日志
- 与 README / plan / PR 描述互相矛盾

### 4.2 优化 checklist（综合检索）

1. **先 prune，再加规则**
 pruning AGENTS.md 是课程里最长的一节——说明默认都写肥了。

2. **只写失败长出来的疤**
 规则本质是「自己踩过的坑」。复制别人的 AGENTS.md 字面文本，却没有失败上下文，就无法验证规则是否还成立。共享时共享 **结构 + 要防止的 failure mode**。

3. **小文件 + 好导航 + 指针**
 大仓库不靠更大 context window，靠：
 - 更小文件
 - 更描述性的目录
 - AGENTS.md 里更好的 context pointers

4. **一份主 AGENTS.md，必要时分层**
 常见：repo 根一份；子包可薄覆盖。社区有人在 50–100k tokens 量级才拆目录级；多数项目一份就够。`CLAUDE.md` 可 symlink 到 `AGENTS.md`。

5. **规则要可机械执行时，别只靠文档**
 会话一长 agent 会忘。文档 + linter/hook/CI（如自定义 doc header linter、STE100 风格 linter）双保险。

6. **从纠正中回写**
 流程：审最近 30 天会话 / PR 纠正 → 找模式 → 写回 AGENTS.md 或 skill。
 self-improvement 可以提议，规则变更仍要人批。

7. **写作系统 > 禁词列表**
 别只写 “don’t use em dash / delve”。给 prose 规则系统（短词、可删则删、主动态、精确替代）。

8. **与 skills 分工**
 - AGENTS.md：全局不变量、导航、禁区
 - Skills：阶段性流程
 - docs/requirements & docs/issues：已确认事实
 - `.agent-runs/`：可丢弃运行态

9. **并行协作提示**
 不用 worktree 时，至少在 AGENTS.md 声明「假设有其他 agent 同仓工作，谨慎改文件」。

10. **版本/会话启动输出**
 有人在 AGENTS.md 要求会话开头输出 prompt/规则版本，便于审计哪版规则在起作用。

---

## 5. MCP 近 2 个月相关要点

- MCP 是 loop 的「手脚」：issue tracker、browser、DB、Slack
- 技能目录（skills.sh 等）热度高，但质量参差；优先项目内 thin skills
- computer-use skill 有人抱怨过慢，常 ESC；对 UI 验证要选对工具与超时
- Codex / Claude 都在强化 skills + MCP + multi-agent；差异更多在 harness 细节与调用语法（`/` vs `$`）
- 同一模型在不同 harness 上 token 可差到数量级——loop 设计要看 **token 效率**，不只成功率

---

## 6. 可直接落地的最小实践包

### Skills

```text
.agents/skills/
  grill-me/              # 可改为 batch-grill
  wayfinder/             # 多会话决策
  to-spec/
  implement/
  code-review/
  handoff/
  writing-great-skills/
```

### 记忆分层

```text
AGENTS.md # 索引 + 硬约束
docs/requirements/ # 已确认需求与边界
docs/issues/ # 根因、证据、影响
docs/plans/ # 计划（可过期）
.agent-runs/ # 可丢弃运行状态
```

### 人机关口

1. spec 批准
2. commit/release 批准
3. 规则变更批准（self-improve 不得直接改 AGENTS.md）

### 日常循环

```text
早：automation triage CI/issues → 写队列
中：frontier 上 grill / wayfind → 批决策
夜：AFK implement + independent review
周：会话/PR 纠正模式 → prune AGENTS.md / 更新 skills
```

---
