import { getCapability } from './capabilities';
import type { AdaptationReport, GeneratedFile, GeneratedWorkspace, MainAgentWorkspace, PlatformId } from './types';

export function generateWorkspace(
    workspace: MainAgentWorkspace,
    sourcePlatform: PlatformId,
    targetPlatform: PlatformId,
): GeneratedWorkspace {
    const capability = getCapability(targetPlatform);
    const report = createReport(workspace, sourcePlatform, targetPlatform);
    const files = generateFiles(workspace, targetPlatform);
    if (capability.confidence !== 'high') {
        report.warnings.push({
            severity: 'warning',
            feature: 'platform-confidence',
            message: `${capability.displayName} support is ${capability.confidence}; verify generated output manually.`,
        });
    }
    return { files, report };
}

function generateFiles(workspace: MainAgentWorkspace, targetPlatform: PlatformId): GeneratedFile[] {
    switch (targetPlatform) {
        case 'claude-code':
            return [
                { path: 'CLAUDE.md', content: bridgeMarkdown('Claude Code Instructions', workspace, ['@AGENTS.md']) },
            ];
        case 'gemini-cli':
            return [
                { path: 'GEMINI.md', content: bridgeMarkdown('Gemini CLI Instructions', workspace, ['@./AGENTS.md']) },
                {
                    path: '.gemini/settings.json',
                    content: `${JSON.stringify({ context: { fileName: ['GEMINI.md', 'AGENTS.md'] } }, null, 2)}\n`,
                },
            ];
        case 'opencode':
            return [
                { path: 'AGENTS.md', content: portableAgentsMarkdown(workspace, 'OpenCode Project Instructions') },
                {
                    path: 'opencode.json',
                    content: `${JSON.stringify({ $schema: 'https://opencode.ai/config.json', instructions: ['AGENTS.md'] }, null, 2)}\n`,
                },
            ];
        case 'cursor':
            return scopedRuleFiles(workspace, '.cursor/rules', 'mdc');
        case 'copilot':
            return copilotFiles(workspace);
        case 'windsurf':
            return scopedRuleFiles(workspace, '.windsurf/rules', 'md');
        case 'cline':
            return scopedRuleFiles(workspace, '.clinerules', 'md');
        case 'zed':
            return [{ path: '.rules', content: portableAgentsMarkdown(workspace, 'Zed Rules') }];
        case 'aider':
            return [
                { path: 'CONVENTIONS.md', content: portableAgentsMarkdown(workspace, 'Aider Conventions') },
                { path: '.aider.conf.yml', content: 'read:\n  - CONVENTIONS.md\n' },
            ];
        case 'openclaw':
            return openClawFiles(workspace);
        case 'codex':
        case 'agents-md':
        case 'amp':
        case 'antigravity':
        case 'pi':
        case 'generic':
            return [
                {
                    path: 'AGENTS.md',
                    content: portableAgentsMarkdown(
                        workspace,
                        `${getCapability(targetPlatform).displayName} Instructions`,
                    ),
                },
            ];
    }
}

function bridgeMarkdown(title: string, workspace: MainAgentWorkspace, imports: string[]): string {
    return `${[`# ${title}`, '', ...imports, '', portableBody(workspace)].join('\n').trimEnd()}\n`;
}

function portableAgentsMarkdown(workspace: MainAgentWorkspace, title: string): string {
    return `${[`# ${title}`, '', portableBody(workspace)].join('\n').trimEnd()}\n`;
}

function portableBody(workspace: MainAgentWorkspace): string {
    const chunks: string[] = [];
    for (const document of workspace.documents) {
        for (const section of document.sections) {
            chunks.push(`${'#'.repeat(Math.min(section.level + 1, 6))} ${section.heading}`);
            chunks.push('');
            chunks.push(section.content.trim() || '- No content provided.');
            chunks.push('');
        }
    }
    if (workspace.permissions.length > 0) {
        chunks.push('## Safety And Permissions', '');
        for (const permission of workspace.permissions) {
            chunks.push(`- ${permission.tool}: ${permission.policy}`);
        }
        chunks.push('');
    }
    return chunks.join('\n').trimEnd();
}

function scopedRuleFiles(workspace: MainAgentWorkspace, directory: string, extension: 'md' | 'mdc'): GeneratedFile[] {
    const files = workspace.rules.slice(0, 12).map((rule, index) => {
        const slug = slugify(rule.name || `rule-${index + 1}`);
        const frontmatter =
            rule.globs.length > 0
                ? [
                      '---',
                      `description: ${rule.name}`,
                      `globs: ${rule.globs.join(',')}`,
                      'alwaysApply: false',
                      '---',
                      '',
                  ].join('\n')
                : ['---', `description: ${rule.name}`, 'alwaysApply: true', '---', ''].join('\n');
        return {
            path: `${directory}/${String(index + 1).padStart(2, '0')}-${slug}.${extension}`,
            content: `${frontmatter}# ${rule.name}\n\n${rule.content.trim()}\n`,
        };
    });
    return files.length > 0
        ? files
        : [
              {
                  path: `${directory}/01-project-rules.${extension}`,
                  content: '# Project Rules\n\nAdd project guidance here.\n',
              },
          ];
}

function copilotFiles(workspace: MainAgentWorkspace): GeneratedFile[] {
    const globalRules = workspace.rules.filter((rule) => rule.globs.length === 0);
    const scopedRules = workspace.rules.filter((rule) => rule.globs.length > 0);
    const files: GeneratedFile[] = [
        {
            path: '.github/copilot-instructions.md',
            content: `# Repository Instructions\n\n${globalRules.map((rule) => `## ${rule.name}\n\n${rule.content.trim()}`).join('\n\n') || portableBody(workspace)}\n`,
        },
    ];
    scopedRules.slice(0, 8).forEach((rule, index) => {
        files.push({
            path: `.github/instructions/${String(index + 1).padStart(2, '0')}-${slugify(rule.name)}.instructions.md`,
            content: `---\napplyTo: "${rule.globs.join(',')}"\n---\n\n# ${rule.name}\n\n${rule.content.trim()}\n`,
        });
    });
    return files;
}

function openClawFiles(workspace: MainAgentWorkspace): GeneratedFile[] {
    const persona = workspace.personas[0];
    return [
        { path: 'SOUL.md', content: `# SOUL.md\n\n${persona?.tone ?? 'Direct, practical, verification-first.'}\n` },
        { path: 'IDENTITY.md', content: `# IDENTITY.md\n\n${persona?.role ?? 'Senior coding agent'}\n` },
        { path: 'USER.md', content: '# USER.md\n\nCapture user preferences and working style here.\n' },
        { path: 'AGENTS.md', content: portableAgentsMarkdown(workspace, 'AGENTS.md - Workspace Rules') },
        {
            path: 'MEMORY.md',
            content: '# MEMORY.md\n\nDurable facts, architectural decisions, and recurring workarounds.\n',
        },
    ];
}

function createReport(
    workspace: MainAgentWorkspace,
    sourcePlatform: PlatformId,
    targetPlatform: PlatformId,
): AdaptationReport {
    const targetCapability = getCapability(targetPlatform);
    const mapped = ['markdown sections', 'core rules'];
    const approximated: string[] = [];
    const dropped: string[] = [];
    const warnings = [];
    if (workspace.personas.length > 0 && targetPlatform !== 'openclaw')
        approximated.push('persona profile mapped into markdown instructions');
    if (workspace.memories.length > 0 && !['openclaw', 'claude-code', 'gemini-cli'].includes(targetPlatform))
        approximated.push('memory policy represented as plain instructions');
    if (workspace.permissions.length > 0 && targetPlatform !== 'opencode')
        approximated.push('permissions represented as markdown safety policy');
    if (targetCapability.confidence !== 'high') {
        warnings.push({
            severity: 'warning' as const,
            feature: 'confidence',
            message: `${targetCapability.displayName} behavior is not fully verified.`,
        });
    }
    return { sourcePlatform, targetPlatform, mapped, approximated, dropped, warnings };
}

function slugify(value: string): string {
    return (
        value
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 48) || 'rule'
    );
}
