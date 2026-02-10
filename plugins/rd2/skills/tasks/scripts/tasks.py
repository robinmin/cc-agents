#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from datetime import datetime
from enum import Enum
from pathlib import Path

# Constants for log rotation
MAX_LOG_SIZE = 1024 * 1024  # 1MB max log file size before rotation


def rotate_log_file(log_path: Path) -> None:
    """Rotate log file if it exceeds MAX_LOG_SIZE.

    Args:
        log_path: Path to the log file to potentially rotate
    """
    if not log_path.exists():
        return

    try:
        if log_path.stat().st_size >= MAX_LOG_SIZE:
            # Create rotated filename with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            rotated_path = log_path.parent / f"{log_path.stem}.{timestamp}{log_path.suffix}"
            # Rename current log to rotated name
            log_path.rename(rotated_path)
            # Keep only last 5 rotated logs
            _cleanup_old_logs(log_path, keep_count=5)
    except (OSError, ValueError):
        # Silently fail rotation to avoid breaking core functionality
        pass


def _cleanup_old_logs(log_path: Path, keep_count: int = 5) -> None:
    """Remove old rotated log files beyond keep_count.

    Args:
        log_path: Original log file path (without timestamp suffix)
        keep_count: Number of rotated logs to keep (default: 5)
    """
    try:
        # Find all rotated logs for this file
        pattern = f"{log_path.stem}.*{log_path.suffix}"
        rotated_logs = sorted(
            log_path.parent.glob(pattern),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        # Remove logs beyond keep_count
        for old_log in rotated_logs[keep_count:]:
            old_log.unlink()
    except (OSError, ValueError):
        # Silently fail cleanup to avoid breaking core functionality
        pass


TASKS_USAGE = """
Tasks CLI Tool - Python implementation
Manages task files with centralized metadata (docs/.tasks/) and kanban board sync.

Usage:
    tasks <command> [arguments] [--folder <path>]
    python3 ${CLAUDE_PLUGIN_ROOT}/skills/tasks/scripts/tasks.py <command> [arguments]

Global Options:
    --folder <path>          Override active task folder (e.g., docs/next-phase)

Commands:
    init                     Initialize tasks (creates docs/.tasks/, migrates metadata)
    create <name>            Create a new task
    create <name> --background TEXT --requirements TEXT
                             Create with pre-filled sections
    create --from-json FILE  Create from JSON definition
    create --from-stdin      Create from JSON on stdin
    batch-create --from-json FILE
                             Create multiple tasks from JSON array
    batch-create --from-agent-output FILE
                             Create tasks from agent output footer
    list [stage]             List tasks (optionally filter by stage)
    update <WBS> <stage>     Update a task's stage
    update <WBS> <stage> --force
                             Bypass validation warnings
    update <WBS> --phase <phase> <status> [--force]
                             Update impl_progress phase and auto-compute status
    update <WBS> --section <name> --from-file <path>
                             Update a section's content from a file
    update <WBS> --section Artifacts --append-row "type|path|agent|date"
                             Append a row to the Artifacts table
    open <WBS>               Open a task file in default editor
    refresh                  Refresh the kanban board
    check                    Verify tasks CLI availability
    check <WBS>              Validate a specific task file
    config                   Show current configuration
    config set-active <dir>  Change the active task folder
    config add-folder <dir>  Add a new task folder
    decompose <requirement>  Break down requirement into subtasks
    log <prefix> [--data]    Log developer events
    help                     Show this help message

Examples:
    tasks init
    tasks create "Implement feature X"
    tasks create "Feature" --background "Context" --requirements "Criteria"
    tasks create --from-json task.json
    tasks batch-create --from-json tasks.json
    tasks batch-create --from-agent-output output.md
    tasks list wip
    tasks update 47 testing
    tasks update 47 wip --force
    tasks update 47 --phase implementation completed
    tasks open 0047
    tasks check
    tasks check 47
    tasks config
    tasks config set-active docs/next-phase
    tasks config add-folder docs/next-phase --base-counter 200 --label "Phase 2"
    tasks create "New task" --folder docs/next-phase
    tasks decompose "Build authentication system"
    tasks decompose "Add OAuth" --wbs-prefix 50
    tasks log DEBUG --data '{"key": "value"}'
"""


class TaskStatus(Enum):
    """Canonical task statuses."""

    BACKLOG = "Backlog"
    TODO = "Todo"
    WIP = "WIP"
    TESTING = "Testing"
    DONE = "Done"
    BLOCKED = "Blocked"

    @classmethod
    def from_alias(cls, alias: str) -> "TaskStatus | None":
        """Convert alias or case variation to canonical TaskStatus."""
        alias_lower = alias.lower().replace("-", "").replace("_", "").replace(" ", "")

        aliases = {
            "backlog": cls.BACKLOG,
            "todo": cls.TODO,
            "to-do": cls.TODO,
            "pending": cls.TODO,
            "wip": cls.WIP,
            "inprogress": cls.WIP,
            "in-progress": cls.WIP,
            "in_progress": cls.WIP,
            "working": cls.WIP,
            "testing": cls.TESTING,
            "test": cls.TESTING,
            "review": cls.TESTING,
            "inreview": cls.TESTING,
            "done": cls.DONE,
            "completed": cls.DONE,
            "complete": cls.DONE,
            "finished": cls.DONE,
            "closed": cls.DONE,
            "blocked": cls.BLOCKED,
            "failed": cls.BLOCKED,
            "stuck": cls.BLOCKED,
            "error": cls.BLOCKED,
        }

        return aliases.get(alias_lower)

    def __str__(self) -> str:
        return self.value


class TasksConfig:
    """Configuration for the tasks CLI with dual-mode support.

    Supports two modes:
    - Legacy mode: metadata in docs/prompts/ (no config file)
    - Config mode: metadata in docs/.tasks/ with config.jsonc
    """

    LEGACY_DIR = "docs/prompts"
    LEGACY_KANBAN = ".kanban.md"
    LEGACY_TEMPLATE = ".template.md"
    TASKS_META_DIR = "docs/.tasks"
    CONFIG_FILE = "config.jsonc"

    def __init__(self, project_root: Path | None = None, folder: str | None = None):
        """Initialize configuration.

        Args:
            project_root: Project root directory. Defaults to current git root.
            folder: Override active folder (e.g., "docs/next-phase").
        """
        self.project_root = project_root or self._find_git_root()
        self._folder_override = folder
        self._config: dict | None = None
        self._mode: str = "legacy"
        self._load_config()

    def _load_config(self) -> None:
        """Load config.jsonc if it exists, otherwise use legacy mode."""
        config_path = self.project_root / self.TASKS_META_DIR / self.CONFIG_FILE
        if config_path.exists():
            self._config = self._parse_jsonc(config_path)
            self._mode = "config"
        else:
            self._config = None
            self._mode = "legacy"

    @staticmethod
    def _parse_jsonc(path: Path) -> dict:
        """Parse JSONC (JSON with comments) file.

        Strips // line comments before parsing as JSON.
        """
        text = path.read_text()
        # Strip // line comments (but not inside strings)
        lines = []
        for line in text.splitlines():
            stripped = line.lstrip()
            if stripped.startswith("//"):
                continue
            # Remove trailing // comments (simple heuristic: outside quotes)
            in_string = False
            result = []
            i = 0
            while i < len(line):
                ch = line[i]
                if ch == '"' and (i == 0 or line[i - 1] != "\\"):
                    in_string = not in_string
                elif ch == "/" and not in_string and i + 1 < len(line) and line[i + 1] == "/":
                    break
                result.append(ch)
                i += 1
            lines.append("".join(result))
        return json.loads("\n".join(lines))

    @property
    def mode(self) -> str:
        """Return current mode: 'legacy' or 'config'."""
        return self._mode

    @property
    def meta_dir(self) -> Path:
        """Central metadata directory (docs/.tasks/)."""
        return self.project_root / self.TASKS_META_DIR

    @property
    def active_folder(self) -> Path:
        """The active task folder for create/list operations."""
        if self._folder_override:
            return self.project_root / self._folder_override
        if self._mode == "config" and self._config:
            return self.project_root / self._config.get("active_folder", self.LEGACY_DIR)
        return self.project_root / self.LEGACY_DIR

    @property
    def prompts_dir(self) -> Path:
        """Alias for active_folder (backward compat)."""
        return self.active_folder

    @property
    def all_folders(self) -> list[Path]:
        """All configured task folders."""
        if self._mode == "config" and self._config:
            folders = self._config.get("folders", {})
            return [self.project_root / f for f in folders]
        return [self.project_root / self.LEGACY_DIR]

    @property
    def kanban_file(self) -> Path:
        """Path to kanban board file."""
        if self._mode == "config":
            return self.meta_dir / "kanban.md"
        return self.project_root / self.LEGACY_DIR / self.LEGACY_KANBAN

    @property
    def template_file(self) -> Path:
        """Path to task template file."""
        if self._mode == "config":
            return self.meta_dir / "template.md"
        return self.project_root / self.LEGACY_DIR / self.LEGACY_TEMPLATE

    @property
    def sync_dir(self) -> Path:
        """Path to sync data directory."""
        if self._mode == "config":
            return self.meta_dir / "sync"
        return self.project_root / "docs/tasks_sync"

    @property
    def brainstorm_dir(self) -> Path:
        """Path to brainstorm output directory."""
        if self._mode == "config":
            return self.meta_dir / "brainstorm"
        return self.project_root / "docs/plans"

    @property
    def codereview_dir(self) -> Path:
        """Path to code review output directory."""
        return self.meta_dir / "codereview"

    @property
    def design_dir(self) -> Path:
        """Path to design output directory."""
        return self.meta_dir / "design"

    def get_next_wbs(self) -> int:
        """Get globally unique next WBS number.

        Scans ALL configured folders to find the global max WBS,
        then applies base_counter as a floor for the target folder.

        Returns:
            Next available WBS number.
        """
        global_max = 0

        # Scan all folders for the global max WBS
        for folder in self.all_folders:
            if not folder.exists():
                continue
            for task_file in folder.glob("*.md"):
                if task_file.name.startswith("."):
                    continue
                match = re.match(r"^(\d{4})", task_file.name)
                if match:
                    global_max = max(global_max, int(match.group(1)))

        # Apply base_counter floor for the active folder
        base_counter = 0
        if self._mode == "config" and self._config:
            folders_config = self._config.get("folders", {})
            # Find the active folder's relative path
            active_rel = str(self.active_folder.relative_to(self.project_root))
            folder_config = folders_config.get(active_rel, {})
            base_counter = folder_config.get("base_counter", 0)

        return max(global_max, base_counter) + 1

    def find_task_by_wbs(self, wbs: str) -> Path | None:
        """Search across ALL configured folders for a task by WBS number.

        Args:
            wbs: 4-digit WBS string (e.g., "0047").

        Returns:
            Path to the task file, or None if not found.
        """
        for folder in self.all_folders:
            if not folder.exists():
                continue
            matches = list(folder.glob(f"{wbs}_*.md"))
            if matches:
                return matches[0]
        return None

    def _find_git_root(self) -> Path:
        """Find the git repository root directory."""
        cwd = Path.cwd()
        for parent in [cwd] + list(cwd.parents):
            if (parent / ".git").exists():
                return parent
        raise RuntimeError("Not in a git repository. Please run from project root.")

    def validate(self) -> None:
        """Validate that required directories exist."""
        if not self.prompts_dir.exists():
            raise RuntimeError(f"Prompts directory not found: {self.prompts_dir}")
        if not self.kanban_file.exists():
            raise RuntimeError(f"Kanban file not found: {self.kanban_file}. Run 'init' first.")


class TaskFile:
    """Represents a single task file."""

    def __init__(self, path: Path):
        """Initialize task file.

        Args:
            path: Path to the task file.
        """
        self.path = path

    @property
    def wbs(self) -> str:
        """Extract WBS number from filename."""
        match = re.match(r"^(\d{4})", self.path.stem)
        if match:
            return match.group(1)
        raise ValueError(f"Invalid task filename (no WBS number): {self.path.name}")

    @property
    def name(self) -> str:
        """Extract task name from filename."""
        return self.path.stem[5:] if len(self.path.stem) > 4 else self.path.stem

    def get_status(self) -> TaskStatus:
        """Read status from frontmatter."""
        try:
            with open(self.path, "r") as f:
                for line in f:
                    if line.startswith("status:"):
                        status_str = line.split(":", 1)[1].strip()
                        status = TaskStatus.from_alias(status_str)
                        return status or TaskStatus.BACKLOG
        except OSError:
            pass
        return TaskStatus.BACKLOG

    def update_status(self, new_status: TaskStatus) -> None:
        """Update status in frontmatter."""
        with open(self.path, "r") as f:
            lines = f.readlines()

        updated_lines = []
        for line in lines:
            if line.startswith("status:"):
                line = f"status: {new_status.value}\n"
            elif line.startswith("updated_at:"):
                now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                line = f"updated_at: {now}\n"
            updated_lines.append(line)

        with open(self.path, "w") as f:
            f.writelines(updated_lines)

    def update_timestamp(self) -> None:
        """Update the updated_at field in frontmatter to current time."""
        lines = self.path.read_text().splitlines(keepends=True)
        updated = []
        for line in lines:
            if line.startswith("updated_at:"):
                now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                line = f"updated_at: {now}\n"
            updated.append(line)
        self.path.write_text("".join(updated))

    def get_section_content(self, section: str) -> str:
        """Read content of a named section (e.g., 'Background', 'Requirements')."""
        content = self.path.read_text()
        pattern = rf"###\s+{re.escape(section)}\s*\n(.*?)(?=###\s|\Z)"
        match = re.search(pattern, content, re.DOTALL)
        return match.group(1).strip() if match else ""

    def set_section_content(self, section: str, new_content: str) -> bool:
        """Replace content of a named section (e.g., 'Design', 'Plan').

        Works for any ### heading in the task file. Replaces everything between
        the ### heading and the next ### heading (or end of file).

        Returns True if section was found and updated, False otherwise.
        """
        content = self.path.read_text()
        pattern = rf"(###\s+{re.escape(section)}\s*\n)(.*?)(?=###\s|\Z)"
        match = re.search(pattern, content, re.DOTALL)
        if not match:
            return False
        replacement = match.group(1) + "\n" + new_content.strip() + "\n\n"
        updated = content[: match.start()] + replacement + content[match.end() :]
        self.path.write_text(updated)
        self.update_timestamp()
        return True

    def append_artifact_row(
        self, artifact_type: str, path: str, generated_by: str, date: str
    ) -> bool:
        """Append a row to the Artifacts table.

        Returns True if the table was found and row appended, False otherwise.
        """
        content = self.path.read_text()
        # Find the Artifacts table header + separator
        table_pattern = r"(\| Type \| Path \| Generated By \| Date \|\n\|[-\s|]+\|\n)"
        match = re.search(table_pattern, content)
        if not match:
            return False
        insert_point = match.end()
        new_row = f"| {artifact_type} | {path} | {generated_by} | {date} |\n"
        updated = content[:insert_point] + new_row + content[insert_point:]
        self.path.write_text(updated)
        self.update_timestamp()
        return True

    def get_impl_progress(self) -> dict[str, str]:
        """Read impl_progress from frontmatter."""
        result = {}
        content = self.path.read_text()
        fm_match = re.match(r"^---\n(.*?)\n---", content, re.DOTALL)
        if not fm_match:
            return result
        fm = fm_match.group(1)
        in_impl = False
        for line in fm.splitlines():
            if line.startswith("impl_progress:"):
                in_impl = True
                continue
            if in_impl:
                if line.startswith("  "):
                    key, _, val = line.strip().partition(":")
                    result[key.strip()] = val.strip()
                else:
                    break
        return result

    def sync_impl_progress_to_status(self, new_status: "TaskStatus") -> bool:
        """Sync all impl_progress phases to match a direct status change.

        Only syncs for unambiguous statuses:
        - Done → all phases = "completed"
        - Backlog/Todo → all phases = "pending"
        - WIP/Testing/Blocked → no change (ambiguous which phase is active)

        Returns True if phases were updated, False if no change needed.
        """
        progress = self.get_impl_progress()
        if not progress:
            return False

        if new_status == TaskStatus.DONE:
            target = "completed"
        elif new_status in (TaskStatus.BACKLOG, TaskStatus.TODO):
            target = "pending"
        else:
            return False

        # Check if any phase needs updating
        if all(v == target for v in progress.values()):
            return False

        for phase in progress:
            self.update_impl_progress(phase, target)
        return True

    def update_impl_progress(self, phase: str, status: str) -> None:
        """Update a single impl_progress phase in frontmatter."""
        content = self.path.read_text()
        lines = content.splitlines(keepends=True)
        updated = []
        in_impl = False
        for line in lines:
            if line.strip() == "impl_progress:":
                in_impl = True
                updated.append(line)
                continue
            if in_impl:
                stripped = line.strip()
                if stripped.startswith(f"{phase}:"):
                    # Preserve indentation
                    indent = line[: len(line) - len(line.lstrip())]
                    line = f"{indent}{phase}: {status}\n"
                    updated.append(line)
                    continue
                elif not line.startswith("  "):
                    in_impl = False
            updated.append(line)
        self.path.write_text("".join(updated))


IMPL_PHASES = ["planning", "design", "implementation", "review", "testing"]
IMPL_PHASE_STATUSES = ["pending", "in_progress", "completed", "blocked"]


def _phase_status_indicator(status: str) -> str:
    """Return a visual indicator for a phase status."""
    indicators = {
        "completed": "[x]",
        "in_progress": "[~]",
        "blocked": "[!]",
        "pending": "[ ]",
    }
    return indicators.get(status, "[ ]")


def compute_status_from_progress(progress: dict[str, str]) -> TaskStatus | None:
    """Compute task status from impl_progress phases."""
    if not progress:
        return None
    values = list(progress.values())
    if any(v == "blocked" for v in values):
        return TaskStatus.BLOCKED
    if all(v == "completed" for v in values):
        return TaskStatus.DONE
    if any(v == "in_progress" for v in values):
        return TaskStatus.WIP
    if any(v == "completed" for v in values):
        return TaskStatus.WIP  # mixed completed/pending = some work done
    return None  # all pending = no change


class ValidationResult:
    """Tiered validation result for task transitions."""

    def __init__(self):
        self.errors: list[str] = []  # Tier 1: always block
        self.warnings: list[str] = []  # Tier 2: block unless --force
        self.suggestions: list[str] = []  # Tier 3: informational

    @property
    def has_errors(self) -> bool:
        return len(self.errors) > 0

    @property
    def has_warnings(self) -> bool:
        return len(self.warnings) > 0


def validate_task_for_transition(task: TaskFile, new_status: TaskStatus) -> ValidationResult:
    """Validate a task file for a status transition."""
    result = ValidationResult()

    # Tier 1: structural errors (always block)
    try:
        task.get_status()
    except Exception:
        result.errors.append("Missing or invalid frontmatter status")

    # Tier 2: content warnings (block transitions to WIP/Testing/Done)
    if new_status in (TaskStatus.WIP, TaskStatus.TESTING, TaskStatus.DONE):
        bg = task.get_section_content("Background")
        if not bg or bg.startswith("["):
            result.warnings.append("Background section is empty or placeholder-only")
        req = task.get_section_content("Requirements")
        if not req or req.startswith("["):
            result.warnings.append("Requirements section is empty or placeholder-only")
        solution = task.get_section_content("Solution")
        if not solution or solution.startswith("["):
            result.warnings.append("Solution section is empty or placeholder-only")

    # Tier 3: suggestions (informational)
    design = task.get_section_content("Design")
    if not design or design.startswith("["):
        result.suggestions.append("Design section is empty (optional)")

    plan = task.get_section_content("Plan")
    if not plan or plan.startswith("["):
        result.suggestions.append("Plan section is empty (optional)")

    refs = task.get_section_content("References")
    if not refs or refs.startswith("["):
        result.suggestions.append("References section is empty")

    return result


class TasksManager:
    """Main tasks management class."""

    VALID_STAGES = [s.value for s in TaskStatus]

    def __init__(self, config: TasksConfig | None = None):
        """Initialize tasks manager.

        Args:
            config: Configuration object. Created automatically if None.
        """
        self.config = config or TasksConfig()

    @property
    def assets_dir(self) -> Path:
        """Get the assets directory path."""
        # Path is: plugins/rd2/skills/tasks/assets/
        script_path = Path(__file__).resolve()
        return script_path.parent.parent / "assets"

    def _validate_wbs(self, wbs: str) -> int:
        """Validate and normalize WBS number.

        Args:
            wbs: WBS number (can be short form like "47" or full "0047").

        Returns:
            Normalized 4-digit WBS as integer.

        Raises:
            ValueError: If WBS is invalid.
        """
        if not re.match(r"^\d{1,4}$", wbs):
            raise ValueError(
                f"Invalid WBS number '{wbs}'. Expected 1-4 digit number (e.g., '47' or '0047')."
            )
        return int(wbs)

    def _render_template(
        self,
        content: str,
        task_name: str,
        wbs: str,
        background: str | None = None,
        requirements: str | None = None,
    ) -> str:
        """Render a task template with variable substitution.

        Args:
            content: Raw template content.
            task_name: Name of the task.
            wbs: 4-digit WBS string.
            background: Optional content for Background section.
            requirements: Optional content for Requirements section.

        Returns:
            Rendered template content.
        """
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        for var, val in [
            ("PROMPT_NAME", task_name),
            ("WBS", wbs),
            ("CREATED_AT", now),
            ("UPDATED_AT", now),
        ]:
            content = content.replace("{ { " + var + " } }", val)
            content = content.replace("{{ " + var + " }}", val)
            content = content.replace("{{" + var + "}}", val)
        content = content.replace("{{ DESCRIPTION }}", f"Task: {task_name}")
        content = content.replace("<prompt description>", f"Task: {task_name}")

        if background:
            content = content.replace("[Context and motivation - why this task exists]", background)
        if requirements:
            content = content.replace("[What needs to be done - acceptance criteria]", requirements)

        return content

    def _create_symlink(self) -> None:
        """Create symlink at $HOMEBREW_PREFIX/bin/tasks for convenient access.

        Attempts to create a symlink from this script to $HOMEBREW_PREFIX/bin/tasks.
        Fails gracefully if:
        - $HOMEBREW_PREFIX is not set
        - $HOMEBREW_PREFIX/bin doesn't exist or isn't writable
        - Symlink already exists
        """
        import os

        homebrew_prefix = os.environ.get("HOMEBREW_PREFIX")
        if not homebrew_prefix:
            print("[INFO] HOMEBREW_PREFIX not set, skipping symlink creation")
            return

        bin_dir = Path(homebrew_prefix) / "bin"
        if not bin_dir.exists():
            print(f"[INFO] Homebrew bin directory not found: {bin_dir}")
            return

        symlink_path = bin_dir / "tasks"
        script_path = Path(__file__).resolve()

        # Check if symlink already exists
        if symlink_path.exists():
            if symlink_path.is_symlink() and symlink_path.resolve() == script_path:
                print(f"[INFO] Symlink already exists: {symlink_path}")
            else:
                print(f"[WARN] Symlink exists but points elsewhere: {symlink_path}")
            return

        # Create symlink
        try:
            symlink_path.symlink_to(script_path)
            print(f"[INFO] Created symlink: {symlink_path} -> {script_path}")
            print("[INFO] You can now use 'tasks' command from anywhere")
        except PermissionError:
            print(f"[WARN] Permission denied creating symlink at {symlink_path}")
        except OSError as e:
            print(f"[WARN] Failed to create symlink: {e}")

    def cmd_init(self) -> int:
        """Initialize the tasks management tool.

        Creates docs/.tasks/ centralized metadata directory with config.jsonc.
        Migrates existing metadata files from legacy locations.
        Idempotent — safe to run multiple times.
        """
        print("[INFO] Initializing tasks management tool...")

        # Create prompts directory (active folder)
        if not self.config.prompts_dir.exists():
            self.config.prompts_dir.mkdir(parents=True)
            print(f"[INFO] Created directory: {self.config.prompts_dir}")
        else:
            print(f"[INFO] Directory already exists: {self.config.prompts_dir}")

        # Create docs/.tasks/ centralized metadata directory
        meta_dir = self.config.meta_dir
        meta_dir.mkdir(parents=True, exist_ok=True)
        print(f"[INFO] Metadata directory: {meta_dir}")

        # Create subdirectories
        for subdir in ["brainstorm", "codereview", "design", "sync"]:
            sub_path = meta_dir / subdir
            sub_path.mkdir(exist_ok=True)

        # Generate config.jsonc if not present
        config_path = meta_dir / TasksConfig.CONFIG_FILE
        if not config_path.exists():
            # Detect existing task folders
            active_rel = str(self.config.active_folder.relative_to(self.config.project_root))
            config_data = {
                "$schema_version": 1,
                "active_folder": active_rel,
                "folders": {
                    active_rel: {
                        "base_counter": 0,
                        "label": "Phase 1",
                    }
                },
            }
            config_text = json.dumps(config_data, indent=2)
            # Add a comment header
            config_text = (
                "// Tasks CLI configuration — managed by `tasks init`\n"
                "// See: plugins/rd2/skills/tasks/SKILL.md\n" + config_text + "\n"
            )
            config_path.write_text(config_text)
            print(f"[INFO] Created config: {config_path}")
        else:
            print(f"[INFO] Config already exists: {config_path}")

        # Migrate .kanban.md from legacy location
        legacy_kanban = (
            self.config.project_root / self.config.LEGACY_DIR / self.config.LEGACY_KANBAN
        )
        config_kanban = meta_dir / "kanban.md"
        if legacy_kanban.exists() and not config_kanban.exists():
            shutil.copy2(legacy_kanban, config_kanban)
            print(f"[INFO] Migrated kanban: {legacy_kanban} -> {config_kanban}")
        elif not config_kanban.exists():
            # Create fresh kanban
            source_kanban = self.assets_dir / ".kanban.md"
            if source_kanban.exists():
                shutil.copy(source_kanban, config_kanban)
            else:
                self._write_kanban(
                    config_kanban,
                    {status: [] for status in self.VALID_STAGES},
                )
            print(f"[INFO] Created kanban board: {config_kanban}")

        # Migrate .template.md from legacy location
        legacy_template = (
            self.config.project_root / self.config.LEGACY_DIR / self.config.LEGACY_TEMPLATE
        )
        config_template = meta_dir / "template.md"
        if legacy_template.exists() and not config_template.exists():
            shutil.copy2(legacy_template, config_template)
            print(f"[INFO] Migrated template: {legacy_template} -> {config_template}")
        elif not config_template.exists():
            source_template = self.assets_dir / ".template.md"
            if source_template.exists():
                shutil.copy(source_template, config_template)
            else:
                self._write_template(config_template)
            print(f"[INFO] Created template: {config_template}")

        # Migrate docs/tasks_sync/ -> docs/.tasks/sync/
        legacy_sync = self.config.project_root / "docs/tasks_sync"
        config_sync = meta_dir / "sync"
        if legacy_sync.exists() and legacy_sync.is_dir():
            for sync_file in legacy_sync.iterdir():
                dest = config_sync / sync_file.name
                if not dest.exists():
                    shutil.copy2(sync_file, dest)
            print(f"[INFO] Migrated sync data: {legacy_sync} -> {config_sync}")

        # Reload config after creating config.jsonc
        self.config._load_config()

        # Create symlink for convenient 'tasks' command
        self._create_symlink()

        # Check for glow
        glow_path = shutil.which("glow")
        if not glow_path:
            print(
                "[WARN] 'glow' is not installed. Install with 'brew install glow' for better output."
            )

        print("[INFO] Initialization complete.")
        return 0

    def cmd_create(
        self,
        task_name: str,
        background: str | None = None,
        requirements: str | None = None,
        from_json: str | None = None,
        from_stdin: bool = False,
    ) -> int:
        """Create a new task.

        Args:
            task_name: Name for the new task.
            background: Content to inject into Background section.
            requirements: Content to inject into Requirements section.
            from_json: Path to JSON file with task definition.
            from_stdin: Read JSON task definition from stdin.
        """
        # Handle --from-json / --from-stdin
        if from_json or from_stdin:
            return self._create_from_json(from_json, from_stdin)

        if not task_name:
            print("[ERROR] Please provide a task name.", file=sys.stderr)
            print(TASKS_USAGE, file=sys.stderr)
            return 1

        # Validate task name length (security: prevent excessively long names)
        MAX_TASK_NAME_LENGTH = 200
        if len(task_name) > MAX_TASK_NAME_LENGTH:
            print(
                f"[ERROR] Task name too long (max {MAX_TASK_NAME_LENGTH} characters)",
                file=sys.stderr,
            )
            return 1

        self.config.validate()

        # Find next globally unique WBS number
        next_seq = self.config.get_next_wbs()
        wbs = f"{next_seq:04d}"

        # Create filename
        safe_name = task_name.replace(" ", "_").replace("/", "_").replace("\\", "_")
        filename = f"{wbs}_{safe_name}.md"
        filepath = self.config.prompts_dir / filename

        if filepath.exists():
            print(f"[ERROR] File already exists: {filepath}", file=sys.stderr)
            return 1

        # Create task from template
        if self.config.template_file.exists():
            content = self._render_template(
                self.config.template_file.read_text(),
                task_name,
                wbs,
                background,
                requirements,
            )
            filepath.write_text(content)
            print(f"[INFO] Created task: {filepath}")
        else:
            print(
                f"[ERROR] Template file not found: {self.config.template_file}",
                file=sys.stderr,
            )
            return 1

        # Refresh kanban
        self.cmd_refresh()
        return 0

    def _create_from_json(self, from_json: str | None, from_stdin: bool) -> int:
        """Create a task from a JSON definition.

        JSON format: {"name": "...", "background": "...", "requirements": "...", "description": "..."}
        """
        try:
            if from_stdin:
                data = json.loads(sys.stdin.read())
            elif from_json:
                data = json.loads(Path(from_json).read_text())
            else:
                print("[ERROR] No JSON source specified.", file=sys.stderr)
                return 1
        except (json.JSONDecodeError, OSError) as e:
            print(f"[ERROR] Failed to parse JSON: {e}", file=sys.stderr)
            return 1

        name = data.get("name", "")
        if not name:
            print("[ERROR] JSON must include 'name' field.", file=sys.stderr)
            return 1

        return self.cmd_create(
            task_name=name,
            background=data.get("background"),
            requirements=data.get("requirements"),
        )

    def cmd_batch_create(
        self,
        from_json: str | None = None,
        from_agent_output: str | None = None,
        from_stdin: bool = False,
    ) -> int:
        """Create multiple tasks from a JSON array.

        Args:
            from_json: Path to JSON file with array of task definitions.
            from_agent_output: Path to agent output file with <!-- TASKS: [...] --> footer.
            from_stdin: Read JSON array from stdin.

        Returns:
            0 on success, 1 on failure.
        """
        tasks_data: list[dict] = []

        try:
            if from_agent_output:
                content = Path(from_agent_output).read_text()
                match = re.search(r"<!--\s*TASKS:\s*(\[.*?\])\s*-->", content, re.DOTALL)
                if not match:
                    print("[ERROR] No <!-- TASKS: [...] --> footer found.", file=sys.stderr)
                    return 1
                tasks_data = json.loads(match.group(1))
            elif from_stdin:
                tasks_data = json.loads(sys.stdin.read())
            elif from_json:
                tasks_data = json.loads(Path(from_json).read_text())
            else:
                print(
                    "[ERROR] Usage: tasks batch-create --from-json FILE | --from-agent-output FILE | --from-stdin",
                    file=sys.stderr,
                )
                return 1
        except (json.JSONDecodeError, OSError) as e:
            print(f"[ERROR] Failed to parse input: {e}", file=sys.stderr)
            return 1

        if not isinstance(tasks_data, list):
            print("[ERROR] Expected JSON array of task definitions.", file=sys.stderr)
            return 1

        if not tasks_data:
            print("[INFO] No tasks to create.")
            return 0

        self.config.validate()

        created_wbs = []
        for task_def in tasks_data:
            name = task_def.get("name", "")
            if not name:
                print("[WARN] Skipping task with no name.", file=sys.stderr)
                continue

            # Use cmd_create but suppress its individual kanban refresh
            # by calling the creation logic directly
            result = self._create_single_task(
                name,
                background=task_def.get("background"),
                requirements=task_def.get("requirements"),
            )
            if result:
                created_wbs.append(result)

        # Single kanban refresh at end
        if created_wbs:
            self.cmd_refresh()
            print(f"[SUCCESS] Created {len(created_wbs)} tasks: {', '.join(created_wbs)}")

        return 0

    def _create_single_task(
        self,
        task_name: str,
        background: str | None = None,
        requirements: str | None = None,
    ) -> str | None:
        """Create a single task without refreshing kanban. Returns WBS or None."""
        MAX_TASK_NAME_LENGTH = 200
        if len(task_name) > MAX_TASK_NAME_LENGTH:
            print(f"[WARN] Task name too long, skipping: {task_name[:50]}...", file=sys.stderr)
            return None

        next_seq = self.config.get_next_wbs()
        wbs = f"{next_seq:04d}"

        safe_name = task_name.replace(" ", "_").replace("/", "_").replace("\\", "_")
        filename = f"{wbs}_{safe_name}.md"
        filepath = self.config.prompts_dir / filename

        if filepath.exists():
            print(f"[WARN] File already exists, skipping: {filepath}", file=sys.stderr)
            return None

        if not self.config.template_file.exists():
            print(f"[ERROR] Template file not found: {self.config.template_file}", file=sys.stderr)
            return None

        content = self._render_template(
            self.config.template_file.read_text(),
            task_name,
            wbs,
            background,
            requirements,
        )

        filepath.write_text(content)
        print(f"[INFO] Created task: {filepath}")
        return wbs

    def cmd_list(self, stage: str | None = None) -> int:
        """List tasks, optionally filtered by stage.

        Args:
            stage: Optional stage to filter by.
        """
        self.config.validate()

        if stage:
            # Normalize stage
            status = TaskStatus.from_alias(stage)
            if not status:
                print(f"[ERROR] Invalid stage: '{stage}'", file=sys.stderr)
                print(f"Valid stages: {', '.join(self.VALID_STAGES)}", file=sys.stderr)
                return 1

            # Extract and display section
            content = self.config.kanban_file.read_text()
            section_match = re.search(
                rf"## {re.escape(status.value)}.*?(?=## |\Z)", content, re.DOTALL
            )
            if section_match:
                section = section_match.group(0)
                self._display_with_glow(section)
            else:
                print(
                    f"[ERROR] Stage '{status.value}' not found in kanban board.",
                    file=sys.stderr,
                )
                return 1
        else:
            # Display all
            self._display_with_glow(self.config.kanban_file.read_text())

        return 0

    def cmd_update(
        self,
        wbs: str,
        stage: str | None = None,
        phase: str | None = None,
        phase_status: str | None = None,
        force: bool = False,
        section: str | None = None,
        from_file: str | None = None,
        append_row: str | None = None,
    ) -> int:
        """Update a task's stage, impl_progress phase, or section content.

        Args:
            wbs: WBS number (can be short form like "47" or full "0047").
            stage: New stage for the task (mutually exclusive with phase/section).
            phase: impl_progress phase to update (e.g., "implementation").
            phase_status: Status for the phase (e.g., "completed").
            force: Bypass tier-2 validation warnings.
            section: Section name to update (e.g., "Design", "Plan").
            from_file: Path to file containing new section content.
            append_row: Pipe-delimited row for Artifacts table (type|path|agent|date).
        """
        # Validate and normalize WBS to 4-digit
        try:
            wbs_int = self._validate_wbs(wbs)
            wbs_normalized = f"{wbs_int:04d}"
        except ValueError as e:
            print(f"[ERROR] {e}", file=sys.stderr)
            return 1

        self.config.validate()

        # Find task file across all folders
        task_path = self.config.find_task_by_wbs(wbs_normalized)
        if not task_path:
            print(f"[ERROR] No task found with WBS: {wbs_normalized}", file=sys.stderr)
            return 1

        task_file = TaskFile(task_path)

        # --section mode: update section content from file
        if section:
            # --append-row for Artifacts table
            if append_row:
                if section != "Artifacts":
                    print(
                        "[ERROR] --append-row is only valid with --section Artifacts",
                        file=sys.stderr,
                    )
                    return 1
                parts = append_row.split("|")
                if len(parts) != 4:
                    print(
                        "[ERROR] --append-row expects 4 pipe-delimited fields: "
                        "type|path|generated_by|date",
                        file=sys.stderr,
                    )
                    return 1
                if task_file.append_artifact_row(*[p.strip() for p in parts]):
                    print(f"[INFO] Appended artifact row to {task_file.path.name}")
                    return 0
                else:
                    print(
                        "[ERROR] Artifacts table not found in task file",
                        file=sys.stderr,
                    )
                    return 1

            # --from-file for section content
            if not from_file:
                print(
                    "[ERROR] --section requires --from-file <path> or --append-row",
                    file=sys.stderr,
                )
                return 1
            from_path = Path(from_file)
            if not from_path.exists():
                print(f"[ERROR] File not found: {from_file}", file=sys.stderr)
                return 1
            new_content = from_path.read_text()
            if not new_content.strip():
                print(f"[ERROR] File is empty: {from_file}", file=sys.stderr)
                return 1
            if task_file.set_section_content(section, new_content):
                print(
                    f"[INFO] Updated section '{section}' in {task_file.path.name} from {from_file}"
                )
                return 0
            else:
                print(
                    f"[ERROR] Section '### {section}' not found in {task_file.path.name}",
                    file=sys.stderr,
                )
                return 1

        # --phase mode: update impl_progress and auto-compute status
        if phase:
            if phase not in IMPL_PHASES:
                print(
                    f"[ERROR] Invalid phase: '{phase}'. Valid: {', '.join(IMPL_PHASES)}",
                    file=sys.stderr,
                )
                return 1
            if not phase_status or phase_status not in IMPL_PHASE_STATUSES:
                print(
                    f"[ERROR] Invalid phase status: '{phase_status}'. "
                    f"Valid: {', '.join(IMPL_PHASE_STATUSES)}",
                    file=sys.stderr,
                )
                return 1

            task_file.update_impl_progress(phase, phase_status)
            print(f"[INFO] Updated {task_file.path.name} phase '{phase}' to '{phase_status}'")

            # Auto-compute task status from updated progress
            progress = task_file.get_impl_progress()
            computed = compute_status_from_progress(progress)
            if computed:
                current = task_file.get_status()
                if computed != current:
                    # Validate before auto-advancing status
                    validation = validate_task_for_transition(task_file, computed)
                    if validation.has_errors:
                        for err in validation.errors:
                            print(f"[ERROR] {err}", file=sys.stderr)
                        print("[INFO] Phase updated but status not auto-advanced due to errors.")
                    elif validation.has_warnings and not force:
                        for warn in validation.warnings:
                            print(f"[WARN] {warn}", file=sys.stderr)
                        print(
                            "[INFO] Phase updated but status not auto-advanced. "
                            "Use --force to bypass."
                        )
                    else:
                        if validation.has_warnings:
                            for warn in validation.warnings:
                                print(f"[INFO] (bypassed) {warn}")
                        task_file.update_status(computed)
                        print(
                            f"[INFO] Auto-computed status: '{current.value}' -> '{computed.value}'"
                        )

            self.cmd_refresh()
            return 0

        # Direct stage mode
        if not stage:
            print("[ERROR] Usage: tasks update <WBS> <stage>", file=sys.stderr)
            return 1

        new_status = TaskStatus.from_alias(stage)
        if not new_status:
            print(f"[ERROR] Invalid stage: '{stage}'", file=sys.stderr)
            print(f"Valid stages: {', '.join(self.VALID_STAGES)}", file=sys.stderr)
            return 1

        # Run tiered validation
        validation = validate_task_for_transition(task_file, new_status)

        if validation.has_errors:
            for err in validation.errors:
                print(f"[ERROR] {err}", file=sys.stderr)
            return 1

        if validation.has_warnings and not force:
            for warn in validation.warnings:
                print(f"[WARN] {warn}", file=sys.stderr)
            print("[INFO] Use --force to bypass warnings.", file=sys.stderr)
            return 1

        if validation.has_warnings and force:
            for warn in validation.warnings:
                print(f"[INFO] (bypassed) {warn}")

        for suggestion in validation.suggestions:
            print(f"[SUGGESTION] {suggestion}")

        task_file.update_status(new_status)
        print(f"[INFO] Updated status of {task_file.path.name} to '{new_status.value}'")

        # Sync impl_progress to match the new status
        if task_file.sync_impl_progress_to_status(new_status):
            print(f"[INFO] Synced impl_progress phases to match '{new_status.value}'")

        # Refresh kanban
        self.cmd_refresh()
        return 0

    def cmd_open(self, wbs: str) -> int:
        """Open a task file in the default editor.

        Args:
            wbs: WBS number (can be short form like "47" or full "0047").
        """
        # Validate and normalize WBS to 4-digit
        try:
            wbs_int = self._validate_wbs(wbs)
            wbs_normalized = f"{wbs_int:04d}"
        except ValueError as e:
            print(f"[ERROR] {e}", file=sys.stderr)
            return 1

        self.config.validate()

        # Find task file across all folders
        task_file = self.config.find_task_by_wbs(wbs_normalized)
        if not task_file:
            print(f"[ERROR] No task found with WBS: {wbs_normalized}", file=sys.stderr)
            return 1
        print(f"[INFO] Opening: {task_file}")

        # Use system open command
        if sys.platform == "darwin":
            subprocess.run(["open", str(task_file)])
        elif sys.platform == "linux":  # pyright: ignore[reportUnreachableCondition]
            subprocess.run(["xdg-open", str(task_file)])
        elif sys.platform == "win32":  # pyright: ignore[reportUnreachableCondition]
            subprocess.run(["cmd", "/c", "start", "", str(task_file)])

        return 0

    def cmd_refresh(self) -> int:
        """Refresh the kanban board from task files across all configured folders."""
        print("[INFO] Refreshing kanban board...")

        self.config.validate()

        # Organize tasks by status (scan ALL folders)
        tasks_by_status: dict[str, list[str]] = {status.value: [] for status in TaskStatus}

        for folder in self.config.all_folders:
            if not folder.exists():
                continue
            for task_file in folder.glob("*.md"):
                # Skip dotfiles
                if task_file.name.startswith("."):
                    continue

                try:
                    task = TaskFile(task_file)
                    status = task.get_status()
                    name_no_ext = task.path.stem

                    # Determine checkbox state
                    checkbox = " "
                    if status == TaskStatus.WIP or status == TaskStatus.TESTING:
                        checkbox = "."
                    elif status == TaskStatus.DONE:
                        checkbox = "x"

                    entry = f"- [{checkbox}] {name_no_ext}"

                    # Show phase progress for active tasks
                    if status in (TaskStatus.WIP, TaskStatus.TESTING):
                        progress = task.get_impl_progress()
                        if progress:
                            parts = []
                            for phase, pstatus in progress.items():
                                parts.append(f"{_phase_status_indicator(pstatus)} {phase}")
                            entry += "\n  " + " ".join(parts)

                    tasks_by_status[status.value].append(entry)
                except (OSError, ValueError) as e:
                    print(f"[WARN] Skipping {task_file.name}: {e}", file=sys.stderr)

        # Write kanban file
        self._write_kanban(self.config.kanban_file, tasks_by_status)
        print("[INFO] Kanban board updated.")
        return 0

    def _write_kanban(self, path: Path, tasks_by_status: dict[str, list[str]]) -> None:
        """Write kanban file.

        Args:
            path: Path to write the kanban file.
            tasks_by_status: Dictionary mapping status to list of task entries.
        """
        content = "---\nkanban-plugin: board\n---\n\n# Kanban Board\n\n"
        content += "## Backlog\n\n" + "\n".join(tasks_by_status.get("Backlog", [])) + "\n\n"
        content += "## Todo\n\n" + "\n".join(tasks_by_status.get("Todo", [])) + "\n\n"
        content += "## WIP\n\n" + "\n".join(tasks_by_status.get("WIP", [])) + "\n\n"
        content += "## Testing\n\n" + "\n".join(tasks_by_status.get("Testing", [])) + "\n\n"
        content += "## Blocked\n\n" + "\n".join(tasks_by_status.get("Blocked", [])) + "\n\n"
        content += "## Done\n\n" + "\n".join(tasks_by_status.get("Done", [])) + "\n\n"
        path.write_text(content)

    def _write_template(self, path: Path) -> None:
        """Write template file from assets/.

        Args:
            path: Path to write the template file.
        """
        source_template = self.assets_dir / ".template.md"
        if source_template.exists():
            shutil.copy(source_template, path)
        else:
            # Fallback to hardcoded template (mirrors assets/.template.md)
            content = """---
name: {{ PROMPT_NAME }}
description: <prompt description>
status: Backlog
created_at: {{ CREATED_AT }}
updated_at: {{ UPDATED_AT }}
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## {{ WBS }}. {{ PROMPT_NAME }}

### Background

[Context and motivation - why this task exists]

### Requirements

[What needs to be done - acceptance criteria]

### Q&A

[Clarifications added during planning phase]

### Design

[Architecture/UI specs added by specialists]

### Solution

[Solution added by specialists]


### Plan

[Step-by-step implementation plan]

### Artifacts

| Type | Path | Generated By | Date |
|------|------|--------------|------|

### References

[Links to docs, related tasks, external resources]
"""
            path.write_text(content)

    def _display_with_glow(self, content: str) -> None:
        """Display content using glow if available, otherwise print directly.

        Args:
            content: Content to display.
        """
        glow_path = shutil.which("glow")
        if glow_path:
            try:
                subprocess.run(
                    [glow_path],
                    input=content,
                    text=True,
                    check=True,
                )
                return
            except subprocess.CalledProcessError:
                pass

        # Fallback: print directly
        print(content)

    def cmd_log(self, prefix: str, data: str | None = None) -> int:
        """Log event data with timestamp and prefix.

        Developer tool for testing and debugging hook events.
        Writes a single-line JSON log entry with format: timestamp prefix json_payload

        Args:
            prefix: Prefix string between timestamp and payload (e.g., "HOOK", "DEBUG")
            data: JSON string containing event payload to log

        Returns:
            0 on success, 1 on failure.
        """
        try:
            # Use self.config to get project root
            log_dir = self.config.project_root / ".claude" / "logs"
            log_file = log_dir / "hook_event.log"
            log_dir.mkdir(parents=True, exist_ok=True)

            # Rotate log if needed before writing
            rotate_log_file(log_file)

            timestamp = datetime.now().isoformat()

            # Parse and include payload if provided
            payload = None
            if data:
                try:
                    payload = json.loads(data)
                except json.JSONDecodeError:
                    # If not valid JSON, treat as string
                    payload = data

            # Build log entry as single line: timestamp prefix json_payload
            log_entry = f"{timestamp} {prefix} {json.dumps(payload) if payload else '{}'}"

            with open(log_file, "a") as f:
                f.write(log_entry + "\n")

            return 0

        except (OSError, ValueError) as e:
            print(f"[ERROR] Log failed: {e}", file=sys.stderr)
            return 1

    def cmd_check(self, wbs: str | None = None) -> int:
        """Check tasks CLI prerequisites or validate a specific task.

        Args:
            wbs: Optional WBS number to validate a single task.

        Returns:
            0 on success, 1 on failure
        """
        # Single task validation mode
        if wbs:
            try:
                wbs_int = self._validate_wbs(wbs)
                wbs_normalized = f"{wbs_int:04d}"
            except ValueError as e:
                print(f"[ERROR] {e}", file=sys.stderr)
                return 1

            self.config.validate()
            task_path = self.config.find_task_by_wbs(wbs_normalized)
            if not task_path:
                print(f"[ERROR] No task found with WBS: {wbs_normalized}", file=sys.stderr)
                return 1

            task_file = TaskFile(task_path)
            current = task_file.get_status()
            # Validate against next logical status
            next_status_map = {
                TaskStatus.BACKLOG: TaskStatus.TODO,
                TaskStatus.TODO: TaskStatus.WIP,
                TaskStatus.WIP: TaskStatus.TESTING,
                TaskStatus.TESTING: TaskStatus.DONE,
                TaskStatus.DONE: TaskStatus.DONE,
                TaskStatus.BLOCKED: TaskStatus.WIP,
            }
            target = next_status_map.get(current, TaskStatus.WIP)
            validation = validate_task_for_transition(task_file, target)

            print(f"[CHECK] {task_path.name} (status: {current.value} -> {target.value})")

            # Display impl_progress breakdown
            progress = task_file.get_impl_progress()
            if progress:
                print("\n  impl_progress:")
                for phase, phase_status in progress.items():
                    indicator = _phase_status_indicator(phase_status)
                    print(f"    {indicator} {phase}: {phase_status}")
                print()

            if validation.errors:
                for err in validation.errors:
                    print(f"  [ERROR] {err}")
            if validation.warnings:
                for warn in validation.warnings:
                    print(f"  [WARN] {warn}")
            if validation.suggestions:
                for sug in validation.suggestions:
                    print(f"  [SUGGESTION] {sug}")

            print(
                f"\n  {len(validation.errors)} errors, "
                f"{len(validation.warnings)} warnings, "
                f"{len(validation.suggestions)} suggestions"
            )
            return 1 if validation.has_errors else 0

        # System check mode (original behavior)
        issues = []

        # Check prompts directory
        if not self.config.prompts_dir.exists():
            issues.append(f"Prompts directory not found: {self.config.prompts_dir}")
        else:
            print(f"[OK] Prompts directory: {self.config.prompts_dir}")

        # Check kanban file
        if not self.config.kanban_file.exists():
            issues.append(f"Kanban file not found: {self.config.kanban_file}")
        else:
            print(f"[OK] Kanban file: {self.config.kanban_file}")

        # Check template file
        if not self.config.template_file.exists():
            issues.append(f"Template file not found: {self.config.template_file}")
        else:
            print(f"[OK] Template file: {self.config.template_file}")

        # Check glow (optional)
        glow_path = shutil.which("glow")
        if glow_path:
            print(f"[OK] Glow installed: {glow_path}")
        else:
            print("[INFO] Glow not installed (optional, install with 'brew install glow')")

        if issues:
            print("\n[ISSUES FOUND]", file=sys.stderr)
            for issue in issues:
                print(f"  - {issue}", file=sys.stderr)
            print("\nRun 'tasks init' to set up the tasks CLI.", file=sys.stderr)
            return 1

        print("\n[OK] Tasks CLI is ready.\n")

        # Validate all tasks across all folders
        next_status_map = {
            TaskStatus.BACKLOG: TaskStatus.TODO,
            TaskStatus.TODO: TaskStatus.WIP,
            TaskStatus.WIP: TaskStatus.TESTING,
            TaskStatus.TESTING: TaskStatus.DONE,
            TaskStatus.DONE: TaskStatus.DONE,
            TaskStatus.BLOCKED: TaskStatus.WIP,
        }

        total_tasks = 0
        total_errors = 0
        total_warnings = 0
        tasks_with_issues: list[str] = []

        for folder in self.config.all_folders:
            if not folder.exists():
                continue
            for tf_path in sorted(folder.glob("*.md")):
                if tf_path.name.startswith("."):
                    continue
                try:
                    tf = TaskFile(tf_path)
                    current = tf.get_status()
                    target = next_status_map.get(current, TaskStatus.WIP)
                    validation = validate_task_for_transition(tf, target)
                    total_tasks += 1

                    if validation.has_errors or validation.has_warnings:
                        tasks_with_issues.append(
                            f"  {tf_path.name} ({current.value}): "
                            f"{len(validation.errors)} errors, "
                            f"{len(validation.warnings)} warnings"
                        )
                        total_errors += len(validation.errors)
                        total_warnings += len(validation.warnings)
                except (OSError, ValueError):
                    continue

        print(
            f"[CHECK] Validated {total_tasks} tasks across {len(self.config.all_folders)} folder(s)"
        )

        if tasks_with_issues:
            print(
                f"\n  {total_errors} errors, {total_warnings} warnings in {len(tasks_with_issues)} task(s):\n"
            )
            for line in tasks_with_issues:
                print(line)
            return 1 if total_errors > 0 else 0

        print("[OK] All tasks pass validation.")
        return 0

    def cmd_config(self, subcommand: str | None = None, args: list[str] | None = None) -> int:
        """Display or modify tasks configuration.

        Args:
            subcommand: None (show), "set-active", or "add-folder".
            args: Arguments for the subcommand.

        Returns:
            0 on success, 1 on failure.
        """
        if not subcommand:
            # Show current config
            print(f"Mode: {self.config.mode}")
            print(
                f"Active folder: {self.config.active_folder.relative_to(self.config.project_root)}"
            )
            print(f"Kanban file: {self.config.kanban_file}")
            print(f"Template file: {self.config.template_file}")
            print(f"Sync dir: {self.config.sync_dir}")
            print("All folders:")
            for folder in self.config.all_folders:
                rel = folder.relative_to(self.config.project_root)
                exists = "exists" if folder.exists() else "not created"
                print(f"  - {rel} ({exists})")
            return 0

        config_path = self.config.meta_dir / TasksConfig.CONFIG_FILE
        if not config_path.exists():
            print("[ERROR] No config.jsonc found. Run 'tasks init' first.", file=sys.stderr)
            return 1

        config_data = TasksConfig._parse_jsonc(config_path)

        if subcommand == "set-active":
            if not args:
                print("[ERROR] Usage: tasks config set-active <folder>", file=sys.stderr)
                return 1
            folder = args[0]
            if folder not in config_data.get("folders", {}):
                print(
                    f"[ERROR] Folder '{folder}' not in config. Add it first with 'tasks config add-folder'.",
                    file=sys.stderr,
                )
                return 1
            config_data["active_folder"] = folder
            config_text = (
                "// Tasks CLI configuration — managed by `tasks init`\n"
                "// See: plugins/rd2/skills/tasks/SKILL.md\n"
                + json.dumps(config_data, indent=2)
                + "\n"
            )
            config_path.write_text(config_text)
            self.config._load_config()
            print(f"[INFO] Active folder set to: {folder}")
            return 0

        elif subcommand == "add-folder":
            if not args:
                print(
                    "[ERROR] Usage: tasks config add-folder <folder> [--base-counter N] [--label LABEL]",
                    file=sys.stderr,
                )
                return 1
            folder = args[0]
            base_counter = 0
            label = ""
            # Parse optional flags
            i = 1
            while i < len(args):
                if args[i] == "--base-counter" and i + 1 < len(args):
                    try:
                        base_counter = int(args[i + 1])
                    except ValueError:
                        print(f"[ERROR] Invalid base-counter: {args[i + 1]}", file=sys.stderr)
                        return 1
                    i += 2
                elif args[i] == "--label" and i + 1 < len(args):
                    label = args[i + 1]
                    i += 2
                else:
                    i += 1

            folders = config_data.setdefault("folders", {})
            folders[folder] = {"base_counter": base_counter, "label": label}
            config_text = (
                "// Tasks CLI configuration — managed by `tasks init`\n"
                "// See: plugins/rd2/skills/tasks/SKILL.md\n"
                + json.dumps(config_data, indent=2)
                + "\n"
            )
            config_path.write_text(config_text)
            # Create the folder directory
            folder_path = self.config.project_root / folder
            folder_path.mkdir(parents=True, exist_ok=True)
            self.config._load_config()
            print(f"[INFO] Added folder: {folder} (base_counter={base_counter}, label='{label}')")
            return 0

        else:
            print(f"[ERROR] Unknown config subcommand: {subcommand}", file=sys.stderr)
            print("Valid subcommands: set-active, add-folder", file=sys.stderr)
            return 1

    def cmd_decompose(
        self,
        requirement: str,
        wbs_prefix: str | None = None,
        parent: str | None = None,
        dry_run: bool = False,
    ) -> int:
        """Decompose a requirement into structured subtasks.

        This is a simplified decomposition that creates related task files.
        For complex AI-powered decomposition, consider using rd2:super-planner.

        Args:
            requirement: High-level requirement to decompose
            wbs_prefix: Deprecated. WBS numbers are auto-assigned for global uniqueness.
            parent: Parent task WBS for subtasks
            dry_run: If True, preview without creating files

        Returns:
            0 on success, 1 on failure
        """
        if not requirement:
            print("[ERROR] Please provide a requirement to decompose", file=sys.stderr)
            return 1

        self.config.validate()

        if wbs_prefix:
            print(
                "[INFO] --wbs-prefix is deprecated; "
                "WBS numbers are auto-assigned for global uniqueness."
            )

        # Analyze requirement and suggest subtasks
        subtasks = self._analyze_requirement(requirement)

        # Create task files using standard create flow
        created_wbs: list[str] = []
        for subtask in subtasks:
            bg = requirement
            if created_wbs:
                bg += f"\n\nDepends on: {created_wbs[-1]}"
            elif parent:
                bg += f"\n\nParent task: {parent}"

            if dry_run:
                print(f"[DRY RUN] Would create: {subtask['name']}")
                created_wbs.append("auto")
            else:
                wbs = self._create_single_task(
                    subtask["name"],
                    background=bg,
                    requirements=subtask["description"],
                )
                if wbs:
                    created_wbs.append(wbs)

        if dry_run:
            print(f"\n[DRY RUN] Would create {len(created_wbs)} task files")
        else:
            if created_wbs:
                self.cmd_refresh()
            print(f"\n[SUCCESS] Created {len(created_wbs)} task files: {', '.join(created_wbs)}")

        return 0

    def _analyze_requirement(self, requirement: str) -> list[dict[str, str]]:
        """Analyze requirement and suggest subtasks.

        This is a simplified pattern-based decomposition.
        For complex requirements, consider using rd2:super-planner which has
        access to AI-powered analysis.

        Args:
            requirement: The requirement to analyze

        Returns:
            List of subtask definitions
        """
        requirement_lower = requirement.lower()

        # Pattern matching for common task types
        keywords = {
            "authentication": [
                {
                    "name": "Design authentication architecture",
                    "description": "Design the overall authentication system architecture",
                },
                {
                    "name": "Implement user model and database",
                    "description": "Create user model with email/password fields",
                },
                {
                    "name": "Implement authentication service",
                    "description": "Implement login, logout, and session management",
                },
                {
                    "name": "Add authentication endpoints",
                    "description": "Create API endpoints for authentication",
                },
                {
                    "name": "Add authentication tests",
                    "description": "Write tests for authentication functionality",
                },
            ],
            "oauth": [
                {
                    "name": "Design OAuth integration architecture",
                    "description": "Design OAuth2 integration with providers",
                },
                {
                    "name": "Implement OAuth client",
                    "description": "Implement OAuth client for provider integration",
                },
                {
                    "name": "Add OAuth endpoints",
                    "description": "Create OAuth callback and redirect endpoints",
                },
                {"name": "Add OAuth tests", "description": "Write tests for OAuth functionality"},
            ],
            "api": [
                {
                    "name": "Design API structure",
                    "description": "Design RESTful API endpoints and structure",
                },
                {
                    "name": "Implement API endpoints",
                    "description": "Implement the core API endpoints",
                },
                {
                    "name": "Add input validation",
                    "description": "Add request validation and error handling",
                },
                {
                    "name": "Add API documentation",
                    "description": "Document API endpoints with OpenAPI/Swagger",
                },
                {"name": "Add API tests", "description": "Write tests for API endpoints"},
            ],
            "ui": [
                {
                    "name": "Design UI layout",
                    "description": "Design the overall UI layout and components",
                },
                {"name": "Implement UI components", "description": "Implement the UI components"},
                {
                    "name": "Add state management",
                    "description": "Add state management for UI components",
                },
                {"name": "Add UI tests", "description": "Write tests for UI components"},
            ],
            "dashboard": [
                {
                    "name": "Design dashboard layout",
                    "description": "Design dashboard layout and navigation",
                },
                {
                    "name": "Implement dashboard components",
                    "description": "Implement dashboard widgets and components",
                },
                {
                    "name": "Add data fetching",
                    "description": "Implement data fetching and state management",
                },
                {
                    "name": "Add dashboard tests",
                    "description": "Write tests for dashboard functionality",
                },
            ],
            "database": [
                {
                    "name": "Design database schema",
                    "description": "Design database schema and relationships",
                },
                {
                    "name": "Implement migrations",
                    "description": "Create database migration scripts",
                },
                {
                    "name": "Create repositories",
                    "description": "Implement repository pattern for data access",
                },
                {"name": "Add data tests", "description": "Write tests for data layer"},
            ],
        }

        # Check for keyword matches
        for keyword, subtasks in keywords.items():
            if keyword in requirement_lower:
                return subtasks

        # Default generic decomposition
        return [
            {
                "name": "Design and planning",
                "description": f"Analyze requirements and create implementation plan for: {requirement}",
            },
            {
                "name": "Implementation",
                "description": f"Implement the core functionality for: {requirement}",
            },
            {
                "name": "Testing",
                "description": f"Add tests and verify correctness for: {requirement}",
            },
        ]


def main() -> int:
    """Main entry point."""
    # First parse: get the command and global options only
    pre_parser = argparse.ArgumentParser(add_help=False)
    pre_parser.add_argument("command", nargs="?")
    pre_parser.add_argument("--data", help="JSON data for commands")
    pre_parser.add_argument("--folder", help="Override active task folder")
    pre_parser.add_argument("--wbs-prefix", help="WBS prefix for decompose")
    pre_parser.add_argument("--parent", help="Parent task WBS for decompose")
    pre_parser.add_argument("--dry-run", action="store_true", help="Preview decompose")
    pre_parser.add_argument(
        "--phase", nargs=2, metavar=("PHASE", "STATUS"), help="Update impl_progress phase"
    )
    pre_parser.add_argument("--force", action="store_true", help="Bypass validation warnings")
    pre_parser.add_argument("--background", help="Background content for create")
    pre_parser.add_argument("--requirements", help="Requirements content for create")
    pre_parser.add_argument("--from-json", help="JSON file for create/batch-create")
    pre_parser.add_argument("--from-stdin", action="store_true", help="Read JSON from stdin")
    pre_parser.add_argument("--from-agent-output", help="Extract tasks from agent output file")
    pre_parser.add_argument("--section", help="Section name to update (e.g., Design, Plan)")
    pre_parser.add_argument("--from-file", help="File path containing section content")
    pre_parser.add_argument("--append-row", help="Pipe-delimited row for Artifacts table")
    pre_args, remaining = pre_parser.parse_known_args()

    if not pre_args.command or pre_args.command == "help":
        print(TASKS_USAGE)
        return 0

    try:
        config = TasksConfig(folder=pre_args.folder)
        manager = TasksManager(config)

        # Route based on command, with custom argument handling
        if pre_args.command == "init":
            return manager.cmd_init()
        elif pre_args.command == "refresh":
            return manager.cmd_refresh()
        elif pre_args.command == "check":
            # check takes: [WBS] (optional, first remaining arg)
            check_wbs = remaining[0] if remaining else None
            return manager.cmd_check(check_wbs)
        elif pre_args.command == "batch-create":
            return manager.cmd_batch_create(
                from_json=getattr(pre_args, "from_json", None),
                from_agent_output=getattr(pre_args, "from_agent_output", None),
                from_stdin=pre_args.from_stdin,
            )
        elif pre_args.command == "config":
            # config takes: [subcommand] [args...]
            subcommand = remaining[0] if remaining else None
            config_args = remaining[1:] if len(remaining) > 1 else None
            return manager.cmd_config(subcommand, config_args)
        elif pre_args.command == "create":
            # create takes: <task name> (all remaining args joined)
            task_name = " ".join(remaining) if remaining else ""
            return manager.cmd_create(
                task_name,
                background=pre_args.background,
                requirements=pre_args.requirements,
                from_json=getattr(pre_args, "from_json", None),
                from_stdin=pre_args.from_stdin,
            )
        elif pre_args.command == "list":
            # list takes: [stage] (optional, first remaining arg)
            stage = remaining[0] if remaining else None
            return manager.cmd_list(stage)
        elif pre_args.command == "update":
            # --section mode: tasks update <WBS> --section <name> --from-file <path>
            if pre_args.section:
                if not remaining:
                    print(
                        "[ERROR] Usage: tasks update <WBS> --section <name> --from-file <path>",
                        file=sys.stderr,
                    )
                    return 1
                wbs = remaining[0]
                return manager.cmd_update(
                    wbs,
                    section=pre_args.section,
                    from_file=getattr(pre_args, "from_file", None),
                    append_row=pre_args.append_row,
                )
            # --phase mode: tasks update <WBS> --phase <phase> <status>
            if pre_args.phase:
                if not remaining:
                    print(
                        "[ERROR] Usage: tasks update <WBS> --phase <phase> <status>",
                        file=sys.stderr,
                    )
                    return 1
                wbs = remaining[0]
                return manager.cmd_update(
                    wbs,
                    phase=pre_args.phase[0],
                    phase_status=pre_args.phase[1],
                    force=pre_args.force,
                )
            # Direct mode: tasks update <WBS> <stage> [--force]
            if len(remaining) < 2:
                print("[ERROR] Usage: tasks update <WBS> <stage>", file=sys.stderr)
                return 1
            wbs, stage = remaining[0], remaining[1]
            return manager.cmd_update(wbs, stage, force=pre_args.force)
        elif pre_args.command == "open":
            # open takes: <WBS> (one positional arg)
            if not remaining:
                print("[ERROR] Usage: tasks open <WBS>", file=sys.stderr)
                return 1
            wbs = remaining[0]
            return manager.cmd_open(wbs)
        elif pre_args.command == "decompose":
            # decompose takes: <requirement> (all remaining args joined)
            requirement = " ".join(remaining) if remaining else ""
            if not requirement:
                print("[ERROR] Usage: tasks decompose <requirement>", file=sys.stderr)
                return 1
            return manager.cmd_decompose(
                requirement=requirement,
                wbs_prefix=pre_args.wbs_prefix,
                parent=pre_args.parent,
                dry_run=pre_args.dry_run,
            )
        elif pre_args.command == "log":
            # log takes: <prefix> (first remaining arg)
            if not remaining:
                print("[ERROR] Usage: tasks log <prefix>", file=sys.stderr)
                return 1
            prefix = remaining[0]
            return manager.cmd_log(prefix, pre_args.data)
        else:
            print(f"[ERROR] Unknown command: {pre_args.command}", file=sys.stderr)
            print(TASKS_USAGE, file=sys.stderr)
            return 1

    except (OSError, ValueError, RuntimeError) as e:
        print(f"[ERROR] {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
