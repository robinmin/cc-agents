#!/usr/bin/env bun
/**
 * rd3:tasks CLI — TypeScript implementation
 *
 * Usage:
 *   bun scripts/tasks.ts <command> [arguments]
 *
 * Commands:
 *   init                      Initialize tasks metadata
 *   create <name>            Create new task
 *   list [stage]             List tasks
 *   update <WBS> <stage>      Update task status
 *   update <WBS> --section <name> --from-file <path>
 *   show <WBS>                Show task content
 *   open <WBS>                Open task in editor
 *   refresh                   Refresh kanban boards
 *   check [WBS]               Validate tasks
 *   config [set-active|add-folder]
 *   batch-create --from-json FILE
 *   batch-create --from-agent-output FILE
 *   put <WBS> <file> [--name <name>]
 *   get <WBS> [--artifact-type <type>]
 *   tree <WBS>
 *   write-guard --stdin      (hook integration)
 *
 * Global flags:
 *   --folder <path>           Override active folder
 *   --json                    JSON output mode
 *   --dry-run                 Preview changes
 *   --force                   Bypass warnings
 */

import { getProjectRoot } from './lib/config';
import { runInit } from './commands/init';
import { createTask } from './commands/create';
import { listTasks } from './commands/list';
import { updateTask } from './commands/update';
import { showTask } from './commands/show';
import { openTask } from './commands/open';
import { refreshKanbanBoards } from './commands/refresh';
import { checkTask } from './commands/check';
import { showConfig, setActiveFolder, addFolder } from './commands/config';
import { batchCreate } from './commands/batchCreate';
import { putArtifact } from './commands/put';
import { getArtifacts } from './commands/get';
import { showTree } from './commands/tree';
import { runWriteGuardStdin } from './commands/writeGuard';
import { runServer } from './commands/server';
import { isErr } from './lib/result';
import { VALID_STATUSES, VALID_PHASES, normalizeStatus, type TaskStatus } from './types';
import { logger } from '../../../scripts/logger';

const CLI_USAGE = `
rd3:tasks CLI — Markdown-based task management with WBS numbering

Usage:
  tasks <command> [arguments] [--folder <path>] [--json]

Commands:
  init                          Initialize tasks metadata (idempotent)
  create <name>                 Create a new task
  create <name> --background <text> --requirements <text>
                                 Seed key task sections during creation
  create <name> --solution <text> [--priority <level>] [--estimated-hours <N>]
                                 Preserve decomposition metadata at creation time
  create <name> --dependencies <a,b> [--tags <x,y>]
                                 Attach structured planning metadata
  create <name> --profile <profile>
                                 Persist orchestration profile in task frontmatter
  list [stage]                  List all tasks, optionally filtered by stage
  update <WBS> <stage>          Update task status (Backlog|Todo|WIP|Testing|Blocked|Done|Canceled)
  update <WBS> --section <name> --from-file <path>
                                 Update a task section from a file
  update <WBS> --phase <phase> --phase-status <status>
                                 Update impl_progress phase
  update <WBS> --field profile --value <profile>
                                 Update a supported frontmatter field
  show <WBS>                    Show task content (for agents)
  open <WBS>                    Open task in default editor (for humans)
  refresh                       Regenerate kanban boards
  check [WBS]                   Validate task(s) against tiered rules
  config                        Show current configuration
  config set-active <folder>    Set the active task folder
  config add-folder <path> --base-counter <N> [--label <label>]
                                 Add a new task folder
  batch-create --from-json FILE Create multiple tasks from JSON array
  batch-create --from-agent-output FILE
                                 Extract tasks from an agent <!-- TASKS: [...] --> footer
  put <WBS> <file> [--name <display-name>]
                                 Store a file in docs/tasks/<wbs>/
  get <WBS> [--artifact-type <type>]
                                 List stored artifacts for a task
  tree <WBS>                    Show directory tree for a task's artifacts
  server [--port <port>] [--host <addr>]
                                Start HTTP server for task operations
  write-guard --stdin           PreToolUse hook integration (internal)

Global Flags:
  --folder <path>               Override active folder
  --all                         List tasks from every configured folder
  --json                        Machine-readable JSON output
  --dry-run                     Preview without applying changes
  --force                       Bypass tier-2 validation warnings

Examples:
  tasks init
  tasks create "Implement user auth"
  tasks create "Implement user auth" --background "Why this exists" --requirements "What success looks like"
  tasks create "Implement user auth" --profile standard
  tasks list
  tasks list --all
  tasks list wip
  tasks update 47 wip --force
  tasks show 47 --json
  tasks update 47 --section Solution --from-file /tmp/solution.md
  tasks update 47 --field profile --value complex
  tasks refresh
  tasks check 47
  tasks put 47 /tmp/design.png --name design.png
  tasks get 47
  tasks tree 47
`.trim();

function emitJsonSuccess(data: unknown) {
    logger.log(JSON.stringify({ ok: true, data }, null, 2));
}

function emitJsonError(error: string) {
    logger.log(JSON.stringify({ ok: false, error }, null, 2));
}

function normalizeStatusInput(input?: string): TaskStatus | undefined {
    if (!input) return undefined;
    const result = normalizeStatus(input);
    // For CLI parsing: return undefined for unknown values so the parser
    // can fall through to section/phase update handling
    if (result.wasNormalized && !result.recognized) return undefined;
    return result.status;
}

function parseListOption(value?: string): string[] | undefined {
    if (!value) return undefined;

    const items = value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

    return items.length > 0 ? items : undefined;
}

async function main() {
    const args = process.argv.slice(2);

    // Handle write-guard separately (used by hooks)
    if (args[0] === 'write-guard') {
        const exitCode = runWriteGuardStdin();
        process.exit(exitCode);
    }

    if (args.length === 0 || args[0] === 'help' || args[0] === '--help') {
        logger.log(CLI_USAGE);
        process.exit(args[0] === 'help' || args[0] === '--help' ? 0 : 1);
        return;
    }

    const projectRoot = getProjectRoot();

    // Parse global flags
    const globalFlags: Record<string, string | boolean> = {};
    const remainingArgs: string[] = [];
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--folder' && i + 1 < args.length) {
            globalFlags.folder = args[++i];
        } else if (arg === '--json') {
            globalFlags.json = true;
        } else if (arg === '--all') {
            globalFlags.all = true;
        } else if (arg === '--dry-run') {
            globalFlags.dryRun = true;
        } else if (arg === '--force') {
            globalFlags.force = true;
        } else {
            remainingArgs.push(arg);
        }
    }

    const cmdArgs = remainingArgs.slice(1);
    const [cmd, ...rest] = remainingArgs;
    const json = !!globalFlags.json;
    const all = !!globalFlags.all;
    const dryRun = !!globalFlags.dryRun;
    const force = !!globalFlags.force;
    const cliFolder = globalFlags.folder as string | undefined;

    let exitCode = 0;

    switch (cmd) {
        case 'init': {
            const result = runInit(projectRoot);
            if (isErr(result)) {
                if (json) {
                    emitJsonError(result.error);
                } else {
                    logger.error(result.error);
                }
                exitCode = 1;
            } else if (json) {
                emitJsonSuccess({ initialized: true });
            }
            break;
        }

        case 'create': {
            const createOptions: {
                background?: string;
                requirements?: string;
                solution?: string;
                priority?: string;
                estimatedHours?: number;
                dependencies?: string[];
                tags?: string[];
                profile?: string;
                quiet: boolean;
            } = { quiet: json };
            const nameParts: string[] = [];

            for (let i = 0; i < cmdArgs.length; i++) {
                const arg = cmdArgs[i];
                if (arg === '--background' && i + 1 < cmdArgs.length) {
                    createOptions.background = cmdArgs[++i];
                } else if (arg === '--requirements' && i + 1 < cmdArgs.length) {
                    createOptions.requirements = cmdArgs[++i];
                } else if (arg === '--solution' && i + 1 < cmdArgs.length) {
                    createOptions.solution = cmdArgs[++i];
                } else if (arg === '--priority' && i + 1 < cmdArgs.length) {
                    createOptions.priority = cmdArgs[++i];
                } else if (arg === '--estimated-hours' && i + 1 < cmdArgs.length) {
                    const parsed = Number(cmdArgs[++i]);
                    if (!Number.isFinite(parsed)) {
                        const error = `Invalid value for --estimated-hours: ${cmdArgs[i]}`;
                        if (json) {
                            emitJsonError(error);
                        } else {
                            logger.error(error);
                        }
                        exitCode = 1;
                        break;
                    }
                    createOptions.estimatedHours = parsed;
                } else if (arg === '--dependencies' && i + 1 < cmdArgs.length) {
                    const dependencies = parseListOption(cmdArgs[++i]);
                    if (dependencies) {
                        createOptions.dependencies = dependencies;
                    }
                } else if (arg === '--tags' && i + 1 < cmdArgs.length) {
                    const tags = parseListOption(cmdArgs[++i]);
                    if (tags) {
                        createOptions.tags = tags;
                    }
                } else if (arg === '--profile' && i + 1 < cmdArgs.length) {
                    createOptions.profile = cmdArgs[++i];
                } else if (arg.startsWith('--')) {
                    const error = `Unknown create flag: ${arg}`;
                    if (json) {
                        emitJsonError(error);
                    } else {
                        logger.error(error);
                    }
                    exitCode = 1;
                    break;
                } else {
                    nameParts.push(arg);
                }
            }

            if (exitCode !== 0) {
                break;
            }

            const taskName = nameParts.join(' ').trim();
            if (!taskName) {
                if (json) {
                    emitJsonError(
                        'Usage: tasks create <name> [--background TEXT] [--requirements TEXT] [--solution TEXT]',
                    );
                } else {
                    logger.error(
                        'Usage: tasks create <name> [--background TEXT] [--requirements TEXT] [--solution TEXT]',
                    );
                }
                exitCode = 1;
                break;
            }
            const result = createTask(projectRoot, taskName, cliFolder, createOptions);
            if (isErr(result)) {
                if (json) {
                    emitJsonError(result.error);
                } else {
                    logger.error(result.error);
                }
                exitCode = 1;
            } else if (json) {
                emitJsonSuccess(result.value);
            }
            break;
        }

        case 'list': {
            const statusFilter = normalizeStatusInput(rest[0]);
            if (rest[0] && !statusFilter) {
                const error = `Invalid status: ${rest[0]}. Valid: ${VALID_STATUSES.join(', ')}`;
                if (json) {
                    emitJsonError(error);
                } else {
                    logger.error(error);
                }
                exitCode = 1;
                break;
            }
            const result = listTasks(projectRoot, cliFolder, statusFilter, all, json);
            if (isErr(result)) {
                if (json) {
                    emitJsonError(result.error);
                } else {
                    logger.error(result.error);
                }
                exitCode = 1;
            } else if (json) {
                emitJsonSuccess(result.value);
            }
            break;
        }

        case 'status': {
            // Alias for list
            const result = listTasks(projectRoot, cliFolder, undefined, all, json);
            if (isErr(result)) {
                if (json) {
                    emitJsonError(result.error);
                } else {
                    logger.error(result.error);
                }
                exitCode = 1;
            } else if (json) {
                emitJsonSuccess(result.value);
            }
            break;
        }

        case 'update': {
            if (!rest[0]) {
                if (json) {
                    emitJsonError(
                        'Usage: tasks update <WBS> <stage> OR tasks update <WBS> --field profile --value <profile>',
                    );
                } else {
                    logger.error(
                        'Usage: tasks update <WBS> <stage> OR tasks update <WBS> --field profile --value <profile>',
                    );
                }
                exitCode = 1;
                break;
            }
            const wbs = rest[0];
            const statusOrSection = rest[1];
            const normalizedStatus = normalizeStatusInput(statusOrSection);

            // Check if second arg is a valid status
            if (normalizedStatus) {
                const result = updateTask(projectRoot, wbs, {
                    status: normalizedStatus,
                    force,
                    dryRun,
                    json,
                    quiet: json,
                });
                if (isErr(result)) {
                    if (json) {
                        emitJsonError(result.error);
                    } else {
                        logger.error(result.error);
                    }
                    exitCode = 1;
                } else if (json) {
                    emitJsonSuccess(result.value);
                }
            } else {
                // Assume section update
                const sectionIdx = cmdArgs.indexOf('--section');
                const fromFileIdx = cmdArgs.indexOf('--from-file');
                const phaseIdx = cmdArgs.indexOf('--phase');
                const phaseStatusIdx = cmdArgs.indexOf('--phase-status');
                const fieldIdx = cmdArgs.indexOf('--field');
                const valueIdx = cmdArgs.indexOf('--value');

                if (sectionIdx !== -1 && fromFileIdx !== -1) {
                    const section = cmdArgs[sectionIdx + 1];
                    const fromFile = cmdArgs[fromFileIdx + 1];
                    const result = updateTask(projectRoot, wbs, {
                        section,
                        fromFile,
                        dryRun,
                        json,
                        quiet: json,
                    });
                    if (isErr(result)) {
                        if (json) {
                            emitJsonError(result.error);
                        } else {
                            logger.error(result.error);
                        }
                        exitCode = 1;
                    } else if (json) {
                        emitJsonSuccess(result.value);
                    }
                } else if (phaseIdx !== -1 && phaseStatusIdx !== -1) {
                    const phase = cmdArgs[phaseIdx + 1] as (typeof VALID_PHASES)[number];
                    const phaseStatus = cmdArgs[phaseStatusIdx + 1];
                    if (!VALID_PHASES.includes(phase)) {
                        const error = `Invalid phase: ${phase}. Valid: ${VALID_PHASES.join(', ')}`;
                        if (json) {
                            emitJsonError(error);
                        } else {
                            logger.error(error);
                        }
                        exitCode = 1;
                        break;
                    }
                    const result = updateTask(projectRoot, wbs, {
                        phase,
                        phaseStatus,
                        dryRun,
                        json,
                        quiet: json,
                    });
                    if (isErr(result)) {
                        if (json) {
                            emitJsonError(result.error);
                        } else {
                            logger.error(result.error);
                        }
                        exitCode = 1;
                    } else if (json) {
                        emitJsonSuccess(result.value);
                    }
                } else if (fieldIdx !== -1 && valueIdx !== -1) {
                    const field = cmdArgs[fieldIdx + 1];
                    const value = cmdArgs[valueIdx + 1];
                    const result = updateTask(projectRoot, wbs, {
                        field: field as 'profile',
                        value,
                        dryRun,
                        json,
                        quiet: json,
                    });
                    if (isErr(result)) {
                        if (json) {
                            emitJsonError(result.error);
                        } else {
                            logger.error(result.error);
                        }
                        exitCode = 1;
                    } else if (json) {
                        emitJsonSuccess(result.value);
                    }
                } else {
                    const error =
                        'Usage: tasks update <WBS> <stage> OR tasks update <WBS> --section <name> --from-file <path> OR tasks update <WBS> --field profile --value <profile>';
                    if (json) {
                        emitJsonError(error);
                    } else {
                        logger.error(error);
                    }
                    exitCode = 1;
                }
            }
            break;
        }

        case 'show': {
            if (!rest[0]) {
                if (json) {
                    emitJsonError('Usage: tasks show <WBS>');
                } else {
                    logger.error('Usage: tasks show <WBS>');
                }
                exitCode = 1;
                break;
            }
            const result = showTask(projectRoot, rest[0], json);
            if (isErr(result)) {
                if (json) {
                    emitJsonError(result.error);
                } else {
                    logger.error(result.error);
                }
                exitCode = 1;
            } else if (json) {
                emitJsonSuccess(result.value);
            }
            break;
        }

        case 'open': {
            if (!rest[0]) {
                if (json) {
                    emitJsonError('Usage: tasks open <WBS>');
                } else {
                    logger.error('Usage: tasks open <WBS>');
                }
                exitCode = 1;
                break;
            }
            const result = openTask(projectRoot, rest[0], json);
            if (isErr(result)) {
                if (json) {
                    emitJsonError(result.error);
                } else {
                    logger.error(result.error);
                }
                exitCode = 1;
            } else if (json) {
                emitJsonSuccess(result.value);
            }
            break;
        }

        case 'refresh': {
            const result = refreshKanbanBoards(projectRoot, json);
            if (json) {
                emitJsonSuccess(result);
            }
            if (!result.ok) {
                exitCode = 1;
            }
            break;
        }

        case 'check': {
            const result = checkTask(projectRoot, rest[0], json);
            if (isErr(result)) {
                if (json) {
                    emitJsonError(result.error);
                } else {
                    logger.error(result.error);
                }
                exitCode = 1;
            } else if (json) {
                emitJsonSuccess(result.value);
                if (!result.value.valid) {
                    exitCode = 1;
                }
            } else if (!result.value.valid) {
                exitCode = 1;
            }
            break;
        }

        case 'config': {
            if (!rest[0]) {
                const result = showConfig(projectRoot, json);
                if (json) {
                    emitJsonSuccess(result);
                }
            } else if (rest[0] === 'set-active') {
                if (!rest[1]) {
                    if (json) {
                        emitJsonError('Usage: tasks config set-active <folder>');
                    } else {
                        logger.error('Usage: tasks config set-active <folder>');
                    }
                    exitCode = 1;
                    break;
                }
                const result = setActiveFolder(projectRoot, rest[1], json);
                if (!result.ok) {
                    if (json) {
                        emitJsonError(result.error || 'Failed');
                    } else {
                        logger.error(result.error || 'Failed');
                    }
                    exitCode = 1;
                } else if (json) {
                    emitJsonSuccess({ active_folder: result.activeFolder });
                }
            } else if (rest[0] === 'add-folder') {
                if (!rest[1]) {
                    const error = 'Usage: tasks config add-folder <path> --base-counter <N> [--label <label>]';
                    if (json) {
                        emitJsonError(error);
                    } else {
                        logger.error(error);
                    }
                    exitCode = 1;
                    break;
                }
                const folder = rest[1];
                let baseCounter = 0;
                let label: string | undefined;
                for (let i = 2; i < cmdArgs.length; i++) {
                    if (cmdArgs[i] === '--base-counter' && i + 1 < cmdArgs.length) {
                        baseCounter = Number.parseInt(cmdArgs[++i], 10);
                    } else if (cmdArgs[i] === '--label' && i + 1 < cmdArgs.length) {
                        label = cmdArgs[++i];
                    }
                }
                const result = addFolder(projectRoot, folder, baseCounter, label, json);
                if (!result.ok) {
                    if (json) {
                        emitJsonError(result.error || 'Failed');
                    } else {
                        logger.error(result.error || 'Failed');
                    }
                    exitCode = 1;
                } else if (json) {
                    emitJsonSuccess({
                        folder: result.folder,
                        base_counter: result.baseCounter,
                        label: result.label,
                    });
                }
            } else {
                if (json) {
                    emitJsonError(`Unknown config subcommand: ${rest[0]}`);
                } else {
                    logger.error(`Unknown config subcommand: ${rest[0]}`);
                }
                exitCode = 1;
            }
            break;
        }

        case 'batch-create': {
            let jsonPath: string | undefined;
            let agentOutputPath: string | undefined;
            for (let i = 0; i < cmdArgs.length; i++) {
                if (cmdArgs[i] === '--from-json' && i + 1 < cmdArgs.length) {
                    jsonPath = cmdArgs[++i];
                } else if (cmdArgs[i] === '--from-agent-output' && i + 1 < cmdArgs.length) {
                    agentOutputPath = cmdArgs[++i];
                }
            }
            if (!!jsonPath === !!agentOutputPath) {
                if (json) {
                    emitJsonError('Usage: tasks batch-create --from-json FILE | --from-agent-output FILE');
                } else {
                    logger.error('Usage: tasks batch-create --from-json FILE | --from-agent-output FILE');
                }
                exitCode = 1;
                break;
            }
            const inputPath = jsonPath ?? agentOutputPath;
            if (!inputPath) {
                if (json) {
                    emitJsonError('Usage: tasks batch-create --from-json FILE | --from-agent-output FILE');
                } else {
                    logger.error('Usage: tasks batch-create --from-json FILE | --from-agent-output FILE');
                }
                exitCode = 1;
                break;
            }

            const result = batchCreate(projectRoot, inputPath, cliFolder, json, jsonPath ? 'json' : 'agent-output');
            if (isErr(result)) {
                if (json) {
                    emitJsonError(result.error);
                } else {
                    logger.error(result.error);
                }
                exitCode = 1;
            } else if (json) {
                emitJsonSuccess(result.value);
            }
            break;
        }

        case 'put': {
            if (!rest[0] || !rest[1]) {
                if (json) {
                    emitJsonError('Usage: tasks put <WBS> <file> [--name <display-name>]');
                } else {
                    logger.error('Usage: tasks put <WBS> <file> [--name <display-name>]');
                }
                exitCode = 1;
                break;
            }
            const wbs = rest[0];
            const file = rest[1];
            let name: string | undefined;
            for (let i = 2; i < cmdArgs.length; i++) {
                if (cmdArgs[i] === '--name' && i + 1 < cmdArgs.length) {
                    name = cmdArgs[++i];
                }
            }
            const result = putArtifact(projectRoot, wbs, file, name ? { name, quiet: json } : { quiet: json });
            if (isErr(result)) {
                if (json) {
                    emitJsonError(result.error);
                } else {
                    logger.error(result.error);
                }
                exitCode = 1;
            } else if (json) {
                emitJsonSuccess(result.value);
            }
            break;
        }

        case 'get': {
            if (!rest[0]) {
                if (json) {
                    emitJsonError('Usage: tasks get <WBS> [--artifact-type <type>]');
                } else {
                    logger.error('Usage: tasks get <WBS> [--artifact-type <type>]');
                }
                exitCode = 1;
                break;
            }
            const wbs = rest[0];
            let artifactType: string | undefined;
            for (let i = 1; i < cmdArgs.length; i++) {
                if (cmdArgs[i] === '--artifact-type' && i + 1 < cmdArgs.length) {
                    artifactType = cmdArgs[++i];
                }
            }
            const result = getArtifacts(projectRoot, wbs, artifactType ? { artifactType } : {}, json);
            if (isErr(result)) {
                if (json) {
                    emitJsonError(result.error);
                } else {
                    logger.error(result.error);
                }
                exitCode = 1;
            } else if (json) {
                emitJsonSuccess(result.value.paths);
            }
            break;
        }

        case 'server': {
            runServer(cmdArgs);
            return; // runServer handles its own lifecycle
        }

        case 'tree': {
            if (!rest[0]) {
                if (json) {
                    emitJsonError('Usage: tasks tree <WBS>');
                } else {
                    logger.error('Usage: tasks tree <WBS>');
                }
                exitCode = 1;
                break;
            }
            const result = showTree(projectRoot, rest[0], json);
            if (isErr(result)) {
                if (json) {
                    emitJsonError(result.error);
                } else {
                    logger.error(result.error);
                }
                exitCode = 1;
            } else if (json) {
                emitJsonSuccess(result.value);
            }
            break;
        }

        default: {
            if (json) {
                emitJsonError(`Unknown command: ${cmd}`);
            } else {
                logger.error(`Unknown command: ${cmd}`);
            }
            logger.log(CLI_USAGE);
            exitCode = 1;
        }
    }

    process.exit(exitCode);
}

main();
