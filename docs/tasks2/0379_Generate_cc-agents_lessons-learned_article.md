---
name: Generate cc-agents lessons-learned article
description: Generate a three-language article (Chinese first, then English + Japanese) capturing key lessons from cc-agents project history
status: Canceled
created_at: 2026-04-13
updated_at: 2026-04-14T20:05:15.413Z
folder: tasks2
type: task
priority: high
tags: [article, cc-agents, lessons-learned, documentation]
profile: standard
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0379. Generate cc-agents lessons-learned article

### Background

本任务旨在输出一篇关于 cc-agents 项目经验教训的文章。项目从 2025-10-25 开始，历经三个主要阶段：v1(monolithic agents)、rd2(expert subagents)、rd3(fat-skills/thin-wrappers)。以下是从代码仓库(git log 560+ commits)和对话历史(~12K条对话记录)中提取的综合研究成果：

---

## Git 仓库历史分析

### 阶段时间线

| 阶段 | 插件 | 首次提交 | 核心主题 |
|------|------|---------|---------|
| v1.0 | rd | 2025-10-25 | 初始项目设置，基于 prompts 的任务管理 |
| v1.1.x | rd | 2025-11 | 增强，多插件结构重组(Oct 26) |
| rd2 | rd2 | 2026-01-20 | 专家子代理架构 |
| rd3 | rd3 | 2026-03-15 | Fat-skills，DAG编排，验证基础设施 |

### 关键里程碑

| 日期 | 提交 | 描述 |
|------|------|------|
| 2025-10-25 | dcdfa285 | 项目初始化 — 单个 `agents/` 目录 |
| 2025-10-26 | 35372b88 | 多插件结构重组 — `plugins/rd/`, `plugins/wt/` 分离 |
| 2026-01-20 | c2a94a22 | rd2 插件创建 — 专家子代理模式 |
| 2026-01-20 | abbed3fa | 重构为专家子代理(一天内50+提交) |
| 2026-03-15 | 5c75958b | rd3 插件创建 — 41 skills, 10 subagents |
| 2026-03-26 | 多提交 | verification-chain 添加(单会话10次提交) |
| 2026-04-11 | 多提交 | orchestration-v2 简化(单会话20+提交) |
| 2026-04-13 | 进行中 | 当前: rd3 v2 简化浪潮 |

### 架构演进

**v1 (rd)**: Monolithic agents + prompts CLI
- `10-stages-developing` skill with 10 sequential phases
- `prompts.sh` as task CLI
- ~10 skills, ~5 agents

**rd2**: Expert subagent pattern
- Split monolithic agents into expert variants (`coder-claude`, `coder-gemini`, etc.)
- Introduced `cc-skills` for skill management
- ~20 skills, ~15 agents
- Problem: Agents grew too large (super-coder.md hit 1201 lines)

**rd3**: Fat-skills with thin wrappers
- Skills contain all logic; agents/commands are thin wrappers (~50-100 lines)
- 41 skills across orchestration, planning, dev lifecycle, code quality, architecture
- DAG-based `orchestration-v2` replaces hardcoded sequential loops
- `verification-chain` as shared verification substrate
- Platform-agnostic: Claude Code, Codex, OpenCode, OpenClaw, Antigravity, PI

---

## 对话历史综合时间线

### 设计转折点

| 日期 | 对话主题 | 决策 |
|------|---------|------|
| ~Nov 2025 | `prompts.sh` 太复杂 | 创建到 `/opt/homebrew/bin/tasks` 的软链接 |
| Jan 2026 | rd agents 太大 | 重构为专家子代理 |
| ~Mar 2026 | super-coder.md 达1201行 | 头脑风暴: 提取skills，减少agent大小 |
| ~Mar 2026 | superpowers:brainstorm 模式 | 引入薄包装头脑风暴 |
| ~Mar 2026 | 9阶段工作流太死板 | 混合门控模型: 按阶段自动+人工门控 |
| 2026-03-26 | 缺少验证基础设施 | 规划 `verification-chain` 作为基础skill |
| 2026-03-26 | 缺少请求入口 | 规划 `request-intake` skill |
| 2026-04-11 | orchestration-v2 积累太多 | 简化浪潮开始 |
| 2026-04-13 | Tasks schema 有 `:` 解析bug | 50+提交修复YAML frontmatter中的冒号 |
| 2026-04-13 | 当前 | 3个活跃重构: task-decomposition, verification-chain, orchestration-v2 |

---

## 我们做得好的一面

### 1. Fat-skills, Thin-wrappers 架构

**证据**: 任务0264(2026-03-26)明确设计。rd3 README明确阐述。

原则: skills 包含所有逻辑，而 agents/commands 保持薄(~50-100行)。这防止了 rd2 中 super-coder.md 达到1201行的 agent-bloat 反模式。这使得 skills 可独立测试和跨平台复用。

**置信度**: HIGH — 架构决策有文档记录，41-skill rd3 插件验证。

### 2. 多平台抽象

**证据**: README 显示支持7个平台，统一命名约定 (`{plugin}:{entity}` → `{p}-{name}`)。

安装脚本自动为非Claude平台将冒号重写为连字符。这是真正的架构成就 — 一次编写，运行在 Claude Code, Codex, OpenCode, OpenClaw, Antigravity, PI 上。

**置信度**: HIGH — 代码库验证。

### 3. 混合门控哲学

**证据**: 任务0264定义 `profile`(simple/standard/complex/research)决定哪些阶段运行、哪些门控适用。

洞察: 不是每个任务都需要全部9个阶段，门控应根据任务复杂度变化。简单任务获自动门控；复杂任务获人工审核门控。

**置信度**: HIGH — 任务0264文档记录，orchestration-v2实现。

### 4. 早期反幻觉投资

**证据**: `anti-hallucination` skill 有16个研究来源，2,500+ citations，集成到所有研究委托skills。

这是一个真正的洞察 — 系统设计时就在考虑验证协议，而非寄希望于准确输出。

**置信度**: HIGH — skill存在，有文档研究基础。

### 5. Verification-chain 作为共享底层

**证据**: 任务0377显示架构意图: verification-chain 应是"其他agent skills的权威验证底层"。

不是复制orchestration-v2中的checker逻辑，而是计划让verification-chain成为单一CoV运行时。这避免了验证重复问题。

**置信度**: HIGH — 任务0377文档记录为设计目标。

### 6. 通过Dogfooding迭代改进

**证据**: 项目用自己来构建自己。任务0376/0377/0378正在重构运行该项目的skills。

这是成熟的工程 — 粗糙的边缘被用工具本身来精炼。

**置信度**: HIGH — 活跃重构任务证据。

---

## 我们做得差的一面

### 1. 过早的具体阶段命名 (Bug-Fix分解矛盾)

**证据**: 任务0376文档记录矛盾:
- task-decomposition SKILL.md 推荐 bug 修复用 `Single task with investigation subtasks`
- 但 anti-phase-decomposition 规则禁止 `investigation/design/implementation/testing` 子任务
- 这些直接相互矛盾

**根本原因**: 阶段名称是具体的("investigation", "design")而非抽象的("deliverable-based")。规则演进时没有调和矛盾。

**置信度**: HIGH — 任务0376 review findings 文档记录。

### 2. Verification-chain 中 JSON文件状态持久化

**证据**: 任务0377 review 发现:
- `saveState()` 记录错误而非大声失败
- JSON文件在 `<stateDir>/cov/...cov-state.json` — 非集成级别
- Resume路径损坏: 假设了 verification-chain 不提供的CLI接口

**根本原因**: 构建了一个库风格模块而没有先定义CLI契约。然后 orchestration-v2 尝试作为CLI调用。

**置信度**: HIGH — 任务0377 review findings 文档记录。

### 3. 早期阶段的过度分解 (实现步骤碎片)

**证据**: 任务0376 — task-decomposition "有时过度分解工作为实现步骤碎片"。

`docs/tasks2/` 中的115个任务文件显示重度分解。许多任务如0323-0350+是父任务的单子任务分解，创建深层嵌套而无明确价值。

**根本原因**: 没有强制执行最小任务大小地板。"2-8小时任务"启发式存在于文本中但未在操作层面强制执行。

**置信度**: HIGH — 任务0376文档记录。

### 4. 命名约定漂移

**证据**: verification-chain 中方法名 `content_match` vs `content-match` — 代码库不同部分命名分歧。

还有: `profile` vs `preset` 在任务 frontmatter 中 — 两个字段含义相同，需要遗留别名处理。

**根本原因**: 早期阶段没有强制执行命名约定或linting。不同会话使用不同约定。

**置信度**: HIGH — 代码库可见，任务0378文档记录。

### 5. orchestration-v2 积累的职责 (上帝对象)

**证据**: 任务0378: "当前引擎仍然同时拥有太多职责: FSM生命周期、DAG调度、执行器路由、门控语义、人工门控行为、自动门控行为、状态/事件持久化。"

这是经典的"上帝对象"问题，发生在没有强制执行子系统边界的增量开发中。

**根本原因**: 增量开发 — 每个新需求添加到编排器而非创建新子系统。

**置信度**: HIGH — 任务0378 review findings 文档记录。

### 6. WBS竞争条件和Task CLI Bug

**证据**: 2026年3月多次修复 "rd3:tasks on WBS race condition"，"invalid status"，"fix issue with character ':' in task file frontmatter"(50+修复提交)。

**根本原因**: Task CLI构建时没有事务保证。并发任务创建可能产生WBS冲突。YAML解析没有处理边缘情况。

**置信度**: HIGH — 50+修复提交证据。

### 7. Super-Coder Agent膨胀 (1201行)

**证据**: 对话历史显示多个会话讨论 "super-coder.md 现在有1201行" 和头脑风暴如何缩减。

**根本原因**: rd2中的专家子代理模式将太多逻辑直接放在agents中而非委托给skills。胖agents，不是胖skills。

**置信度**: HIGH — 对话证据。

### 8. 阶段名称假设: "所有阶段总是执行"

**证据**: 任务0331(编排器架构评审)标记"编排器假设所有阶段总是执行" — 但基于profile的门控应该跳过阶段。

这意味着测试、管道、文档假设完整执行，而profile-based gating之后跳过了阶段，导致混乱。

**根本原因**: 早期设计假设顺序瀑布而非条件DAG。

**置信度**: HIGH — 任务0331文档记录。

---

## 为开发新编码Agent组件的关键教训

### 教训1: 在构建库之前先定义CLI契约

**规则**: 如果某物将被其他系统调用，先定义CLI/API契约。不要构建库然后再改造CLI。

**证据**: verification-chain 作为库构建 (`runChain()`, `resumeChain()`) 但 orchestration-v2 尝试作为CLI调用。任务0377正在重做这个正确的事情。

### 教训2: 从第一天起强制执行命名约定

**规则**: Lint所有实体名称。`content_match` vs `content-match` 是工具失败，不是判断失败。

**证据**: April 2026(task 0282)的 `biome` 采用是第一次认真的格式一致性尝试。早期阶段没有强制约定。

### 教训3: 事务性持久化状态或不持久化

**规则**: 如果保存状态，它必须是正确的。`saveState()` 记录错误并继续比不持久化更糟 — 它创造虚假信心。

**证据**: 任务0377标记 `saveState()` 错误被记录但被忽略。这导致 orchestration-v2 中的resume失败。

### 教训4: 分离验证语义与编排逻辑

**规则**: 门控/checker行为属于一个地方。orchestration-v2 不应重新实现 verification-chain 已经做的事情。

**证据**: 任务0378显示 orchestration-v2 中6个子系统与验证语义纠缠。修复是使 verification-chain 成为权威运行时。

### 教训5: 使分解规则确定性

**规则**: 产生3个结果(skip/should/must decompose)的决策规则表比叙述性指导更好。叙述允许解释；规则强制一致性。

**证据**: 任务0376正在专门重构 task-decomposition 以消除"太过启发式"行为并替换为评分模型。

### 教训6: Profile/Preset 是一次性门

**规则**: 选择一个字段名并坚持下去。`profile` vs `preset` 分裂是演进命名约定的技术债务。

**证据**: Tasks CLI 中的遗留别名处理(`profile` → `preset`)和整个代码库。

### 教训7: 将扩展点构建到核心内核

**规则**: 从薄内核开始，将策略作为扩展添加。不要在内核中构建完整系统。

**证据**: 任务0378明确保留"并行执行集、one-of/all-of执行、结果聚合器"作为未来工作的扩展点 — 但核心首先被简化。

### 教训8: Dogfood你的工具

**规则**: 用系统构建系统。你发现的粗糙边缘是正确的重构方向。

**证据**: 任务0376/0377/0378使用rd3 skills重构rd3 skills。简化浪潮由dogfooding发现触发。

### 教训9: 记录"为什么"而非"是什么"

**规则**: 只有背景/需求而没有历史上下文说明为什么做决定的任务文件随时间变得不可读。

**证据**: 几个任务文件显示"Q&A"部分但没有记录设计选择的原因。"Review"部分始终为空。

### 教训10: 反模式必须可操作化，而不仅仅是文档化

**规则**: 在散文中说"永远不要创建小于1小时的任务"不是强制执行。将其构建到具有硬地板的分解规则中。

**证据**: 任务0376发现1小时地板存在于散文中但不在决策模型中 — 导致过度分解。

---

## 总结表

| 类别 | 什么有效 | 什么无效 |
|------|---------|---------|
| **架构** | Fat-skills/thin-wrappers | 编排器中积累的职责 |
| **多平台** | 7平台抽象 | 跨平台命名漂移 |
| **验证** | 早期反幻觉skill | JSON文件持久化，重复门控逻辑 |
| **任务管理** | WBS系统，profile门控 | 竞争条件，YAML中的冒号，过度分解 |
| **开发过程** | Dogfooding，迭代重构 | 过早具体阶段命名 |
| **CLI设计** | 统一 `tasks` CLI | verification-chain 无契约优先 |
| **治理** | 9阶段门控工作流 | 假设所有阶段总是执行 |

**置信度总结**: 所有发现为 HIGH 置信度，基于2025-10-25至2026-04-13的560+提交、115个任务文件、~12K对话条目和活跃重构任务0376/0377/0378的文档证据。

---

### Requirements

1. **先写中文文章**，待中文版定稿后再翻译成英文和日文
2. **先产出大纲**，待确认后再开始正文撰写

### Q&A

- Q: 文章目标读者是谁？
- A: 其他AI编码平台开发者、项目管理者、对agent技能开发感兴趣的工程师

- Q: 文章结构应该是什么风格？
- A: 技术回顾文章，含架构演进、经验教训、具体建议

- Q: 是否需要包含代码示例？
- A: 核心概念用架构图描述，不需要代码示例

### Design

待确认大纲后补充

### Solution

待大纲确认后实施

### Plan

- [ ] Step 1: 生成文章大纲（中英文）
- [ ] Step 2: 确认大纲（用户反馈）
- [ ] Step 3: 撰写中文全文
- [ ] Step 4: 用户审核中文版
- [ ] Step 5: 翻译为英文
- [ ] Step 6: 翻译为日文
- [ ] Step 7: 最终审阅三语言版本

### Review

[待完成]

### Testing

[待完成]

### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References

- `docs/tasks2/0376_Refactor_rd3_task-decomposition_into_a_deterministic_granularity_engine.md`
- `docs/tasks2/0377_Refactor_rd3_verification-chain_into_a_CLI-first_SQLite-backed_CoV_runtime.md`
- `docs/tasks2/0378_Simplify_rd3_orchestration-v2_into_a_thinner_scheduling_kernel.md`
- `docs/tasks2/0264_Agent_skills_review_and_new_agent_development_plan.md`