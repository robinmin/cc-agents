import type { PlatformCapability, PlatformId, SourceEvidence } from './types';

const verifiedOn = '2026-04-30';

function source(title: string, url: string, confidence: SourceEvidence['confidence']): SourceEvidence {
    return { title, url, verifiedOn, confidence };
}

export const PLATFORM_CAPABILITIES: Record<PlatformId, PlatformCapability> = {
    'agents-md': {
        id: 'agents-md',
        displayName: 'AGENTS.md Universal Agent Instructions',
        nativeFiles: ['AGENTS.md'],
        discovery: 'Directory-scoped markdown convention; scope is the containing directory tree.',
        precedence: 'More deeply nested AGENTS.md instructions override broader ones when conflicts exist.',
        modularity: ['none'],
        scoping: ['project', 'directory'],
        activationModes: ['always', 'jit_subtree'],
        limits: ['No rigid schema; keep concise enough for target agent context budgets.'],
        supports: ['parse', 'generate', 'validate', 'adapt'],
        confidence: 'high',
        sources: [
            source('OpenAI agents.md', 'https://github.com/openai/agents.md', 'high'),
            source('OpenAI Codex system message', 'https://openai.com/index/introducing-codex/', 'high'),
        ],
        notes: ['Best portable baseline for coding-agent repo instructions.'],
    },
    codex: {
        id: 'codex',
        displayName: 'OpenAI Codex',
        nativeFiles: ['AGENTS.md'],
        discovery: 'Uses AGENTS.md instructions in scope for files touched by the task.',
        precedence: 'Nested AGENTS.md files override broader files; direct prompt instructions override AGENTS.md.',
        modularity: ['none'],
        scoping: ['project', 'directory'],
        activationModes: ['always', 'jit_subtree'],
        limits: ['No verified native @ import support in AGENTS.md.'],
        supports: ['parse', 'generate', 'validate', 'adapt'],
        confidence: 'high',
        sources: [
            source('Codex AGENTS.md docs', 'https://github.com/openai/codex/blob/main/docs/agents_md.md', 'high'),
            source('OpenAI Codex system message', 'https://openai.com/index/introducing-codex/', 'high'),
        ],
        notes: ['Model verification commands explicitly; Codex is sensitive to actionable checks.'],
    },
    'claude-code': {
        id: 'claude-code',
        displayName: 'Claude Code',
        nativeFiles: ['CLAUDE.md'],
        discovery: 'Reads CLAUDE.md from cwd upward; subtree memories load when files in those subtrees are read.',
        precedence: 'Higher-level memories load first; specific memories build on them.',
        modularity: ['native_import'],
        scoping: ['global', 'project', 'directory'],
        activationModes: ['always', 'jit_subtree'],
        limits: ['@ imports recurse up to 5 hops.'],
        supports: ['parse', 'generate', 'validate', 'adapt'],
        confidence: 'high',
        sources: [source('Claude Code memory docs', 'https://docs.anthropic.com/en/docs/claude-code/memory', 'high')],
        notes: ['CLAUDE.local.md is deprecated in favor of imports.'],
    },
    'gemini-cli': {
        id: 'gemini-cli',
        displayName: 'Gemini CLI',
        nativeFiles: ['GEMINI.md', '.gemini/settings.json'],
        discovery: 'Hierarchical context from global, project/parents, and JIT/subdirectory files.',
        precedence: 'Context files are concatenated; inspect with /memory show.',
        modularity: ['native_import', 'config_instructions'],
        scoping: ['global', 'project', 'directory'],
        activationModes: ['always', 'jit_subtree', 'configured'],
        limits: ['context.fileName can be a string or list.'],
        supports: ['parse', 'generate', 'validate', 'adapt', 'multi_file'],
        confidence: 'high',
        sources: [
            source(
                'Gemini CLI context files',
                'https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/gemini-md.md',
                'high',
            ),
            source(
                'Gemini CLI configuration',
                'https://github.com/google-gemini/gemini-cli/blob/main/docs/reference/configuration.md',
                'high',
            ),
        ],
        notes: ['Use GEMINI.md bridge or configure context.fileName to include AGENTS.md.'],
    },
    opencode: {
        id: 'opencode',
        displayName: 'OpenCode',
        nativeFiles: ['AGENTS.md', 'opencode.json', '.opencode/agents/*.md'],
        discovery: 'Traverses upward for AGENTS.md or CLAUDE.md; supports global ~/.config/opencode/AGENTS.md.',
        precedence: 'AGENTS.md wins over CLAUDE.md in a category; OpenCode globals win over Claude globals.',
        modularity: ['config_instructions', 'manual_lazy_load'],
        scoping: ['global', 'project', 'directory', 'manual'],
        activationModes: ['always', 'manual', 'configured'],
        limits: ['Remote instruction URLs have a documented 5 second timeout.'],
        supports: ['parse', 'generate', 'validate', 'adapt', 'multi_file'],
        confidence: 'high',
        sources: [
            source('OpenCode rules', 'https://opencode.ai/docs/rules/', 'high'),
            source('OpenCode agents', 'https://opencode.ai/docs/agents/', 'high'),
        ],
        notes: ['Native agent config includes primary/subagent mode and permissions.'],
    },
    cursor: {
        id: 'cursor',
        displayName: 'Cursor',
        nativeFiles: ['.cursor/rules/*.mdc', 'AGENTS.md', '.cursorrules'],
        discovery: 'Project rules live in .cursor/rules; root AGENTS.md is a simple alternative.',
        precedence: 'Rule type controls activation; legacy .cursorrules should be migrated.',
        modularity: ['frontmatter', 'native_import'],
        scoping: ['global', 'project', 'path', 'manual'],
        activationModes: ['always', 'glob', 'manual', 'agent_requested'],
        limits: ['Cursor recommends keeping rules focused and under 500 lines.'],
        supports: ['parse', 'generate', 'validate', 'adapt', 'multi_file'],
        confidence: 'high',
        sources: [source('Cursor rules', 'https://docs.cursor.com/en/context/rules', 'high')],
        notes: ['Use .mdc rules for rich scoping; AGENTS.md for simple portability.'],
    },
    copilot: {
        id: 'copilot',
        displayName: 'GitHub Copilot / VS Code',
        nativeFiles: ['.github/copilot-instructions.md', '.github/instructions/*.instructions.md', 'AGENTS.md'],
        discovery: 'Repository-wide, path-specific, and agent instructions can combine.',
        precedence: 'Nearest AGENTS.md takes precedence for agent instructions; avoid conflicting instruction sets.',
        modularity: ['frontmatter'],
        scoping: ['global', 'project', 'path', 'directory'],
        activationModes: ['always', 'glob'],
        limits: ['Path-specific instructions use applyTo frontmatter.'],
        supports: ['parse', 'generate', 'validate', 'adapt', 'multi_file'],
        confidence: 'high',
        sources: [
            source(
                'GitHub Copilot repository custom instructions',
                'https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions',
                'high',
            ),
            source(
                'GitHub Copilot CLI custom instructions',
                'https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions',
                'high',
            ),
        ],
        notes: ['Generate repo-wide and path-specific files separately.'],
    },
    windsurf: {
        id: 'windsurf',
        displayName: 'Windsurf Cascade',
        nativeFiles: ['.windsurf/rules/*.md', 'AGENTS.md', '~/.codeium/windsurf/memories/global_rules.md'],
        discovery: 'Discovers .windsurf/rules in workspace/subdirectories and AGENTS.md in workspace directories.',
        precedence: 'Root AGENTS.md is always-on; subdirectory AGENTS.md behaves like a location-scoped rule.',
        modularity: ['frontmatter'],
        scoping: ['global', 'project', 'directory', 'path', 'manual'],
        activationModes: ['always', 'glob', 'manual', 'model_decision'],
        limits: ['Global rules limit: 6,000 characters; workspace rule limit: 12,000 characters.'],
        supports: ['parse', 'generate', 'validate', 'adapt', 'multi_file'],
        confidence: 'high',
        sources: [source('Windsurf Memories & Rules', 'https://docs.windsurf.com/windsurf/cascade/memories', 'high')],
        notes: ['Prefer rules or AGENTS.md over auto-generated memories for durable knowledge.'],
    },
    cline: {
        id: 'cline',
        displayName: 'Cline',
        nativeFiles: ['.clinerules/*.md', 'AGENTS.md', '.cursorrules', '.windsurfrules'],
        discovery: 'Workspace and global rules combine; supported compatibility files appear as toggleable rules.',
        precedence: 'Workspace rules take precedence over global rules on conflict.',
        modularity: ['frontmatter'],
        scoping: ['global', 'project', 'path'],
        activationModes: ['always', 'glob'],
        limits: ['Conditional rules currently support paths frontmatter.'],
        supports: ['parse', 'generate', 'validate', 'adapt', 'multi_file'],
        confidence: 'high',
        sources: [source('Cline rules', 'https://docs.cline.bot/customization/cline-rules', 'high')],
        notes: ['Nested AGENTS.md search is documented only when a top-level AGENTS.md exists.'],
    },
    zed: {
        id: 'zed',
        displayName: 'Zed',
        nativeFiles: ['.rules', '.cursorrules', '.windsurfrules', '.clinerules', 'AGENTS.md', 'CLAUDE.md', 'GEMINI.md'],
        discovery: 'Top-level worktree rule file is auto-included for Agent Panel interactions.',
        precedence: "First matching compatibility file in Zed's documented list is used.",
        modularity: ['none'],
        scoping: ['project', 'manual'],
        activationModes: ['always', 'manual'],
        limits: ['Rules Library can provide default and on-demand rules.'],
        supports: ['parse', 'generate', 'validate', 'adapt'],
        confidence: 'high',
        sources: [source('Zed AI rules', 'https://zed.dev/docs/ai/rules', 'high')],
        notes: ['Prefer .rules for Zed-native generation.'],
    },
    amp: {
        id: 'amp',
        displayName: 'Amp',
        nativeFiles: ['AGENTS.md', '$HOME/.config/amp/AGENTS.md', '$HOME/.config/AGENTS.md'],
        discovery: 'Includes AGENTS.md in cwd/editor roots, parents up to home, and subtrees when files are read.',
        precedence: 'System/user/project guidance may all be included; avoid conflicts.',
        modularity: ['none'],
        scoping: ['global', 'project', 'directory'],
        activationModes: ['always', 'jit_subtree'],
        limits: ['No verified native @ import behavior.'],
        supports: ['parse', 'generate', 'validate', 'adapt'],
        confidence: 'high',
        sources: [source('Amp manual', 'https://ampcode.com/manual', 'high')],
        notes: ['AGENTS.md is native and hierarchical.'],
    },
    aider: {
        id: 'aider',
        displayName: 'Aider',
        nativeFiles: ['.aider.conf.yml', 'CONVENTIONS.md'],
        discovery: 'Config loads from home, git root, then current directory; later files take priority.',
        precedence: 'Later config files override earlier config files.',
        modularity: ['config_instructions'],
        scoping: ['global', 'project', 'directory'],
        activationModes: ['configured'],
        limits: ['Use read: entries to load convention files read-only.'],
        supports: ['parse', 'generate', 'validate', 'adapt', 'multi_file'],
        confidence: 'high',
        sources: [
            source('Aider conventions', 'https://aider.chat/docs/usage/conventions.html', 'high'),
            source('Aider config', 'https://aider.chat/docs/config/aider_conf.html', 'high'),
        ],
        notes: ['Aider is not AGENTS.md-native in verified docs.'],
    },
    openclaw: {
        id: 'openclaw',
        displayName: 'OpenClaw',
        nativeFiles: ['SOUL.md', 'IDENTITY.md', 'USER.md', 'AGENTS.md', 'MEMORY.md', 'TOOLS.md', 'HEARTBEAT.md'],
        discovery: 'Workspace markdown files seed identity, operating rules, user context, tools, and memory.',
        precedence: 'Runtime may already provide startup context; manual reread only when needed.',
        modularity: ['none'],
        scoping: ['global', 'project'],
        activationModes: ['always'],
        limits: ['Treat as a multi-file platform, not a single markdown output.'],
        supports: ['parse', 'generate', 'validate', 'adapt', 'multi_file'],
        confidence: 'medium',
        sources: [
            source('OpenClaw default AGENTS.md', 'https://docs.openclaw.ai/reference/AGENTS.default', 'medium'),
            source('OpenClaw AGENTS template', 'https://docs.openclaw.ai/reference/templates/AGENTS', 'medium'),
            source('OpenClaw SOUL.md guide', 'https://clawdocs.org/guides/soul-md/', 'medium'),
        ],
        notes: ['Documentation is fragmented; keep source confidence visible.'],
    },
    antigravity: {
        id: 'antigravity',
        displayName: 'Google Antigravity',
        nativeFiles: ['AGENTS.md', 'GEMINI.md'],
        discovery: 'Community-reported only; official docs were not found during verification.',
        precedence: 'Do not encode hard precedence without official docs or product tests.',
        modularity: ['none'],
        scoping: ['project'],
        activationModes: ['always'],
        limits: ['Provisional support only.'],
        supports: ['generate', 'validate'],
        confidence: 'low',
        sources: [
            source('Community Antigravity guide', 'https://antigravity.md/', 'low'),
            source(
                'Antigravity Lab AGENTS.md guide',
                'https://antigravitylab.net/en/articles/tips/agents-md-guide',
                'low',
            ),
        ],
        notes: ['Generated output should include provisional warnings.'],
    },
    pi: {
        id: 'pi',
        displayName: 'Pi',
        nativeFiles: ['AGENTS.md'],
        discovery: 'No stable official customization spec found.',
        precedence: 'Unknown.',
        modularity: ['none'],
        scoping: ['project'],
        activationModes: ['always'],
        limits: ['Provisional support only.'],
        supports: ['generate', 'validate'],
        confidence: 'low',
        sources: [],
        notes: ['Use generic AGENTS.md fallback with low confidence.'],
    },
    generic: {
        id: 'generic',
        displayName: 'Generic Markdown Agent',
        nativeFiles: ['AGENTS.md'],
        discovery: 'Portable markdown fallback.',
        precedence: 'Unknown; keep explicit instructions in one file.',
        modularity: ['manual_lazy_load'],
        scoping: ['project'],
        activationModes: ['always'],
        limits: ['Fallback only.'],
        supports: ['parse', 'generate', 'validate', 'adapt'],
        confidence: 'medium',
        sources: [source('Main agent reference', 'docs/main_agents.md', 'medium')],
        notes: ['Use when platform-specific behavior is unknown.'],
    },
};

export const PLATFORM_IDS = Object.keys(PLATFORM_CAPABILITIES) as PlatformId[];

export function getCapability(platform: PlatformId): PlatformCapability {
    return PLATFORM_CAPABILITIES[platform];
}

export function isPlatformId(value: string): value is PlatformId {
    return value in PLATFORM_CAPABILITIES;
}

export function inferPlatformFromPath(path: string): PlatformId {
    const normalized = path.replaceAll('\\', '/');
    const basename = normalized.split('/').at(-1) ?? normalized;
    if (basename === 'CLAUDE.md') return 'claude-code';
    if (basename === 'GEMINI.md') return 'gemini-cli';
    if (basename === 'AGENTS.md') return 'agents-md';
    if (basename === '.cursorrules' || normalized.includes('.cursor/rules/')) return 'cursor';
    if (basename === '.windsurfrules' || normalized.includes('.windsurf/rules/')) return 'windsurf';
    if (normalized.includes('.clinerules/')) return 'cline';
    if (normalized.includes('.github/instructions/') || normalized.endsWith('.github/copilot-instructions.md'))
        return 'copilot';
    if (basename === '.rules') return 'zed';
    if (basename === '.aider.conf.yml') return 'aider';
    if (['SOUL.md', 'IDENTITY.md', 'USER.md', 'MEMORY.md', 'TOOLS.md', 'HEARTBEAT.md'].includes(basename))
        return 'openclaw';
    if (basename === 'opencode.json' || normalized.includes('.opencode/agents/')) return 'opencode';
    return 'generic';
}
