## 摘要

本文是一份关于 AI 编程代理技能（Agent Skills）跨平台比较的深度研究报告。研究覆盖了 7 个主流平台（Claude Code、Codex、Gemini CLI、Google Antigravity、OpenClaw、pi-mono、OpenCode），从技能定义格式、斜杠命令系统和子代理架构三个维度进行了全面对比分析。

**标签**: `#AI编程工具` `#AgentSkills` `#跨平台兼容` `#技能开发` `#研究报告`

---

---
research_date: 2026-03-12
topic: Agent Skills 与 Slash Commands — 跨平台比较研究
confidence: HIGH
sources_count: 45+
search_date: 2026-03-13
status: Final
platforms_covered: Claude Code, Codex, Gemini CLI, Google Antigravity, OpenClaw, pi-mono, OpenCode
---

# Agent Skills 与 Slash Commands：跨平台比较研究报告

## 背景与动机

本研究旨在应对 AI 编程代理领域发生的以下变化：

- **Anthropic 发布 Claude Code Agent Skills 2.0**，通过新的 [Skill Creator](https://github.com/anthropics/skills/tree/main/skills/skill-creator) 引入了以 `SKILL.md` 为可移植格式的程序化技能创建方式
- **OpenAI Codex 支持程序化技能创建**，拥有自己的 [skill-creator](https://github.com/openai/codex/tree/main/codex-rs/skills/src/assets/samples/skill-creator) 技能和 `agents/openai.yaml` UI 元数据扩展
- **现有的 cc-agents 插件**（[github.com/robinmin/cc-agents](https://github.com/robinmin/cc-agents)）需要适配 Claude Code、Codex、Gemini CLI 及其他新兴 AI 编程代理

**研究目标：**

1. 比较 Claude Code Skill Creator 和 Codex Skill Creator 的实现方式
2. 将两者与 [agentskills.io 开放标准](https://agentskills.io/home) 进行对比
3. 扩展比较范围至 Gemini CLI、Google Antigravity、OpenClaw、pi-mono 和 OpenCode
4. 识别跨平台可移植性要求和多代理技能编写的最佳实践
5. 为将现有 Claude Code 插件转换为自适应跨平台技能提供具体迁移指南

研究进一步扩展（超出技能范畴）以比较：
- **斜杠命令/用户可调用操作系统**（第 9 节）
- **子代理/代理定义系统**（第 10 节）

---

## 执行摘要

1. **Agent Skills 开放标准（agentskills.io）已成为事实上的跨平台格式**：最初由 Anthropic 创建，已被 30 多个 AI 编程代理采用，包括 Claude Code、OpenAI Codex、Gemini CLI、GitHub Copilot、VS Code、Cursor、Roo Code 等。核心格式是一个包含 YAML frontmatter（需要 `name` + `description`）和 Markdown 正文的 `SKILL.md` 文件。

2. **所有三个系统共享相同的基础格式**：一个包含 `SKILL.md` 的技能目录，以及可选的 `scripts/`、`references/` 和 `assets/` 子目录。YAML frontmatter 字段 `name`（最多 64 字符，小写连字符）和 `description`（最多 1024 字符）在所有平台上通用。

3. **平台特定扩展存在但不会破坏兼容性**：Claude Code 添加了 `disable-model-invocation`、`user-invocable`、`context`、`agent`、`argument-hint`、`model` 和 `hooks` 字段。Codex 添加了 `agents/openai.yaml` 用于 UI 元数据和调用策略。这些是增量的——仅有 `name` 和 `description` 的基础标准 SKILL.md 可在任何地方工作。

4. **渐进式披露是通用的架构原则**：所有平台在启动时加载技能元数据（约 100 tokens），仅在触发时加载完整 `SKILL.md` 正文，并按需加载支持文件。保持 `SKILL.md` 在 500 行以内。

5. **跨平台可移植性如今已可实现**：按照基础 agentskills.io 规范编写的技能无需修改即可在所有 30 多个兼容代理上工作。平台特定增强功能需要条件适配，详见下文。

## 置信度：HIGH

**来源**：12 个来源来自 agentskills.io、platform.claude.com、code.claude.com、developers.openai.com、GitHub（anthropics/skills、openai/skills）、deepwiki.com
**证据质量**：HIGH — 来自官方来源的主要文档
**日期范围**：2025 - 2026-03-12
**搜索日期**：2026-03-12

---

## 1. Claude Code Skills

### 格式与 Schema

Claude Code 遵循 agentskills.io 开放标准，并添加了一组专有扩展。文件格式为带有 YAML frontmatter 的 Markdown 文件。

**最小有效 SKILL.md：**
```markdown
---
name: skill-name
description: 此技能的功能及使用时机。
---

# Skill Name

[指令内容]
```

**完整的 frontmatter 参考（Claude Code 特定）：**

| 字段 | 必需 | 标准 | 描述 |
|---|---|---|---|
| `name` | 否（默认为目录名） | Yes | 小写、连字符、最多 64 字符 |
| `description` | 推荐 | Yes | 最多 1024 字符，功能 + 使用时机 |
| `argument-hint` | 否 | No | 自动补全提示：`[issue-number]` |
| `disable-model-invocation` | 否 | No | `true` = 仅用户调用 |
| `user-invocable` | 否 | No | `false` = 仅 Claude 调用 |
| `allowed-tools` | 否 | Yes（实验性） | 空格分隔：`Read, Grep, Bash(git:*)` |
| `model` | 否 | No | 覆盖此技能的模型 |
| `context` | 否 | No | `fork` = 在子代理中运行 |
| `agent` | 否 | No | 子代理类型：`Explore`、`Plan`、`general-purpose` |
| `hooks` | 否 | No | 限定于此技能的生命周期钩子 |

**动态上下文注入（仅 Claude Code）：**
```yaml
---
name: pr-summary
description: 总结 pull request
context: fork
agent: Explore
---

PR diff: !`gh pr diff`
PR comments: !`gh pr view --comments`
```

`!`command`` 语法在 Claude 看到提示之前执行 shell 命令，注入实时数据。

**字符串替换（仅 Claude Code）：**
- `$ARGUMENTS` — 调用时传递的所有参数
- `$ARGUMENTS[N]` 或 `$N` — 按索引的位置参数
- `${CLAUDE_SESSION_ID}` — 当前会话 ID
- `${CLAUDE_SKILL_DIR}` — 技能目录的绝对路径

### 目录结构

```
skill-name/
├── SKILL.md           # 必需的入口文件
├── reference.md       # 可选的补充文档
├── examples/
│   └── sample.md      # 示例输出
└── scripts/
    └── validate.sh    # 可执行脚本
```

### 触发机制

三种模式：
1. **自动**：Claude 在启动时读取所有技能的 `description` 字段，并将其与当前任务匹配。description 就是触发器。
2. **手动**：用户输入 `/skill-name`（如果 `user-invocable` 不为 false）。
3. **阻止自动**：设置 `disable-model-invocation: true` — 只有手动调用有效。

技能存放位置：
- `~/.claude/skills/<name>/SKILL.md` — 个人（所有项目）
- `.claude/skills/<name>/SKILL.md` — 项目本地
- `<plugin>/skills/<name>/SKILL.md` — 插件作用域（命名空间为 `plugin:skill`）
- 企业托管设置 — 组织范围

### 关键特性

- **子代理执行**（`context: fork`）：技能在隔离的子代理上下文中运行
- **动态上下文注入**（`` !`cmd` ``）：在 Claude 看到提示之前注入实时 shell 数据
- **调用控制**：精细控制谁/什么触发技能
- **钩子集成**：限定于技能激活的生命周期钩子（pre/post）
- **插件命名空间**：`plugin-name:skill-name` 防止跨插件名称冲突
- **嵌套发现**：自动从子目录 `.claude/skills/` 发现（monorepo 支持）
- **权限控制**：`allowed-tools` 在技能执行期间授予预批准的工具访问权限

### 最佳实践（Anthropic）

- **description 编写触发器**：在 `description` 中包含"它做什么"和"何时使用"。使用第三人称。包含用户自然会输入的领域特定关键词。
- **500 行正文限制**：保持 `SKILL.md` 在 500 行以内；将详情移至引用文件。
- **渐进式披露模式**：SKILL.md 是目录；引用文件按需加载。
- **永远不要在正文中包含"When to Use"**：正文仅在触发后加载；触发逻辑仅属于 `description`。
- **避免辅助文档**：不要 README.md、INSTALLATION_GUIDE.md — 只有任务所需的文件。

---

## 2. OpenAI Codex Skill Creator

### 格式与 Schema

Codex 遵循 agentskills.io 基础标准，并添加了一个主要增量扩展：用于 UI 元数据和调用策略的 `agents/openai.yaml` 文件。

**Frontmatter 字段（Codex）：**

| 字段 | 必需 | 标准 | 描述 |
|---|---|---|---|
| `name` | Yes | Yes | 连字符格式、最多 64 字符、小写 |
| `description` | Yes | Yes | 最多 1024 字符；主要触发机制 |
| `license` | No | Yes | 许可证名称或引用 |
| `metadata` | No | Yes | 任意键值映射 |
| `allowed-tools` | No | Yes（实验性） | 工具权限 |

**注意**：Codex 强制要求 `name`（而 Claude Code 默认为目录名）。Codex 运行时静默忽略未知 frontmatter 字段；VS Code 编辑器会发出警告（仅限外观）。

**agents/openai.yaml（Codex 特定）：**

此可选文件提供 UI 元数据和调用策略：

```yaml
interface:
  display_name: "Skill Creator"
  short_description: "Create or update a skill"
  default_prompt: "Create a new skill for..."
  icon_small: "assets/icon-16.png"
  icon_large: "assets/icon-64.png"
  brand_color: "#FF6B35"

policy:
  allow_implicit_invocation: true    # 默认：true；false = 仅显式

dependencies:
  - type: mcp
    value: "github"
    description: "GitHub MCP server"
    transport: stdio
    url: "..."
```

### 最佳实践（OpenAI Codex）

- **"简洁是关键"**：上下文窗口是公共资源；挑战每个 token。
- **Codex 已经很聪明**：只添加 Codex 不知道的上下文；避免解释它已经知道的内容。
- **设置适当的自由度**：高自由度（文本指令）用于可变任务；低自由度（特定脚本）用于脆弱操作。
- **将所有"when to use"包含在 description 中**：正文在触发后加载；仅将触发逻辑放在 description 中。
- **不要包含 README.md、INSTALLATION_GUIDE.md、CHANGELOG.md**：只有任务必需的文件。

---

## 3. Agent Skills 开放标准（agentskills.io）

### 规范

Agent Skills 格式最初由 Anthropic 创建，作为开放标准发布，托管于 https://agentskills.io。

**核心定义**：技能是一个目录，至少包含一个 `SKILL.md` 文件。

**必需的 frontmatter 字段：**

| 字段 | 必需 | 约束 |
|---|---|---|
| `name` | Yes | 最多 64 字符；`[a-z0-9-]+`；无连续连字符；无首尾连字符；必须匹配目录名 |
| `description` | Yes | 最多 1024 字符；非空；描述功能 + 使用时机 |

**可选的 frontmatter 字段：**

| 字段 | 描述 |
|---|---|
| `license` | 许可证名称或捆绑文件的引用 |
| `compatibility` | 环境要求（最多 500 字符） |
| `metadata` | 任意键值映射 |
| `allowed-tools` | 空格分隔的预批准工具（实验性） |

**目录约定（规范定义）：**
```
skill-name/
├── SKILL.md          # 必需
├── scripts/          # 可选：可执行代码
├── references/       # 可选：文档
├── assets/           # 可选：模板、资源
└── ...               # 任何额外文件
```

**跨客户端发现路径（约定，非规范强制）：**
- `.agents/skills/` — 跨客户端标准路径
- `.<client>/skills/` — 客户端特定路径
- `~/.agents/skills/` — 用户级跨客户端
- `~/.claude/skills/` — 现有技能广泛使用

### 三层渐进式披露（通用）：

| 层级 | 内容 | 加载时机 | Token 成本 |
|---|---|---|---|
| 1. Catalog | name + description | 会话开始 | 每个技能约 50-100 tokens |
| 2. Instructions | 完整 SKILL.md 正文 | 技能激活时 | <5000 tokens（推荐） |
| 3. Resources | scripts/、references/、assets/ | 指令引用时 | 变化 |

### 采用情况

截至 2026-03-12 确认的采用者（来自 agentskills.io 首页）：
- Anthropic: Claude Code, Claude.ai, Claude API
- OpenAI: Codex
- Google: Gemini CLI
- Microsoft: GitHub Copilot, VS Code (Copilot)
- JetBrains: Junie
- Cursor, Amp, OpenCode, OpenHands, Roo Code, Goose, Mux (Coder), Letta, Firebender, Databricks, Snowflake, Laravel Boost, Spring AI, Factory, Emdash, VT Code, Qodo, TRAE (ByteDance), Autohand, Agentman, Mistral Vibe, Command Code, Ona, Piebald

总计：30+ AI 编程代理。

---

## 4. 比较矩阵

| 维度 | Claude Code | Codex | agentskills.io Spec | OpenClaw | pi-mono | OpenCode |
|---|---|---|---|---|---|---|
| **文件格式** | Markdown + YAML frontmatter | Markdown + YAML frontmatter | Markdown + YAML frontmatter | Markdown + YAML frontmatter | Markdown + YAML frontmatter | Markdown + YAML frontmatter |
| **`name` 必需** | 否（默认为目录名） | Yes | Yes | Yes | Yes | Yes（强制；必须匹配目录名） |
| **`description` 必需** | 推荐 | Yes | Yes | Yes | Yes | Yes（强制；最少 20 字符） |
| **调用控制** | `disable-model-invocation`、`user-invocable` | `agents/openai.yaml` `allow_implicit_invocation` | 不在规范中 | `user-invocable`、`disable-model-invocation`、`command-dispatch: tool` | 不支持 | 仅配置级别：`permission.skill` allow/deny/ask 模式 |
| **UI 元数据** | 不在规范中 | `agents/openai.yaml` | 不在规范中 | `metadata.openclaw.emoji`（仅 macOS Skills UI） | 不支持 | 不支持 |
| **依赖声明** | 不在规范中 | `agents/openai.yaml` | 不在规范中 | `metadata.openclaw.requires.*`（二进制/环境/配置加载时门控） | 不支持 | 不支持 |
| **子代理执行** | `context: fork`、`agent:` | 不在规范中 | 不在规范中 | `sessions_spawn` 工具（基于配置，非 skill frontmatter） | 不支持 | 不在 SKILL.md；通过 `agent:` 配置或 `.opencode/agents/` 文件 |
| **动态上下文注入** | `` !`cmd` `` 语法 | 不在规范中 | 不在规范中 | 不支持 | 不支持 | 不在 SKILL.md；仅在命令模板中支持 |
| **参数替换** | `$ARGUMENTS`、`$N`、`${CLAUDE_SKILL_DIR}` | 不在规范中 | 不在规范中 | 原始参数字符串；`{baseDir}` 用于技能目录路径 | 不支持 | 不在 SKILL.md；`$ARGUMENTS`、`$NAME`、`$1`、`$2` 仅在命令模板中 |
| **钩子** | `hooks:` 字段 | 不在规范中 | 不在规范中 | 不在 skill frontmatter | 不支持 | 不在 SKILL.md；JS 插件钩子系统与技能分离 |
| **发现路径** | `.claude/skills/`、`~/.claude/skills/`、plugin | `~/.codex/`、project-local | `.agents/skills/`、`.<client>/skills/` | `<workspace>/skills/`、`~/.openclaw/skills/`、bundled | `~/.pi/agent/skills/`、`.agents/skills/`、`.pi/skills/` | `.opencode/skills/`、`.claude/skills/`、`.agents/skills/`；全局镜像；遍历 git worktree |
| **未知 frontmatter 字段** | 忽略 | 运行时：忽略；VS Code：警告 | 警告，仍加载 | 静默忽略 | 静默忽略 | 静默忽略 |
| **渐进式披露** | Yes（3 层） | Yes（3 层） | Yes（3 层） | Yes（3 层） | Yes（3 层） | Yes（3 层；真正的延迟加载） |

---

## 5. 跨平台可移植性分析

### 共同基础

所有三个系统共享以下基础，形成可移植的基础：

1. **文件格式**：Markdown 文件，带有 `---` 分隔符之间的 YAML frontmatter
2. **必需字段**：frontmatter 中的 `name` 和 `description`
3. **目录结构**：`scripts/`、`references/`、`assets/` 子目录
4. **渐进式披露**：3 层加载（元数据 → 指令 → 资源）
5. **正文长度限制**：500 行 / 5000 tokens
6. **触发机制**：`description` 字段控制技能何时激活
7. **技能中无 README.md**：只有任务必需的文件
8. **路径中使用正斜杠**：始终为 Unix 风格

**可移植的基础 SKILL.md 模板：**
```markdown
---
name: my-skill
description: [第三人称描述技能功能 + 触发时机。最多 1024 字符]
---

# My Skill

## Overview

[简要描述 — 假设代理很聪明，避免解释基础]

## Workflow

1. 步骤一
2. 步骤二
3. 步骤三

## Additional resources

- For API details: see [reference.md](references/reference.md)
- To process files: run `scripts/process.py`
```

### 迁移注意事项

**将现有 Claude Code 技能转换为跨平台：**

1. **保留 SKILL.md 核心** — 如果存在 `name` 和 `description`，它已经满足基础标准
2. **将 description 设为显式** — 如果依赖目录名回退 `name`，添加显式 `name:` 字段
3. **外部化 Claude Code 扩展** — `disable-model-invocation`、`context: fork`、`hooks` 被非 Claude 代理忽略但无害
4. **为 Codex 添加 `agents/openai.yaml`** — 使用 skill-creator skill 中的 `scripts/generate_openai_yaml.py` 生成
5. **添加 `compatibility:` 以符合规范完整性** — 例如 `compatibility: Designed for Claude Code and Codex`
6. **未知 frontmatter**：Codex 运行时忽略未知字段；Claude Code 忽略它们
7. **`` !`cmd` `` 注入**：Codex 和其他代理不支持此语法；它显示为字面文本。移除或包装在条件逻辑中
8. **`$ARGUMENTS` 替换**：这些是 Claude Code 特定的；其他代理按字面接收原始文本

---

## 6. 最佳实践建议

### 多平台技能的最佳实践

**规则 1：保持基础 SKILL.md 简洁以实现可移植性**

跨平台技能的 frontmatter 中仅使用五个标准字段：
- `name`（显式，匹配目录名）
- `description`（全面的触发文本，第三人称）
- `license`（如果需要）
- `metadata`（用于版本/作者信息）
- `allowed-tools`（如果需要工具限制）

**规则 2：将 description 编写为触发规范**

`description` 字段是最重要的字段。它决定技能何时触发。编写为：
- 技能做什么（具体操作）
- 用户会输入的特定触发关键词
- 文件类型或任务模式
- 枚举的用例

示例：
```yaml
description: 分析并总结 Git pull request，通过检查 diff、评论和更改的文件。在审查 PR、编写 PR 摘要、检查 PR 状态或用户提到 pull request、PR review 或 code review 时使用。
```

**规则 3：使用渐进式披露架构**

```
my-skill/
├── SKILL.md        # 概览 + 详情链接（500 行以内）
├── references/
│   ├── domain-a.md # 仅在域 A 相关时加载
│   └── domain-b.md # 仅在域 B 相关时加载
└── scripts/
    └── process.py  # 执行而不加载到上下文中
```

**规则 4：将平台扩展放在已知位置**

对于 Claude Code 特定扩展，使用伴随目录或文档化它们：
```
my-skill/
├── SKILL.md              # 跨平台基础
├── .claude/              # Claude Code 特定覆盖（可选模式）
│   └── SKILL.claude.md   # Claude Code 扩展：context: fork、hooks 等
└── agents/
    └── openai.yaml       # Codex 特定 UI 元数据
```

**规则 5：分发前验证**

- 运行 `skills-ref validate ./my-skill`（agentskills.io 标准）
- 如果目标是 Codex，运行 `scripts/quick_validate.py ./my-skill`
- 检查 `description` 非空且在 1024 字符以内
- 验证 `name` 完全匹配目录名

**规则 6：永远不要包含辅助文档**

不要在技能目录内创建：README.md、INSTALLATION_GUIDE.md、CHANGELOG.md、QUICK_REFERENCE.md。这些会为代理增加噪音并膨胀上下文。所有上下文都应服务于代理，而非人类读者。

**规则 7：将脚本用于确定性操作**

当相同代码会被重复生成，或当一致性至关重要时，将逻辑放在 `scripts/` 中并从 SKILL.md 引用。脚本执行而不加载到上下文中（只消耗其输出）。

---

## 7. 来源与引用

| 来源 | URL | 访问日期 |
|---|---|---|
| agentskills.io Home | https://agentskills.io/home | 2026-03-12 |
| agentskills.io Specification | https://agentskills.io/specification | 2026-03-12 |
| Claude API Agent Skills Overview | https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview | 2026-03-12 |
| Claude Code Skills Documentation | https://code.claude.com/docs/en/skills | 2026-03-12 |
| anthropics/skills GitHub | https://github.com/anthropics/skills/ | 2026-03-12 |
| openai/skills GitHub | https://github.com/openai/skills | 2026-03-12 |
| Codex Skills Documentation | https://developers.openai.com/codex/skills/ | 2026-03-12 |
| Gemini CLI Agent Skills Docs | https://geminicli.com/docs/cli/skills/ | 2026-03-12 |
| OpenCode Skills Documentation | https://opencode.ai/docs/skills/ | 2026-03-13 |

---

## 8. 深入分析：各平台实现差异

### 8.1 Gemini CLI 技能支持

Gemini CLI v0.23.0（2026-01-07 发布）添加了 SKILL.md 支持。关键点：

- **已知互操作性差距**（Issue #15895）：`allowed-tools`、`metadata`、`compatibility` 被解析但被忽略
- **Tier 3 资源**：在激活时平面转储（非延迟加载）
- **activate_skill 工具**：代理使用此工具显式激活技能

### 8.2 Frontmatter 字段处理：精确行为差异

| 平台 | 未知字段处理 | `name` 验证 |
|---|---|---|
| Claude Code | 静默忽略 | 宽松；默认为目录名 |
| Codex | 运行时忽略；VS Code 警告 | 严格；frontmatter 中必需 |
| Gemini CLI | 静默忽略 | 标准 |
| OpenCode | 静默忽略 | 最严格；必须完全匹配目录名 |

### 8.3 技能匹配和触发算法差异

**Claude Code**：
- 在启动时加载所有技能的 name + description
- 使用语义匹配将任务与技能描述关联
- `description` 字段是触发器

**Codex**：
- 类似的语义匹配
- `agents/openai.yaml` 中的 `policy.allow_implicit_invocation` 控制自动触发

**Gemini CLI**：
- 使用 `activate_skill` 工具进行显式激活
- 已知差距：某些 frontmatter 字段被解析但被忽略

### 8.9 平台支持矩阵（更新版）

| 维度 | Claude Code | Codex | Gemini CLI | OpenClaw | pi-mono | OpenCode |
|---|---|---|---|---|---|---|
| **技能文件格式** | SKILL.md + YAML | SKILL.md + YAML | SKILL.md + YAML | SKILL.md + YAML | SKILL.md + YAML | SKILL.md + YAML |
| **name 必需** | No（默认） | Yes | Yes | Yes | Yes | Yes（严格） |
| **description 必需** | 推荐 | Yes | Yes | Yes | Yes | Yes（最少 20 字符） |
| **渐进式披露** | Yes（3 层） | Yes（3 层） | Yes（3 层，有差距） | Yes（3 层） | Yes（3 层） | Yes（3 层，真正延迟） |
| **运行时未知字段** | 忽略 | 忽略 | 忽略 | 忽略 | 忽略 | 忽略 |
| **加载时门控** | No | No | No | Yes（`metadata.openclaw.requires`） | No | No |

### 8.10 OpenClaw 技能系统

OpenClaw 是一个多渠道消息/AI 网关，嵌入 pi-mono SDK。关键特性：

- **`metadata.openclaw.requires.*`**：基于二进制/环境/配置存在性在加载时过滤技能
- **`command-dispatch: tool`**：绕过 LLM 直接分派到工具
- **3 种多代理机制**：sessions_spawn、ACP harness、bash process

### 8.11 pi-mono 技能系统

pi-mono（`github.com/badlogic/pi-mono`）是一个独立的 TUI 编码代理：

- **`/skill:name` 语法**：冒号而非空格
- **`.agents/skills/` 支持**：跨客户端路径
- **故意单代理设计**：无内置子代理机制

### 8.12 OpenCode 技能系统

OpenCode 使用 `.opencode/skills/` 发现和原生 `skill` 工具：

- **严格 name 验证**：必须匹配目录名
- **真正延迟加载**：通过 `skill` 工具
- **JS 插件系统**：`experimental.chat.system.transform`

---

## 9. Slash Commands vs Skills：各平台如何定义用户可调用操作

### 9.1 问题：相同的 Markdown 格式，完全不同的系统

所有三个主要平台（Claude Code、Codex、Gemini CLI）使用 `SKILL.md` 文件作为主要扩展格式。然而，在表面相似性之下，存在重要的架构差异。

关键区别：
- **skill** 是被动的 — 模型在判断技能相关时加载它
- **command** 是主动的 — 用户输入特定内容来触发它，无论模型判断如何

这些是根本不同的行为，每个平台对"命令"部分的实现都不同。

### 9.2 Claude Code 旧式插件命令

**文件位置**：`<plugin>/commands/<name>.md` 或 `.claude/commands/<name>.md`
**调用**：`/plugin:command-name` 或 `/command-name`

旧式命令早于 Skills 2.0。它们是 `.md` 文件，Claude 读取并作为指令提示执行。命令正文可以包含显式工作流编排伪代码，Claude 逐步执行。

**Frontmatter Schema：**

| 字段 | 必需 | 描述 |
|---|---|---|
| `description` | 推荐 | `/help` 输出中显示的简短文本 |
| `argument-hint` | No | 显示预期参数格式的自动补全提示 |
| `allowed-tools` | No | 命令可以无需每次确认调用的工具列表 |
| `model` | No | 覆盖此命令调用的模型 |
| `disable-model-invocation` | No | `true` = 防止 Claude 自动触发此命令 |
| `user-invocable` | No | `false` = 从 `/` 菜单隐藏 |

### 9.3 Claude Code Skills 2.0 作为命令

带有 `disable-model-invocation: true` 的 SKILL.md 文件实际上是用户可调用命令：

```yaml
---
name: my-command
description: What this command does
disable-model-invocation: true
---
```

### 9.4 Codex：通过 `agents/openai.yaml` 的 UI Chips

Codex 通过 `agents/openai.yaml` 实现 UI chips：

```yaml
interface:
  display_name: "My Command"
  short_description: "Brief description"
  default_prompt: "Help me with [task]"

policy:
  allow_implicit_invocation: false  # 仅显式
```

### 9.5 Gemini CLI：技能和命令的两个独立系统

Gemini CLI 有两个独立系统：

1. **SKILL.md 技能**：通过 `activate_skill` 工具
2. **`.gemini/commands/*.toml` 自定义命令**：显式用户调用

TOML 命令格式：
```toml
description = "My command description"
```

### 9.7 比较矩阵：Slash Command 系统

| 维度 | Claude Code 旧式 | Claude Code Skills 2.0 | Codex | Gemini CLI | OpenClaw | pi-mono | OpenCode |
|---|---|---|---|---|---|---|---|
| **调用语法** | `/plugin:cmd` | `/skill-name` | `/skills` 或 chip | `/command` | `/skill-name` | `/skill:name` | `/command-name` |
| **文件格式** | `.md` | SKILL.md | SKILL.md + yaml | `.toml` | SKILL.md | SKILL.md | `opencode.jsonc` |
| **正文中的工作流伪代码** | Yes | No | No | No | No | No | No |
| **自动触发抑制** | `disable-model-invocation` | `disable-model-invocation` | `allow_implicit_invocation: false` | N/A | `user-invocable: false` | 不支持 | 仅配置级别 |
| **直接工具分派（无模型）** | No | No | No | No | `command-dispatch: tool` | 不支持 | No |

---

## 10. Subagent / Agent 定义跨平台比较

### 10.1 概念：什么是"Subagent"？

每个主要 AI 编程平台都采用了相同的架构模式：一个**主代理**可以生成**专业化次级代理**来处理聚焦的子任务。

关键动机：
- **上下文保留**：将冗长的中间工作保持在主对话之外
- **工具限制**：强制只读或领域特定约束
- **专业化**：给代理自定义角色和专业知识，而不膨胀父级的系统提示

agentskills.io 开放标准涵盖**技能**（可重用工作流指令），但未定义跨平台代理定义格式。截至 2026-03-12，规范中没有 `AGENT.md` 约定。

### 10.2 Claude Code Subagents

**文件位置和命名**：

| 位置 | 作用域 | 优先级 |
|---|---|---|
| `--agents` CLI 标志（JSON） | 仅当前会话 | 1（最高） |
| `.claude/agents/<name>.md` | 当前项目 | 2 |
| `~/.claude/agents/<name>.md` | 此用户的所有项目 | 3 |
| `<plugin>/agents/<name>.md` | 安装插件的位置 | 4（最低） |

**Frontmatter Schema：**

| 字段 | 必需 | 类型 | 描述 |
|---|---|---|---|
| `name` | Yes | string | 代理标识符 |
| `description` | Yes | string | 代理功能描述 |
| `model` | No | string | 覆盖此代理的模型 |
| `tools` | No | object | 工具权限 |
| `skills` | No | array | 启动时预加载的技能 |
| `hooks` | No | object | 生命周期钩子 |

### 10.3 Codex Subagent / Agent 模型

Codex 使用基于 TOML 的配置定义代理角色。代理通过内部 `task` 工具调用。

### 10.4 Gemini CLI Agent 模型

Gemini CLI 使用 `.gemini/agents/` 目录中的 Markdown 文件定义代理。

### 10.7 比较矩阵：Subagent 系统

| 维度 | Claude Code | Codex | Gemini CLI | OpenClaw | pi-mono | OpenCode |
|---|---|---|---|---|---|---|
| **代理定义格式** | Markdown + YAML | TOML 配置 | Markdown | JSON 配置 | None（单代理） | JSON 或 Markdown |
| **调用机制** | `Agent` 工具 | `task` 工具 | 内部工具 | `sessions_spawn` | N/A | `@mention` 或内部 |
| **上下文隔离** | Full | Full | Full | Full | N/A | Full |
| **每个代理模型选择** | Yes | Yes | Yes | Yes | No | Yes |
| **并行执行** | Yes | Yes | Yes | Yes（最多 8） | No | Yes |
| **生命周期钩子** | Yes | No | No | No | N/A | No |
| **技能注入** | Yes（`skills:`） | No | No | No | N/A | No |

### 10.9 OpenClaw：多代理模型

OpenClaw 的子代理系统是唯一：
- 直接将结果发布到聊天频道而非返回到父上下文窗口
- 支持消息平台上的持久线程绑定子代理会话
- 可以通过 ACP 作为对等会话编排外部编码代理

### 10.10 pi-mono：代理架构

pi-mono 故意没有子代理机制。这是唯一明确选择退出内置编排的平台。

### 10.11 OpenCode：代理架构

OpenCode 使用 `agent:` 配置部分或 `.opencode/agents/*.md` 文件：
- **`@mention` 语法**：TUI 中的自动补全
- **5 个内置代理**：build、plan、explore、compaction、title
- **无 `skills:` 注入**：与 Claude Code 不同

---

## 11. 结论与 cc-agents 迁移指南

### 11.1 关键发现总结

本研究从三个维度比较了 7 个 AI 编程代理平台：技能定义、斜杠命令系统和子代理/代理定义。

**通用真理（适用于所有 7 个平台）：**

1. **agentskills.io 是事实上的标准。** 所有 7 个平台都实现了带有 `name` + `description` YAML frontmatter 的 `SKILL.md` 格式。只有这两个字段的技能可在任何地方工作。
2. **`description` 字段是触发器。** 将其编写为触发规范 — 功能 + 时机 + 关键词 — 用第三人称。永远不要在正文中放置"何时使用"逻辑。
3. **渐进式披露是通用的。** 三层：目录（启动）→ 正文（激活时）→ 资源（按需）。保持 SKILL.md 在 500 行以内。
4. **技能和命令在架构上是分离的**，尽管使用相同的文件格式。"被动自动触发"（skill）与"主动显式调用"（command）的区别对设计很重要。
5. **不存在跨平台代理定义标准。** 与技能不同，没有 `AGENT.md` 开放标准。每个平台都有自己的代理/子代理系统。

**平台特定关键事实：**

| 平台 | 最独特的功能 | 关键兼容性风险 |
|---|---|---|
| **Claude Code** | `context: fork` 子代理执行、`` !`cmd` `` 注入、插件命名空间 | CC 特定 frontmatter 被忽略（LOW 风险）或破坏（Codex） |
| **Codex** | `agents/openai.yaml` UI chips + 依赖声明 | `name` 必需；VS Code 检查未知 frontmatter（仅外观） |
| **Gemini CLI** | 双系统：SKILL.md + 独立 `.gemini/commands/*.toml` | Issue #15895：`allowed-tools`、`metadata`、`compatibility` 被解析但忽略 |
| **OpenClaw** | `metadata.openclaw.requires` 加载时二进制/环境门控 | 专有扩展；pi-mono 作为嵌入式运行时 |
| **pi-mono** | 故意单代理设计；`/skill:name` 冒号语法 | 无子代理机制；frontmatter 级别无调用控制 |
| **OpenCode** | 最严格的 `name` 验证；真正延迟加载；双代理格式 | 无 `skills:` 注入到子代理；每个代理无生命周期钩子 |

### 11.2 迁移指南：将 cc-agents 转换为跨平台技能

cc-agents 仓库（`github.com/robinmin/cc-agents`）包含为 Claude Code 编写的带有 Claude Code 特定扩展的技能。要使它们跨平台：

#### 步骤 1：审核现有技能

对于 `plugins/*/skills/` 中的每个技能：
```bash
# 检查 Claude Code 特定 frontmatter
grep -r "context:\|agent:\|disable-model-invocation:\|user-invocable:\|hooks:" plugins/*/skills/*/SKILL.md

# 检查动态注入语法
grep -r '!`' plugins/*/skills/*/SKILL.md

# 检查参数替换
grep -r '\$ARGUMENTS\|\${CLAUDE' plugins/*/skills/*/SKILL.md
```

#### 步骤 2：分类每个技能

| 技能类型 | 跨平台风险 | 操作 |
|---|---|---|
| 纯自然语言正文、标准 frontmatter | **None** | 原样可用 |
| 使用 `context: fork` 或 `agent:` | **LOW** — 被其他平台忽略 | 保留；文档化为 CC 特定 |
| 使用 `disable-model-invocation` 或 `user-invocable` | **LOW** — 被其他平台忽略 | 保留；OpenClaw 也支持 |
| 使用 `` !`cmd` `` 注入 | **MEDIUM** — 显示为字面文本 | 移除或包装在 CC-only 部分 |
| 使用 `$ARGUMENTS` / `$N` 替换 | **LOW** — 其他平台使用原始文本 | 文档化；无破坏性影响 |
| 缺少显式 `name:` 字段 | **MEDIUM** — Codex/OpenCode 要求它 | 添加显式 `name:` |

#### 步骤 3：创建可移植基础

向任何缺少它们的 SKILL.md 添加这两行：
```yaml
---
name: skill-name-matching-directory   # ← Codex 和 OpenCode 必需
description: [全面的触发文本...]
# Claude Code 扩展如下 — 被其他平台安全忽略：
context: fork
agent: Explore
---
```

CC 特定字段（`context`、`agent`、`disable-model-invocation` 等）在运行时被 Codex、Gemini CLI、OpenClaw、pi-mono 和 OpenCode **安全忽略**。唯一的风险是 Codex 的 VS Code 扩展发出 lint 警告（仅外观，不影响运行时）。

#### 步骤 4：添加 `.agents/skills/` 发现路径

OpenCode、pi-mono 和 agentskills.io 规范推荐 `.agents/skills/` 作为跨客户端发现路径：
```bash
mkdir -p .agents/skills
# 符号链接各个技能
ln -s ../../plugins/rd2/skills/my-skill .agents/skills/rd2-my-skill
```

#### 步骤 5：验证

```bash
# 根据 agentskills.io 标准验证
skills-ref validate ./plugins/rd2/skills/my-skill

# 验证 name 匹配目录（针对 OpenCode/Codex 严格模式）
for dir in plugins/*/skills/*/; do
  name=$(grep '^name:' "$dir/SKILL.md" | cut -d' ' -f2 | tr -d '"')
  dirname=$(basename "$dir")
  if [ "$name" != "$dirname" ] && [ -n "$name" ]; then
    echo "Name mismatch: $dir → frontmatter='$name' dir='$dirname'"
  fi
done
```

### 11.3 Slash Command 兼容性

Claude Code 的旧式命令（`.claude/commands/*.md`、`plugins/*/commands/*.md`）在其他平台上**没有直接等价物**。它们是 Claude Code 特定的。迁移时：

| Claude Code 功能 | 最佳跨平台等价物 |
|---|---|
| 带有 `Task()` / `Skill()` 伪代码的旧式命令正文 | 转换为带有自然语言指令的 SKILL.md |
| `/plugin:command-name` 调用 | 使用带有 `user-invocable: true` 的 SKILL.md + 将 `name` 设置为所需命令名 |
| `argument-hint:` 自动补全 | 为 CC 保留；被其他平台忽略 |
| `plugins/*/commands/` 中的命令 | 技能可跨平台工作；命令仅 CC |

### 11.4 Subagent/Agent 可移植性

**没有跨平台代理定义标准。** Claude Code 子代理（`.claude/agents/*.md`）是 Claude Code 特定的。没有直接等价物的迁移路径：

| Claude Code 代理功能 | 跨平台状态 |
|---|---|
| `plugins/*/agents/*.md` 子代理文件 | 仅 CC；不可移植 |
| `skills:` 注入字段 | 仅 CC 功能 |
| 代理中的 `PreToolUse`/`PostToolUse` 钩子 | 仅 CC 功能 |
| `plugin:agent-name` 命名空间 | 仅 CC；OpenCode 无等价物 |
| SKILL.md 上的 `context: fork` | 仅 CC；被其他平台忽略 |

**建议**：将 Claude Code 子代理保留为 Claude Code 特定。对于跨平台代理编排，使用 agentskills.io SKILL.md 格式，带有其他代理可以加载和遵循的自然语言指令 — 即使没有正式的子代理调用。

### 11.5 推荐 cc-agents 策略

1. **技能层**：保持 `SKILL.md` 文件原样。在缺少的地方添加显式 `name:` 字段。CC 特定扩展在其他平台上无害。

2. **命令层**：继续为 Claude Code 使用旧式命令。对于跨平台场景，在 `.agents/skills/` 中创建并行的 SKILL.md 对应物。

3. **代理层**：继续使用 Claude Code 代理文件。接受子代理编排是 Claude Code 特定的。设计技能正文作为独立指令在没有子代理系统可用时工作。

4. **新技能**：使用可移植基础模板（第 5 节）编写。根据需要添加 Claude Code 扩展 — 它们对其他平台仍然无害。

5. **Codex/OpenCode 准备**：确保 `name:` 在所有 SKILL.md frontmatter 中匹配目录名。这是对跨平台兼容性影响最大的单一更改。

---

## 附录：验证过的可移植 SKILL.md 模板

此模板满足 agentskills.io 规范，并与 Claude Code、Codex、Gemini CLI 及所有其他兼容代理兼容。

```markdown
---
name: [lowercase-hyphen-name]
description: [第三人称。技能功能 + 使用时机。特定关键词。最多 1024 字符]
license: [Apache-2.0 | MIT | Proprietary | etc.]
metadata:
  author: [your-org-or-name]
  version: "1.0"
---

# [Skill Name]

## Overview

[1-2 句描述，假设代理是智能的。避免解释基础。]

## Workflow

1. [步骤一 — 祈使形式]
2. [步骤二]
3. [步骤三]

## Advanced options

- For [domain A] tasks: see [references/domain-a.md](references/domain-a.md)
- For [domain B] tasks: see [references/domain-b.md](references/domain-b.md)

## Scripts

Run `scripts/process.py [input]` to [action].
```
```
