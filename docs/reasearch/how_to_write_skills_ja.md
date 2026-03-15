## 概要

本稿は、AIコーディングエージェントのスキル（Agent Skills）に関するクロスプラットフォーム比較の詳細調査報告である。7つの主要プラットフォーム（Claude Code、Codex、Gemini CLI、Google Antigravity、OpenClaw、pi-mono、OpenCode）を対象に、スキル定義フォーマット、スラッシュコマンドシステム、サブエージェントアーキテクチャの3つの観点から包括的な比較分析を行った。

**タグ**: `#AIコーディングツール` `#AgentSkills` `#クロスプラットフォーム` `#スキル開発` `#調査報告`

---

---
research_date: 2026-03-12
topic: Agent Skills と Slash Commands — クロスプラットフォーム比較調査
confidence: HIGH
sources_count: 45+
search_date: 2026-03-13
status: Final
platforms_covered: Claude Code, Codex, Gemini CLI, Google Antigravity, OpenClaw, pi-mono, OpenCode
---

# Agent Skills と Slash Commands：クロスプラットフォーム比較調査報告

## 背景と動機

本研究は、AIコーディングエージェントの状況における以下の変化に対応するために開始された：

- **Anthropic が Claude Code Agent Skills 2.0 をリリース**し、新しい Skill Creator を通じて `SKILL.md` をポータブルフォーマットとするプログラマティックなスキル作成を導入
- **OpenAI Codex がプログラマティックなスキル作成をサポート**し、独自の `skill-creator` スキルと `agents/openai.yaml` UIメタデータ拡張を持つ
- **既存の cc-agents プラグイン**（[github.com/robinmin/cc-agents](https://github.com/robinmin/cc-agents)）を Claude Code、Codex、Gemini CLI、その他の新興 AI コーディングエージェントで動作するように適応させる必要がある

**研究目標：**
1. Claude Code Skill Creator と Codex Skill Creator の実装を比較する
2. 両者を [agentskills.io オープンスタンダード](https://agentskills.io/home) と比較する
3. 比較範囲を Gemini CLI、Google Antigravity、OpenClaw、pi-mono、OpenCode に拡張する
4. クロスプラットフォームの移植性要件とマルチエージェントスキル作成のベストプラクティスを特定する
5. 既存の Claude Code プラグインをアダプティブなクロスプラットフォームスキルに変換するための具体的な移行ガイダンスを提供する

研究はさらに（スキルを超えて）以下を比較するために拡張された：
- **スラッシュコマンド / ユーザー起動可能アクションシステム**（セクション 9）
- **サブエージェント / エージェント定義システム**（セクション 10）

---

## エグゼクティブサマリー

1. **Agent Skills オープンスタンダード（agentskills.io）は事実上のクロスプラットフォームフォーマットである**：元々 Anthropic によって作成され、Claude Code、OpenAI Codex、Gemini CLI、GitHub Copilot、VS Code、Cursor、Roo Code など 30 以上の AI コーディングエージェントに採用されている。コアフォーマットは、YAML frontmatter（`name` + `description` が必要）と Markdown 本文を持つ `SKILL.md` ファイルである。

2. **3つのシステムすべてが同じベースフォーマットを共有している**：`SKILL.md` を含むスキルディレクトリと、オプションの `scripts/`、`references/`、`assets/` サブディレクトリ。YAML frontmatter フィールド `name`（最大 64 文字、小文字ハイフン）と `description`（最大 1024 文字）はすべてのプラットフォームで共通である。

3. **プラットフォーム固有の拡張は存在するが非破壊的である**：Claude Code は `disable-model-invocation`、`user-invocable`、`context`、`agent`、`argument-hint`、`model`、`hooks` フィールドを追加する。Codex は UI メタデータと起動ポリシーのための `agents/openai.yaml` を追加する。これらは追加的であり、`name` と `description` だけのベーススタンダード SKILL.md はどこでも動作する。

4. **プログレッシブディスクロージャーは普遍的なアーキテクチャ原則である**：すべてのプラットフォームは起動時にスキルメタデータをロードし（約 100 tokens）、トリガーされた時だけ完全な `SKILL.md` 本文をロードし、サポートファイルをオンデマンドでロードする。`SKILL.md` を 500 行以内に保つこと。

5. **クロスプラットフォーム移植性は今日達成可能である**：ベースの agentskills.io 仕様に従って作成されたスキルは、修正なしで 30 以上の互換エージェントすべてで動作する。プラットフォーム固有の拡張には、以下に文書化された条件付き適応が必要である。

## 信頼度：HIGH

**ソース**：agentskills.io、platform.claude.com、code.claude.com、developers.openai.com、GitHub（anthropics/skills、openai/skills）、deepwiki.com からの 12 のソース
**証拠品質**：HIGH — 公式ソースからの一次ドキュメント
**日付範囲**：2025 - 2026-03-12
**検索日**：2026-03-12

---

## 1. Claude Code Skills

### フォーマットと Schema

Claude Code は agentskills.io オープンスタンダードに従い、独自の拡張セットを追加している。ファイルフォーマットは YAML frontmatter を持つ Markdown ファイルである。

**最小有効 SKILL.md：**
```markdown
---
name: skill-name
description: このスキルが何をするか、いつ使用するか。
---

# Skill Name

[ここに指示]
```

**完全な frontmatter リファレンス（Claude Code 固有）：**

| フィールド | 必須 | 標準 | 説明 |
|---|---|---|---|
| `name` | No（デフォルトはディレクトリ名） | Yes | 小文字、ハイフン、最大 64 文字 |
| `description` | 推奨 | Yes | 最大 1024 文字、何 + いつ |
| `argument-hint` | No | No | オートコンプリートヒント：`[issue-number]` |
| `disable-model-invocation` | No | No | `true` = ユーザーのみ起動 |
| `user-invocable` | No | No | `false` = Claude のみ起動 |
| `allowed-tools` | No | Yes（実験的） | スペース区切り：`Read, Grep, Bash(git:*)` |
| `model` | No | No | このスキルのモデルを上書き |
| `context` | No | No | `fork` = サブエージェントで実行 |
| `agent` | No | No | サブエージェントタイプ：`Explore`、`Plan`、`general-purpose` |
| `hooks` | No | No | このスキルにスコープされたライフサイクルフック |

**動的コンテキスト注入（Claude Code のみ）：**
```yaml
---
name: pr-summary
description: pull request を要約する
context: fork
agent: Explore
---

PR diff: !`gh pr diff`
PR comments: !`gh pr view --comments`
```

`` !`command` `` 構文は、Claude がプロンプトを見る前にシェルコマンドを実行し、ライブデータを注入する。

**文字列置換（Claude Code のみ）：**
- `$ARGUMENTS` — 起動時に渡されたすべての引数
- `$ARGUMENTS[N]` または `$N` — インデックスによる位置引数
- `${CLAUDE_SESSION_ID}` — 現在のセッション ID
- `${CLAUDE_SKILL_DIR}` — スキルディレクトリへの絶対パス

### ディレクトリ構造

```
skill-name/
├── SKILL.md           # 必須のエントリポイント
├── reference.md       # オプションの補足ドキュメント
├── examples/
│   └── sample.md      # 出力例
└── scripts/
    └── validate.sh    # 実行可能スクリプト
```

### トリガーメカニズム

3つのモード：
1. **自動**：Claude は起動時にすべてのスキルの `description` フィールドを読み取り、現在のタスクにマッチさせる。description がトリガーである。
2. **手動**：ユーザーが `/skill-name` と入力（`user-invocable` が false でない場合）。
3. **自動をブロック**：`disable-model-invocation: true` を設定 — 手動起動のみ機能する。

スキルの場所：
- `~/.claude/skills/<name>/SKILL.md` — 個人用（すべてのプロジェクト）
- `.claude/skills/<name>/SKILL.md` — プロジェクトローカル
- `<plugin>/skills/<name>/SKILL.md` — プラグインスコープ（`plugin:skill` として名前空間化）
- エンタープライズ管理設定 — 組織全体

### 主な機能

- **サブエージェント実行**（`context: fork`）：スキルは分離されたサブエージェントコンテキストで実行される
- **動的コンテキスト注入**（`` !`cmd` ``）：Claude がプロンプトを見る前にライブシェルデータを注入
- **起動制御**：誰が/何がスキルをトリガーするかをきめ細かく制御
- **フック統合**：スキルアクティベーションにスコープされたライフサイクルフック（pre/post）
- **プラグイン名前空間**：`plugin-name:skill-name` はクロスプラグインの名前衝突を防ぐ
- **ネストされた発見**：サブディレクトリ `.claude/skills/` からの自動発見（モノレポサポート）
- **権限制御**：`allowed-tools` はスキル実行中に事前承認されたツールアクセスを付与する

### ベストプラクティス（Anthropic）

- **description でトリガーを書く**：「何をするか」と「いつ使うか」の両方を `description` に含める。三人称を使用。ユーザーが自然に入力するドメイン固有のキーワードを含める。
- **500 行の本文制限**：`SKILL.md` を 500 行以内に保つ；詳細は参照ファイルに移動。
- **プログレッシブディスクロージャーパターン**：SKILL.md は目次；参照ファイルはオンデマンドでロードされる。
- **本文に"When to Use"を決して含めない**：本文はトリガー後にのみロードされる；トリガーロジックは `description` だけに属する。
- **補助ドキュメントを避ける**：README.md、INSTALLATION_GUIDE.md は不要 — タスクに必要なファイルのみ。

---

## 2. OpenAI Codex Skill Creator

### フォーマットと Schema

Codex は agentskills.io ベーススタンダードに従い、1つの主要な追加拡張を持つ：UI メタデータと起動ポリシーのための `agents/openai.yaml` ファイル。

**Frontmatter フィールド（Codex）：**

| フィールド | 必須 | 標準 | 説明 |
|---|---|---|---|
| `name` | Yes | Yes | ハイフンケース、最大 64 文字、小文字 |
| `description` | Yes | Yes | 最大 1024 文字；主要トリガーメカニズム |
| `license` | No | Yes | ライセンス名または参照 |
| `metadata` | No | Yes | 任意のキー値マップ |
| `allowed-tools` | No | Yes（実験的） | ツール権限 |

**注意**：Codex は `name` を必須とする（Claude Code はディレクトリ名にデフォルトする）。Codex ランタイムは未知の frontmatter フィールドを静かに無視する；VS Code エディタは警告を発する（見た目だけ）。

**agents/openai.yaml（Codex 固有）：**

このオプションファイルは UI メタデータと起動ポリシーを提供する：

```yaml
interface:
  display_name: "Skill Creator"
  short_description: "Create or update a skill"
  default_prompt: "Create a new skill for..."
  icon_small: "assets/icon-16.png"
  icon_large: "assets/icon-64.png"
  brand_color: "#FF6B35"

policy:
  allow_implicit_invocation: true    # デフォルト：true；false = 明示的のみ

dependencies:
  - type: mcp
    value: "github"
    description: "GitHub MCP server"
    transport: stdio
    url: "..."
```

### ベストプラクティス（OpenAI Codex）

- **「簡潔さが鍵」**：コンテキストウィンドウは公共財；すべてのトークンに挑戦する。
- **Codex はすでに賢い**：Codex がすでに知らないコンテキストだけを追加する；すでに知っていることを説明しない。
- **適切な自由度を設定する**：可変タスクには高自由度（テキスト指示）；壊れやすい操作には低自由度（特定のスクリプト）。
- **すべての"when to use"を description に含める**：本文はトリガー後にロードされる；トリガーロジックは description だけに置く。
- **README.md、INSTALLATION_GUIDE.md、CHANGELOG.md を含めない**：タスクに不可欠なファイルのみ。

---

## 3. Agent Skills オープンスタンダード（agentskills.io）

### 仕様

Agent Skills フォーマットは元々 Anthropic によって作成され、オープンスタンダードとしてリリースされ、https://agentskills.io でホストされている。

**コア定義**：スキルは、少なくとも `SKILL.md` ファイルを含むディレクトリである。

**必須の frontmatter フィールド：**

| フィールド | 必須 | 制約 |
|---|---|---|
| `name` | Yes | 最大 64 文字；`[a-z0-9-]+`；連続ハイフンなし；先頭/末尾ハイフンなし；ディレクトリ名にマッチする必要がある |
| `description` | Yes | 最大 1024 文字；空でない；何 + いつを記述 |

**オプションの frontmatter フィールド：**

| フィールド | 説明 |
|---|---|
| `license` | ライセンス名またはバンドルされたファイルへの参照 |
| `compatibility` | 環境要件（最大 500 文字） |
| `metadata` | 任意のキー値マップ |
| `allowed-tools` | スペース区切りの事前承認ツール（実験的） |

**ディレクトリ規約（仕様定義）：**
```
skill-name/
├── SKILL.md          # 必須
├── scripts/          # オプション：実行可能コード
├── references/       # オプション：ドキュメント
├── assets/           # オプション：テンプレート、リソース
└── ...               # 追加ファイル
```

**クロスクライアント発見パス（慣習、仕様では強制されない）：**
- `.agents/skills/` — クロスクライアント標準パス
- `.<client>/skills/` — クライアント固有パス
- `~/.agents/skills/` — ユーザーレベルのクロスクライアント
- `~/.claude/skills/` — 既存のスキルで広く使用されている

### 3層プログレッシブディスクロージャー（普遍的）：

| 層 | コンテンツ | ロードタイミング | Token コスト |
|---|---|---|---|
| 1. Catalog | name + description | セッション開始 | スキルあたり約 50-100 tokens |
| 2. Instructions | 完全な SKILL.md 本文 | スキルアクティベーション時 | <5000 tokens（推奨） |
| 3. Resources | scripts/、references/、assets/ | 指示が参照した時 | 変動 |

### 採用状況

2026-03-12 時点で確認された採用者（agentskills.io ホームページより）：
- Anthropic: Claude Code, Claude.ai, Claude API
- OpenAI: Codex
- Google: Gemini CLI
- Microsoft: GitHub Copilot, VS Code (Copilot)
- JetBrains: Junie
- Cursor, Amp, OpenCode, OpenHands, Roo Code, Goose, Mux (Coder), Letta, Firebender, Databricks, Snowflake, Laravel Boost, Spring AI, Factory, Emdash, VT Code, Qodo, TRAE (ByteDance), Autohand, Agentman, Mistral Vibe, Command Code, Ona, Piebald

合計：30 以上の AI コーディングエージェント。

---

## 4. 比較マトリックス

| 次元 | Claude Code | Codex | agentskills.io Spec | OpenClaw | pi-mono | OpenCode |
|---|---|---|---|---|---|---|
| **ファイルフォーマット** | Markdown + YAML frontmatter | Markdown + YAML frontmatter | Markdown + YAML frontmatter | Markdown + YAML frontmatter | Markdown + YAML frontmatter | Markdown + YAML frontmatter |
| **`name` 必須** | No（ディレクトリ名にデフォルト） | Yes | Yes | Yes | Yes | Yes（強制；ディレクトリ名にマッチする必要がある） |
| **`description` 必須** | 推奨 | Yes | Yes | Yes | Yes | Yes（強制；最小 20 文字） |
| **起動制御** | `disable-model-invocation`、`user-invocable` | `agents/openai.yaml` `allow_implicit_invocation` | 仕様にない | `user-invocable`、`disable-model-invocation`、`command-dispatch: tool` | サポートなし | 設定レベルのみ：`permission.skill` allow/deny/ask パターン |
| **UI メタデータ** | 仕様にない | `agents/openai.yaml` | 仕様にない | `metadata.openclaw.emoji`（macOS Skills UI のみ） | サポートなし | サポートなし |
| **依存関係宣言** | 仕様にない | `agents/openai.yaml` | 仕様にない | `metadata.openclaw.requires.*`（バイナリ/環境/設定ロード時ゲート） | サポートなし | サポートなし |
| **サブエージェント実行** | `context: fork`、`agent:` | 仕様にない | 仕様にない | `sessions_spawn` ツール（設定ベース、skill frontmatter ではない） | サポートなし | SKILL.md にない；`agent:` 設定または `.opencode/agents/` ファイル経由 |
| **動的コンテキスト注入** | `` !`cmd` `` 構文 | 仕様にない | 仕様にない | サポートなし | サポートなし | SKILL.md にない；コマンドテンプレートでのみサポート |
| **引数置換** | `$ARGUMENTS`、`$N`、`${CLAUDE_SKILL_DIR}` | 仕様にない | 仕様にない | 生の引数文字列；スキルディレクトリパスに `{baseDir}` | サポートなし | SKILL.md にない；コマンドテンプレートでのみ `$ARGUMENTS`、`$NAME`、`$1`、`$2` |
| **フック** | `hooks:` フィールド | 仕様にない | 仕様にない | skill frontmatter にない | サポートなし | SKILL.md にない；JS プラグインフックシステムはスキルと分離 |
| **発見パス** | `.claude/skills/`、`~/.claude/skills/`、plugin | `~/.codex/`、project-local | `.agents/skills/`、`.<client>/skills/` | `<workspace>/skills/`、`~/.openclaw/skills/`、bundled | `~/.pi/agent/skills/`、`.agents/skills/`、`.pi/skills/` | `.opencode/skills/`、`.claude/skills/`、`.agents/skills/`；グローバルミラー；git worktree を走査 |
| **未知の frontmatter フィールド** | 無視 | ランタイム：無視；VS Code：警告 | 警告、ロードはする | 静かに無視 | 静かに無視 | 静かに無視 |
| **プログレッシブディスクロージャー** | Yes（3 層） | Yes（3 層） | Yes（3 層） | Yes（3 層） | Yes（3 層） | Yes（3 層；真のレイジーロード） |

---

## 5. クロスプラットフォーム移植性分析

### 共通の基盤

3つすべてが以下の基礎を共有し、移植可能なベースを形成する：

1. **ファイルフォーマット**：`---` デリミター間の YAML frontmatter を持つ Markdown ファイル
2. **必須フィールド**：frontmatter の `name` と `description`
3. **ディレクトリ構造**：`scripts/`、`references/`、`assets/` サブディレクトリ
4. **プログレッシブディスクロージャー**：3 層ロード（メタデータ → 指示 → リソース）
5. **本文長制限**：500 行 / 5000 tokens
6. **トリガーメカニズム**：`description` フィールドがスキルがいつアクティブになるかを制御する
7. **スキルに README.md なし**：タスクに不可欠なファイルのみ
8. **パスにフォワードスラッシュ**：常に Unix スタイル

**移植可能なベース SKILL.md テンプレート：**
```markdown
---
name: my-skill
description: [三人称でスキルの機能 + トリガータイミングを記述。最大 1024 文字]
---

# My Skill

## Overview

[簡単な説明 — エージェントが賢いと仮定、基本を説明しない]

## Workflow

1. ステップ 1
2. ステップ 2
3. ステップ 3

## Additional resources

- API 詳細：[reference.md](references/reference.md) を参照
- ファイル処理：`scripts/process.py` を実行
```

### 移行の考慮事項

**既存の Claude Code スキルをクロスプラットフォームに変換：**

1. **SKILL.md コアを保持** — `name` と `description` が存在すれば、ベーススタンダードを満たしている
2. **description を明示的にする** — `name` のディレクトリ名フォールバックに依存している場合、明示的な `name:` フィールドを追加
3. **Claude Code 拡張を外部化** — `disable-model-invocation`、`context: fork`、`hooks` は非 Claude エージェントによって無視されるが有害ではない
4. **Codex 用に `agents/openai.yaml` を追加** — skill-creator スキルの `scripts/generate_openai_yaml.py` で生成
5. **仕様完全性のために `compatibility:` を追加** — 例：`compatibility: Designed for Claude Code and Codex`
6. **未知の frontmatter**：Codex ランタイムは未知のフィールドを無視；Claude Code は無視する
7. **`` !`cmd` `` 注入**：Codex と他のエージェントはこの構文をサポートしない；リテラルテキストとして表示される。削除または条件付きロジックでラップ
8. **`$ARGUMENTS` 置換**：これらは Claude Code 固有；他のエージェントは生のテキストを文字通り受け取る

---

## 6. 推奨事項

### マルチプラットフォームスキルのベストプラクティス

**ルール 1：移植性のためにベース SKILL.md をクリーンに保つ**

クロスプラットフォームスキルの frontmatter で 5 つの標準フィールドのみを使用：
- `name`（明示的、ディレクトリ名にマッチ）
- `description`（包括的なトリガーテキスト、三人称）
- `license`（必要な場合）
- `metadata`（バージョニング/作者情報用）
- `allowed-tools`（ツール制限が必要な場合）

**ルール 2：description をトリガー仕様として書く**

`description` フィールドが最も重要なフィールド。スキルがいつ発火するかを決定する。以下のように書く：
- スキルが何をするか（具体的なアクション）
- ユーザーが入力する特定のトリガーキーワード
- ファイルタイプまたはタスクパターン
- 列挙されたユースケース

例：
```yaml
description: Git pull request を分析・要約し、diff、コメント、変更されたファイルを調査。PR レビュー、PR サマリー作成、PR ステータス確認、またはユーザーが pull request、PR review、code review に言及した時に使用。
```

**ルール 3：プログレッシブディスクロージャーアーキテクチャを使用**

```
my-skill/
├── SKILL.md        # 概要 + 詳細へのリンク（500 行以内）
├── references/
│   ├── domain-a.md # ドメイン A が関連する時だけロード
│   └── domain-b.md # ドメイン B が関連する時だけロード
└── scripts/
    └── process.py  # コンテキストにロードせずに実行
```

**ルール 4：プラットフォーム拡張を既知の場所に置く**

Claude Code 固有の拡張の場合、コンパニオンディレクトリを使用または文書化：
```
my-skill/
├── SKILL.md              # クロスプラットフォームベース
├── .claude/              # Claude Code 固有のオーバーライド（オプションパターン）
│   └── SKILL.claude.md   # Claude Code 拡張：context: fork、hooks 等
└── agents/
    └── openai.yaml       # Codex 固有の UI メタデータ
```

**ルール 5：配布前に検証**

- `skills-ref validate ./my-skill` を実行（agentskills.io 標準）
- Codex をターゲットにする場合、`scripts/quick_validate.py ./my-skill` を実行
- `description` が空でなく 1024 文字以内であることを確認
- `name` がディレクトリ名と正確にマッチすることを確認

**ルール 6：補助ドキュメントを決して含めない**

スキルディレクトリ内に作成しない：README.md、INSTALLATION_GUIDE.md、CHANGELOG.md、QUICK_REFERENCE.md。これらはエージェントにノイズを追加し、コンテキストを膨らませる。すべてのコンテキストはエージェントに奉仕すべきで、人間の読者ではない。

**ルール 7：決定論的操作にスクリプトを使用**

同じコードが繰り返し再生成される場合、または一貫性が重要な場合、ロジックを `scripts/` に置き、SKILL.md から参照する。スクリプトはコンテキストにロードされずに実行される（出力のみが消費される）。

---

## 7. ソースと引用

| ソース | URL | アクセス日 |
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

## 8. 詳細分析：プラットフォーム間の実装の違い

### 8.1 Gemini CLI スキルサポート

Gemini CLI v0.23.0（2026-01-07 リリース）は SKILL.md サポートを追加した。重要なポイント：

- **既知の相互運用性ギャップ**（Issue #15895）：`allowed-tools`、`metadata`、`compatibility` は解析されるが無視される
- **Tier 3 リソース**：アクティベーション時にフラットダンプ（レイジーロードではない）
- **activate_skill ツール**：エージェントはこのツールを使用してスキルを明示的にアクティブ化

### 8.2 Frontmatter フィールド処理：正確な動作の違い

| プラットフォーム | 未知フィールド処理 | `name` 検証 |
|---|---|---|
| Claude Code | 静かに無視 | 緩い；ディレクトリ名にデフォルト |
| Codex | ランタイム：無視；VS Code：警告 | 厳格；frontmatter で必須 |
| Gemini CLI | 静かに無視 | 標準 |
| OpenCode | 静かに無視 | 最も厳格；ディレクトリ名と正確にマッチする必要がある |

### 8.9 プラットフォームサポートマトリックス（更新版）

| 次元 | Claude Code | Codex | Gemini CLI | OpenClaw | pi-mono | OpenCode |
|---|---|---|---|---|---|---|
| **スキルファイルフォーマット** | SKILL.md + YAML | SKILL.md + YAML | SKILL.md + YAML | SKILL.md + YAML | SKILL.md + YAML | SKILL.md + YAML |
| **name 必須** | No（デフォルト） | Yes | Yes | Yes | Yes | Yes（厳格） |
| **description 必須** | 推奨 | Yes | Yes | Yes | Yes | Yes（最小 20 文字） |
| **プログレッシブディスクロージャー** | Yes（3 層） | Yes（3 層） | Yes（3 層、ギャップあり） | Yes（3 層） | Yes（3 層） | Yes（3 層、真のレイジー） |
| **ランタイム未知フィールド** | 無視 | 無視 | 無視 | 無視 | 無視 | 無視 |
| **ロード時ゲート** | No | No | No | Yes（`metadata.openclaw.requires`） | No | No |

### 8.10 OpenClaw スキルシステム

OpenClaw は pi-mono SDK を埋め込むマルチチャネルメッセージング/AI ゲートウェイ。主な機能：

- **`metadata.openclaw.requires.*`**：バイナリ/環境/設定の存在に基づいてロード時にスキルをフィルタリング
- **`command-dispatch: tool`**：LLM をバイパスしてツールに直接ディスパッチ
- **3 つのマルチエージェントメカニズム**：sessions_spawn、ACP harness、bash process

### 8.11 pi-mono スキルシステム

pi-mono（`github.com/badlogic/pi-mono`）はスタンドアロンの TUI コーディングエージェント：

- **`/skill:name` 構文**：スペースではなくコロン
- **`.agents/skills/` サポート**：クロスクライアントパス
- **意図的な単一エージェント設計**：組み込みのサブエージェントメカニズムなし

### 8.12 OpenCode スキルシステム

OpenCode は `.opencode/skills/` 発見とネイティブ `skill` ツールを使用：

- **厳格な name 検証**：ディレクトリ名にマッチする必要がある
- **真のレイジーロード**：`skill` ツール経由
- **JS プラグインシステム**：`experimental.chat.system.transform`

---

## 9. Slash Commands vs Skills：各プラットフォームがユーザー起動可能アクションを定義する方法

### 9.1 問題：同じ Markdown フォーマット、完全に異なるシステム

3つの主要プラットフォーム（Claude Code、Codex、Gemini CLI）すべてが、主要な拡張フォーマットとして `SKILL.md` ファイルを使用する。しかし、表面の類似性の下には、重要なアーキテクチャの差異が存在する。

重要な区別：
- **skill** は受動的 — モデルはスキルが関連すると判断した時にロードする
- **command** は能動的 — ユーザーはモデルの判断に関係なく、特定のものを入力して発火させる

これらは根本的に異なる動作であり、各プラットフォームは「コマンド」部分を異なる方法で実装している。

### 9.2 Claude Code 旧式プラグインコマンド

**ファイル場所**：`<plugin>/commands/<name>.md` または `.claude/commands/<name>.md`
**起動**：`/plugin:command-name` または `/command-name`

旧式コマンドは Skills 2.0 より前に存在。それらは Claude が読み取り、指示プロンプトとして実行する `.md` ファイル。コマンド本文は、Claude がステップバイステップで実行する明示的なワークフローオーケストレーション疑似コードを含むことができる。

**Frontmatter Schema：**

| フィールド | 必須 | 説明 |
|---|---|---|
| `description` | 推奨 | `/help` 出力に表示される短いテキスト |
| `argument-hint` | No | 期待される引数フォーマットを示すオートコンプリートヒント |
| `allowed-tools` | No | コマンドが確認なしで呼び出せるツールのリスト |
| `model` | No | このコマンド起動のモデルを上書き |
| `disable-model-invocation` | No | `true` = Claude がこのコマンドを自動的にトリガーするのを防ぐ |
| `user-invocable` | No | `false` = `/` メニューから非表示 |

### 9.3 Claude Code Skills 2.0 をコマンドとして

`disable-model-invocation: true` を持つ SKILL.md ファイルは事実上ユーザー起動可能コマンド：

```yaml
---
name: my-command
description: このコマンドが何をするか
disable-model-invocation: true
---
```

### 9.4 Codex：`agents/openai.yaml` 経由の UI Chips

Codex は `agents/openai.yaml` を通じて UI chips を実装：

```yaml
interface:
  display_name: "My Command"
  short_description: "簡単な説明"
  default_prompt: "[task] を手伝って"

policy:
  allow_implicit_invocation: false  # 明示的のみ
```

### 9.5 Gemini CLI：スキルとコマンドの2つの独立したシステム

Gemini CLI は2つの独立したシステムを持つ：

1. **SKILL.md スキル**：`activate_skill` ツール経由
2. **`.gemini/commands/*.toml` カスタムコマンド**：明示的なユーザー起動

TOML コマンドフォーマット：
```toml
description = "マイコマンドの説明"
```

### 9.7 比較マトリックス：Slash Command システム

| 次元 | Claude Code 旧式 | Claude Code Skills 2.0 | Codex | Gemini CLI | OpenClaw | pi-mono | OpenCode |
|---|---|---|---|---|---|---|---|
| **起動構文** | `/plugin:cmd` | `/skill-name` | `/skills` または chip | `/command` | `/skill-name` | `/skill:name` | `/command-name` |
| **ファイルフォーマット** | `.md` | SKILL.md | SKILL.md + yaml | `.toml` | SKILL.md | SKILL.md | `opencode.jsonc` |
| **本文のワークフロー疑似コード** | Yes | No | No | No | No | No | No |
| **自動トリガー抑制** | `disable-model-invocation` | `disable-model-invocation` | `allow_implicit_invocation: false` | N/A | `user-invocable: false` | サポートなし | 設定レベルのみ |
| **直接ツールディスパッチ（モデルなし）** | No | No | No | No | `command-dispatch: tool` | サポートなし | No |

---

## 10. Subagent / Agent 定義のクロスプラットフォーム比較

### 10.1 概念：「Subagent」とは何か？

すべての主要な AI コーディングプラットフォームは同じアーキテクチャパターンに収束している：**プライマリエージェント**が、フォーカスされたサブタスクを処理するために**専門化されたセカンダリエージェント**を生成できる。

主な動機：
- **コンテキスト保存**：冗長な中間作業をメイン会話の外に保つ
- **ツール制限**：読み取り専用またはドメイン固有の制約を強制
- **専門化**：親のシステムプロンプトを膨らませずにエージェントにカスタムペルソナと専門知識を与える

agentskills.io オープンスタンダードは**スキル**（再利用可能なワークフロー指示）をカバーするが、クロスプラットフォームのエージェント定義フォーマットは定義していない。2026-03-12 時点で、仕様には `AGENT.md` 規約がない。

### 10.2 Claude Code Subagents

**ファイル場所と命名：**

| 場所 | スコープ | 優先度 |
|---|---|---|
| `--agents` CLI フラグ（JSON） | 現在のセッションのみ | 1（最高） |
| `.claude/agents/<name>.md` | 現在のプロジェクト | 2 |
| `~/.claude/agents/<name>.md` | このユーザーのすべてのプロジェクト | 3 |
| `<plugin>/agents/<name>.md` | プラグインがインストールされている場所 | 4（最低） |

**Frontmatter Schema：**

| フィールド | 必須 | タイプ | 説明 |
|---|---|---|---|
| `name` | Yes | string | エージェント識別子 |
| `description` | Yes | string | エージェントの機能記述 |
| `model` | No | string | このエージェントのモデルを上書き |
| `tools` | No | object | ツール権限 |
| `skills` | No | array | 起動時にプリロードするスキル |
| `hooks` | No | object | ライフサイクルフック |

### 10.3 Codex Subagent / Agent モデル

Codex は TOML ベースの設定を使用してエージェントロールを定義。エージェントは内部 `task` ツールを通じて呼び出される。

### 10.4 Gemini CLI Agent モデル

Gemini CLI は `.gemini/agents/` ディレクトリの Markdown ファイルを使用してエージェントを定義。

### 10.7 比較マトリックス：Subagent システム

| 次元 | Claude Code | Codex | Gemini CLI | OpenClaw | pi-mono | OpenCode |
|---|---|---|---|---|---|---|
| **エージェント定義フォーマット** | Markdown + YAML | TOML 設定 | Markdown | JSON 設定 | None（単一エージェント） | JSON または Markdown |
| **起動メカニズム** | `Agent` ツール | `task` ツール | 内部ツール | `sessions_spawn` | N/A | `@mention` または内部 |
| **コンテキスト分離** | Full | Full | Full | Full | N/A | Full |
| **エージェントごとのモデル選択** | Yes | Yes | Yes | Yes | No | Yes |
| **並列実行** | Yes | Yes | Yes | Yes（最大 8） | No | Yes |
| **ライフサイクルフック** | Yes | No | No | No | N/A | No |
| **スキル注入** | Yes（`skills:`） | No | No | No | N/A | No |

### 10.9 OpenClaw：マルチエージェントモデル

OpenClaw のサブエージェントシステムは唯一：
- 親コンテキストウィンドウに返すのではなく、結果を直接チャットチャンネルに投稿
- メッセージングプラットフォーム上で永続的なスレッドバインドされたサブエージェントセッションをサポート
- ACP を通じて外部コーディングエージェントをピアセッションとしてオーケストレート可能

### 10.10 pi-mono：エージェントアーキテクチャ

pi-mono は意図的にサブエージェントメカニズムを持たない。これは組み込みのオーケストレーションから明示的に除外した唯一のプラットフォーム。

### 10.11 OpenCode：エージェントアーキテクチャ

OpenCode は `agent:` 設定セクションまたは `.opencode/agents/*.md` ファイルを使用：
- **`@mention` 構文**：TUI でのオートコンプリート
- **5 つの組み込みエージェント**：build、plan、explore、compaction、title
- **`skills:` 注入なし**：Claude Code とは異なる

---

## 11. 結論と cc-agents 移行ガイド

### 11.1 主な発見のまとめ

本研究は、3 つの次元で 7 つの AI コーディングエージェントプラットフォームを比較した：スキル定義、スラッシュコマンドシステム、サブエージェント/エージェント定義。

**普遍的な真実（7 つのプラットフォームすべてに適用）：**

1. **agentskills.io は事実上の標準である。** 7 つのプラットフォームすべてが `name` + `description` YAML frontmatter を持つ `SKILL.md` フォーマットを実装している。これら 2 つのフィールドだけのスキルはどこでも動作する。
2. **`description` フィールドがトリガーである。** トリガー仕様として書く — 機能 + タイミング + キーワード — 三人称で。"when to use" ロジックを本文に置かない。
3. **プログレッシブディスクロージャーは普遍的である。** 3 層：カタログ（起動）→ 本文（アクティベーション時）→ リソース（オンデマンド）。SKILL.md を 500 行以内に保つ。
4. **スキルとコマンドはアーキテクチャ的に分離されている**、同じファイルフォーマットを使用しているにもかかわらず。「受動的自动トリガー」（skill）と「能動的明示的起動」（command）の区別は設計において重要。
5. **クロスプラットフォームのエージェント定義標準は存在しない。** スキルとは異なり、`AGENT.md` オープンスタンダードはない。各プラットフォームが独自のエージェント/サブエージェントシステムを持つ。

**プラットフォーム固有の重要事実：**

| プラットフォーム | 最もユニークな機能 | 主要な互換性リスク |
|---|---|---|
| **Claude Code** | `context: fork` サブエージェント実行、`` !`cmd` `` 注入、プラグイン名前空間 | CC 固有 frontmatter は無視（LOW リスク）または破壊（Codex） |
| **Codex** | `agents/openai.yaml` UI chips + 依存関係宣言 | `name` 必須；VS Code は未知 frontmatter をリント（見た目のみ） |
| **Gemini CLI** | デュアルシステム：SKILL.md + 別個の `.gemini/commands/*.toml` | Issue #15895：`allowed-tools`、`metadata`、`compatibility` は解析されるが無視 |
| **OpenClaw** | `metadata.openclaw.requires` ロード時バイナリ/環境ゲート | 独自拡張；pi-mono が埋め込みランタイム |
| **pi-mono** | 意図的な単一エージェント設計；`/skill:name` コロン構文 | サブエージェントメカニズムなし；frontmatter レベルで起動制御なし |
| **OpenCode** | 最も厳格な `name` 検証；真のレイジーロード；デュアルエージェントフォーマット | サブエージェントへの `skills:` 注入なし；エージェントごとのライフサイクルフックなし |

### 11.2 移行ガイド：cc-agents をクロスプラットフォームスキルに変換

cc-agents リポジトリ（`github.com/robinmin/cc-agents`）には、Claude Code 固有の拡張を持つ Claude Code 用に作成されたスキルが含まれている。クロスプラットフォームにするには：

#### ステップ 1：既存のスキルを監査

`plugins/*/skills/` の各スキルについて：
```bash
# Claude Code 固有 frontmatter をチェック
grep -r "context:\|agent:\|disable-model-invocation:\|user-invocable:\|hooks:" plugins/*/skills/*/SKILL.md

# 動的注入構文をチェック
grep -r '!`' plugins/*/skills/*/SKILL.md

# 引数置換をチェック
grep -r '\$ARGUMENTS\|\${CLAUDE' plugins/*/skills/*/SKILL.md
```

#### ステップ 2：各スキルを分類

| スキルタイプ | クロスプラットフォームリスク | アクション |
|---|---|---|
| 純粋な自然言語本文、標準 frontmatter | **None** | そのまま使用可能 |
| `context: fork` または `agent:` を使用 | **LOW** — 他のプラットフォームで無視 | 保持；CC 固有として文書化 |
| `disable-model-invocation` または `user-invocable` を使用 | **LOW** — 他のプラットフォームで無視 | 保持；OpenClaw もサポート |
| `` !`cmd` `` 注入を使用 | **MEDIUM** — リテラルテキストとして表示 | 削除または CC-only セクションでラップ |
| `$ARGUMENTS` / `$N` 置換を使用 | **LOW** — 他のプラットフォームは生のテキストを使用 | 文書化；破壊的効果なし |
| 明示的な `name:` フィールドが欠落 | **MEDIUM** — Codex/OpenCode は必須 | 明示的な `name:` を追加 |

#### ステップ 3：ポータブルベースを作成

欠けている SKILL.md にこれら 2 行を追加：
```yaml
---
name: skill-name-matching-directory   # ← Codex と OpenCode で必須
description: [包括的なトリガーテキスト...]
# Claude Code 拡張以下 — 他のプラットフォームで安全に無視：
context: fork
agent: Explore
---
```

CC 固有フィールド（`context`、`agent`、`disable-model-invocation` 等）は、Codex、Gemini CLI、OpenClaw、pi-mono、OpenCode によってランタイムで**安全に無視される**。唯一のリスクは Codex の VS Code 拡張機能が lint 警告を発すること（見た目のみ、ランタイムに影響しない）。

#### ステップ 4：`.agents/skills/` 発見パスを追加

OpenCode、pi-mono、agentskills.io 仕様は `.agents/skills/` をクロスクライアント発見パスとして推奨：
```bash
mkdir -p .agents/skills
# 個々のスキルをシンボリックリンク
ln -s ../../plugins/rd2/skills/my-skill .agents/skills/rd2-my-skill
```

#### ステップ 5：検証

```bash
# agentskills.io 標準に対して検証
skills-ref validate ./plugins/rd2/skills/my-skill

# name がディレクトリにマッチすることを検証（OpenCode/Codex 厳格モード用）
for dir in plugins/*/skills/*/; do
  name=$(grep '^name:' "$dir/SKILL.md" | cut -d' ' -f2 | tr -d '"')
  dirname=$(basename "$dir")
  if [ "$name" != "$dirname" ] && [ -n "$name" ]; then
    echo "Name mismatch: $dir → frontmatter='$name' dir='$dirname'"
  fi
done
```

### 11.3 Slash Command 互換性

Claude Code の旧式コマンド（`.claude/commands/*.md`、`plugins/*/commands/*.md`）は他のプラットフォームに**直接の等価物がない**。それらは Claude Code 固有である。移行時：

| Claude Code 機能 | ベストクロスプラットフォーム等価物 |
|---|---|
| `Task()` / `Skill()` 疑似コードを持つ旧式コマンド本文 | 自然言語指示を持つ SKILL.md に変換 |
| `/plugin:command-name` 起動 | `user-invocable: true` を持つ SKILL.md + `name` を希望のコマンド名に設定 |
| `argument-hint:` オートコンプリート | CC 用に保持；他のプラットフォームで無視 |
| `plugins/*/commands/` のコマンド | スキルはクロスプラットフォームで動作；コマンドは CC のみ |

### 11.4 Subagent/Agent 移植性

**クロスプラットフォームのエージェント定義標準は存在しない。** Claude Code サブエージェント（`.claude/agents/*.md`）は Claude Code 固有である。直接の等価物への移行パスはない：

| Claude Code エージェント機能 | クロスプラットフォームステータス |
|---|---|
| `plugins/*/agents/*.md` サブエージェントファイル | CC のみ；移植不可 |
| `skills:` 注入フィールド | CC のみの機能 |
| エージェント内の `PreToolUse`/`PostToolUse` フック | CC のみの機能 |
| `plugin:agent-name` 名前空間 | CC のみ；OpenCode に等価物なし |
| SKILL.md 上の `context: fork` | CC のみ；他のプラットフォームで無視 |

**推奨**：Claude Code サブエージェントを Claude Code 固有として保持。クロスプラットフォームのエージェントオーケストレーションには、正式なサブエージェント起動がなくても他のエージェントがロードして従うことができる自然言語指示を持つ agentskills.io SKILL.md フォーマットを使用。

### 11.5 推奨 cc-agents 戦略

1. **スキル層**：`SKILL.md` ファイルをそのまま保持。欠けている場所に明示的な `name:` フィールドを追加。CC 固有の拡張は他のプラットフォームで無害。

2. **コマンド層**：Claude Code 用に旧式コマンドを使用し続ける。クロスプラットフォームシナリオ用に、`.agents/skills/` に並行する SKILL.md を作成。

3. **エージェント層**：Claude Code エージェントファイルを使用し続ける。サブエージェントオーケストレーションが Claude Code 固有であることを受け入れる。サブエージェントシステムが利用できない場合にスタンドアロン指示として機能するようにスキル本文を設計。

4. **新規スキル**：ポータブルベーステンプレート（セクション 5）を使用して作成。必要に応じて Claude Code 拡張を追加 — 他のプラットフォームにとって無害のまま。

5. **Codex/OpenCode 準備**：すべての SKILL.md frontmatter で `name:` がディレクトリ名にマッチすることを確認。これはクロスプラットフォーム互換性に最も影響する単一の変更。

---

## 付録：検証済みポータブル SKILL.md テンプレート

このテンプレートは agentskills.io 仕様を満たし、Claude Code、Codex、Gemini CLI、その他すべての互換エージェントと互換性がある。

```markdown
---
name: [lowercase-hyphen-name]
description: [三人称。スキルの機能 + 使用タイミング。特定のキーワード。最大 1024 文字]
license: [Apache-2.0 | MIT | Proprietary | etc.]
metadata:
  author: [your-org-or-name]
  version: "1.0"
---

# [Skill Name]

## Overview

[1-2 文の説明、エージェントが知的であると仮定。基本を説明しない。]

## Workflow

1. [ステップ 1 — 命令形]
2. [ステップ 2]
3. [ステップ 3]

## Advanced options

- [domain A] タスク用：[references/domain-a.md](references/domain-a.md) を参照
- [domain B] タスク用：[references/domain-b.md](references/domain-b.md) を参照

## Scripts

`scripts/process.py [input]` を実行して [action]。
```
```
