#!/usr/bin/env python3

from __future__ import annotations

import argparse
import hashlib
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
Manages task files in docs/prompts/ with kanban board synchronization.

Usage:
    tasks <command> [arguments]
    python3 ${CLAUDE_PLUGIN_ROOT}/skills/tasks/scripts/tasks.py <command> [arguments]

Commands:
    init                     Initialize the tasks management tool
    create <task name>       Create a new task
    list [stage]             List tasks (optionally filter by stage)
    update <WBS> <stage>     Update a task's stage
    open <WBS>               Open a task file in default editor
    refresh                  Refresh the kanban board
    check                    Verify tasks CLI availability
    decompose <requirement>  Break down requirement into subtasks
    hook <operation>         Handle TodoWrite hook events
    log <prefix> [--data]    Log developer events
    sync todowrite [--data]  Sync TodoWrite items to external tasks
    sync restore             Restore TodoWrite from active tasks
    help                     Show this help message

Examples:
    tasks init
    tasks create "Implement feature X"
    tasks list wip
    tasks update 47 testing
    tasks open 0047
    tasks check
    tasks decompose "Build authentication system"
    tasks decompose "Add OAuth" --wbs-prefix 50
    tasks hook add --data '{"items": [...]}'
    tasks log DEBUG --data '{"key": "value"}'
    tasks sync todowrite --data '{"todos": [...]}'
    tasks sync restore
"""


class TaskStatus(Enum):
    """Canonical task statuses."""

    BACKLOG = "Backlog"
    TODO = "Todo"
    WIP = "WIP"
    TESTING = "Testing"
    DONE = "Done"

    @classmethod
    def from_alias(cls, alias: str) -> "TaskStatus | None":
        """Convert alias or case variation to canonical TaskStatus."""
        alias_lower = alias.lower().replace("-", "").replace("_", "").replace(" ", "")

        aliases = {
            "backlog": cls.BACKLOG,
            "todo": cls.TODO,
            "to-do": cls.TODO,
            "wip": cls.WIP,
            "inprogress": cls.WIP,
            "in-progress": cls.WIP,
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
        }

        return aliases.get(alias_lower)

    def __str__(self) -> str:
        return self.value


class TasksConfig:
    """Configuration for the tasks CLI."""

    DEFAULT_DIR = "docs/prompts"
    KANBAN_FILE = ".kanban.md"
    TEMPLATE_FILE = ".template.md"

    def __init__(self, project_root: Path | None = None):
        """Initialize configuration.

        Args:
            project_root: Project root directory. Defaults to current git root.
        """
        self.project_root = project_root or self._find_git_root()
        self.prompts_dir = self.project_root / self.DEFAULT_DIR
        self.kanban_file = self.prompts_dir / self.KANBAN_FILE
        self.template_file = self.prompts_dir / self.TEMPLATE_FILE

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
            raise RuntimeError(
                f"Kanban file not found: {self.kanban_file}. Run 'init' first."
            )


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


class StateMapper:
    """Bidirectional state mapping between TodoWrite and external tasks."""

    # TodoWrite → Tasks mapping
    TODOWRITE_TO_TASKS = {
        "pending": TaskStatus.TODO,
        "in_progress": TaskStatus.WIP,
        "completed": TaskStatus.DONE,
    }

    # Tasks → TodoWrite mapping (reverse)
    TASKS_TO_TODOWRITE = {
        TaskStatus.BACKLOG: "pending",
        TaskStatus.TODO: "pending",
        TaskStatus.WIP: "in_progress",
        TaskStatus.TESTING: "in_progress",
        TaskStatus.DONE: "completed",
    }

    @staticmethod
    def to_task_status(todowrite_state: str) -> TaskStatus:
        """Convert TodoWrite state to TaskStatus."""
        return StateMapper.TODOWRITE_TO_TASKS.get(
            todowrite_state, TaskStatus.BACKLOG
        )

    @staticmethod
    def to_todowrite_state(task_status: TaskStatus) -> str:
        """Convert TaskStatus to TodoWrite state."""
        return StateMapper.TASKS_TO_TODOWRITE.get(task_status, "pending")


class PromotionEngine:
    """Determine when TodoWrite items should be promoted to external tasks."""

    MIN_CONTENT_LENGTH = 50
    COMPLEX_KEYWORDS = [
        "implement",
        "refactor",
        "design",
        "architecture",
        "integrate",
        "migrate",
        "optimize",
        "feature",
        "build",
    ]
    TRACKING_KEYWORDS = ["wbs", "task file", "docs/prompts"]

    @staticmethod
    def should_promote(todo_item: dict[str, str]) -> tuple[bool, list[str]]:
        """
        Evaluate if a TodoWrite item should be promoted to external task.

        Uses 5-signal heuristic (OR logic):
        - Complex keywords (implement, refactor, design, etc.)
        - Long content (> 50 chars)
        - Active work (in_progress status)
        - Explicit tracking (mentions wbs, task file)
        - Multi-step detection (numbered lists)

        Args:
            todo_item: TodoWrite item dict with 'content', 'status', 'activeForm'

        Returns:
            (should_promote: bool, triggered_signals: list[str])
        """
        content = todo_item.get("content", "")
        status = todo_item.get("status", "")

        triggered_signals = []

        # Signal 1: Complex keywords
        for keyword in PromotionEngine.COMPLEX_KEYWORDS:
            if keyword.lower() in content.lower():
                triggered_signals.append(f"complex_keyword:{keyword}")
                break

        # Signal 2: Long content
        if len(content) > PromotionEngine.MIN_CONTENT_LENGTH:
            triggered_signals.append("long_content")

        # Signal 3: Active work
        if status == "in_progress":
            triggered_signals.append("active_work")

        # Signal 4: Explicit tracking
        for keyword in PromotionEngine.TRACKING_KEYWORDS:
            if keyword.lower() in content.lower():
                triggered_signals.append(f"explicit_tracking:{keyword}")
                break

        # Signal 5: Multi-step detection
        if re.search(r"\d+\.|\-\s", content):  # Matches "1." or "- "
            triggered_signals.append("multi_step")

        return (len(triggered_signals) > 0, triggered_signals)


class SyncOrchestrator:
    """Orchestrates bidirectional sync between TodoWrite and external tasks."""

    def __init__(self, config: TasksConfig):
        self.config = config
        self.state_mapper = StateMapper()
        # Session data (mapping, logs) goes to docs/tasks_sync/
        self.sync_data_dir = config.project_root / "docs/tasks_sync"
        # Configuration stays in .claude/tasks_sync/
        self.sync_config_dir = config.project_root / ".claude/tasks_sync"
        self.session_map_file = self.sync_data_dir / "session_map.json"
        self.promotions_log = self.sync_data_dir / "promotions.log"
        self.config_file = self.sync_config_dir / "config.json"
        self.session_map: dict[str, str] = self._load_session_map()

    def _load_session_map(self) -> dict[str, str]:
        """Load TodoWrite → WBS mapping from disk."""
        if self.session_map_file.exists():
            try:
                data = json.loads(self.session_map_file.read_text())
                return data if isinstance(data, dict) else {}
            except json.JSONDecodeError:
                return {}
        return {}

    def _save_session_map(self) -> None:
        """Persist TodoWrite → WBS mapping to disk."""
        self.session_map_file.parent.mkdir(parents=True, exist_ok=True)
        self.session_map_file.write_text(json.dumps(self.session_map, indent=2))

    def _log_promotion(
        self, todo_item: dict[str, str], wbs: str, signals: list[str]
    ) -> None:
        """Log task promotion event."""
        self.promotions_log.parent.mkdir(parents=True, exist_ok=True)

        # Rotate log if needed before writing
        rotate_log_file(self.promotions_log)

        timestamp = datetime.now().isoformat()
        log_entry = {
            "timestamp": timestamp,
            "wbs": wbs,
            "content": todo_item["content"][:100],  # Truncate for readability
            "signals": signals,
            "reason": signals[0] if signals else "unknown",
        }

        with open(self.promotions_log, "a") as f:
            f.write(json.dumps(log_entry) + "\n")

    def process_todowrite_items(self, todo_items: list[dict[str, str]]) -> None:
        """
        Process TodoWrite items for auto-promotion and sync.

        Args:
            todo_items: List of TodoWrite items from PreToolUse hook
        """
        for item in todo_items:
            content = item.get("content", "")
            if not content:
                continue

            # Generate stable hash for TodoWrite item
            item_hash = hashlib.md5(content.encode()).hexdigest()[:8]

            # Check if already promoted
            if item_hash in self.session_map:
                wbs = self.session_map[item_hash]
                # Update existing external task
                self._sync_to_external_task(wbs, item)
            else:
                # Check promotion criteria
                should_promote, signals = PromotionEngine.should_promote(item)
                if should_promote:
                    # Create new external task
                    new_wbs = self._create_external_task(item)
                    if new_wbs:
                        self.session_map[item_hash] = new_wbs
                        self._log_promotion(item, new_wbs, signals)
                        print(
                            f"[INFO] Promoted TodoWrite item to task {new_wbs}: {content[:50]}..."
                        )

        # Save updated session map
        self._save_session_map()

    def _create_external_task(self, todo_item: dict[str, str]) -> str | None:
        """Create external task file from TodoWrite item."""
        try:
            # Use TasksManager to create task
            manager = TasksManager(self.config)
            task_name = todo_item["content"][:100]  # Truncate to reasonable length

            # Create task
            manager.cmd_create(task_name)

            # Get the latest task (just created)
            task_files = sorted(
                [
                    f
                    for f in self.config.prompts_dir.glob("*.md")
                    if not f.name.startswith(".")
                ],
                key=lambda f: f.stat().st_mtime,
            )

            if task_files:
                latest_task = TaskFile(task_files[-1])
                wbs = latest_task.wbs

                # Update status based on TodoWrite state
                task_status = self.state_mapper.to_task_status(
                    todo_item.get("status", "pending")
                )
                latest_task.update_status(task_status)

                return wbs

        except (OSError, ValueError) as e:
            print(
                f"[ERROR] Failed to create external task: {e}", file=sys.stderr
            )

        return None

    def _sync_to_external_task(self, wbs: str, todo_item: dict[str, str]) -> None:
        """Update external task status based on TodoWrite state."""
        try:
            task_status = self.state_mapper.to_task_status(
                todo_item.get("status", "pending")
            )
            manager = TasksManager(self.config)
            manager.cmd_update(wbs, task_status.value.lower())
        except (OSError, ValueError) as e:
            print(f"[WARN] Failed to sync to task {wbs}: {e}", file=sys.stderr)

    def restore_from_tasks(self) -> list[dict[str, str]]:
        """
        Generate TodoWrite items from active external tasks.

        Returns:
            List of TodoWrite-compatible todo items
        """
        todos = []

        for task_file in self.config.prompts_dir.glob("*.md"):
            if task_file.name.startswith("."):
                continue

            try:
                task = TaskFile(task_file)
                status = task.get_status()

                # Only restore active work
                if status in [TaskStatus.WIP, TaskStatus.TESTING]:
                    todowrite_state = self.state_mapper.to_todowrite_state(status)

                    content = f"Continue {task.name} (WBS {task.wbs})"
                    todos.append(
                        {
                            "content": content,
                            "status": todowrite_state,
                            "activeForm": f"Continuing {task.name}",
                        }
                    )

                    # Add to session map
                    item_hash = hashlib.md5(content.encode()).hexdigest()[:8]
                    self.session_map[item_hash] = task.wbs

            except (OSError, ValueError) as e:
                print(f"[WARN] Failed to restore from {task_file.name}: {e}", file=sys.stderr)

        # Save regenerated session map
        if todos:
            self._save_session_map()

        return todos


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
        """Initialize the tasks management tool."""
        print("[INFO] Initializing tasks management tool...")

        # Create prompts directory
        if not self.config.prompts_dir.exists():
            self.config.prompts_dir.mkdir(parents=True)
            print(f"[INFO] Created directory: {self.config.prompts_dir}")
        else:
            print(f"[INFO] Directory already exists: {self.config.prompts_dir}")

        # Create kanban file from assets/
        if not self.config.kanban_file.exists():
            source_kanban = self.assets_dir / ".kanban.md"
            if source_kanban.exists():
                shutil.copy(source_kanban, self.config.kanban_file)
                print(f"[INFO] Created kanban board: {self.config.kanban_file}")
            else:
                # Fallback to creating empty kanban
                self._write_kanban(
                    self.config.kanban_file,
                    {status: [] for status in self.VALID_STAGES},
                )
                print(f"[INFO] Created kanban board: {self.config.kanban_file}")
        else:
            print(f"[INFO] Kanban board already exists: {self.config.kanban_file}")

        # Create template file from assets/
        if not self.config.template_file.exists():
            source_template = self.assets_dir / ".template.md"
            if source_template.exists():
                shutil.copy(source_template, self.config.template_file)
                print(f"[INFO] Created template file: {self.config.template_file}")
            else:
                # Fallback to creating default template
                self._write_template(self.config.template_file)
                print(f"[INFO] Created template file: {self.config.template_file}")
        else:
            print(f"[INFO] Template file already exists: {self.config.template_file}")

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

    def cmd_create(self, task_name: str) -> int:
        """Create a new task.

        Args:
            task_name: Name for the new task.
        """
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

        # Find next WBS number
        existing_tasks = list(self.config.prompts_dir.glob("*.md"))
        existing_tasks = [t for t in existing_tasks if not t.name.startswith(".")]
        next_seq = len(existing_tasks) + 1
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
            content = self.config.template_file.read_text()
            now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            content = content.replace("{ { PROMPT_NAME } }", task_name)
            content = content.replace("{{PROMPT_NAME}}", task_name)
            content = content.replace("{ { WBS } }", wbs)
            content = content.replace("{{WBS}}", wbs)
            content = content.replace("{ { CREATED_AT } }", now)
            content = content.replace("{{CREATED_AT}}", now)
            content = content.replace("{ { UPDATED_AT } }", now)
            content = content.replace("{{UPDATED_AT}}", now)
            content = content.replace("<prompt description>", f"Task: {task_name}")

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

    def cmd_update(self, wbs: str, stage: str) -> int:
        """Update a task's stage.

        Args:
            wbs: WBS number (can be short form like "47" or full "0047").
            stage: New stage for the task.
        """
        # Validate and normalize WBS to 4-digit
        try:
            wbs_int = self._validate_wbs(wbs)
            wbs_normalized = f"{wbs_int:04d}"
        except ValueError as e:
            print(f"[ERROR] {e}", file=sys.stderr)
            return 1

        # Normalize stage
        new_status = TaskStatus.from_alias(stage)
        if not new_status:
            print(f"[ERROR] Invalid stage: '{stage}'", file=sys.stderr)
            print(f"Valid stages: {', '.join(self.VALID_STAGES)}", file=sys.stderr)
            return 1

        self.config.validate()

        # Find task file
        task_files = list(self.config.prompts_dir.glob(f"{wbs_normalized}_*.md"))
        if not task_files:
            print(f"[ERROR] No task found with WBS: {wbs_normalized}", file=sys.stderr)
            return 1

        if len(task_files) > 1:
            print(
                f"[ERROR] Multiple files found for WBS: {wbs_normalized}",
                file=sys.stderr,
            )
            return 1

        task_file = TaskFile(task_files[0])
        task_file.update_status(new_status)

        print(f"[INFO] Updated status of {task_file.path.name} to '{new_status.value}'")

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

        # Find task file
        task_files = list(self.config.prompts_dir.glob(f"{wbs_normalized}_*.md"))
        if not task_files:
            print(f"[ERROR] No task found with WBS: {wbs_normalized}", file=sys.stderr)
            return 1

        if len(task_files) > 1:
            print(
                f"[ERROR] Multiple files found for WBS: {wbs_normalized}",
                file=sys.stderr,
            )
            return 1

        task_file = task_files[0]
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
        """Refresh the kanban board from task files."""
        print("[INFO] Refreshing kanban board...")

        self.config.validate()

        # Organize tasks by status
        tasks_by_status: dict[str, list[str]] = {
            status.value: [] for status in TaskStatus
        }

        for task_file in self.config.prompts_dir.glob("*.md"):
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

                tasks_by_status[status.value].append(f"- [{checkbox}] {name_no_ext}")
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
        content += (
            "## Backlog\n\n" + "\n".join(tasks_by_status.get("Backlog", [])) + "\n\n"
        )
        content += "## Todo\n\n" + "\n".join(tasks_by_status.get("Todo", [])) + "\n\n"
        content += "## WIP\n\n" + "\n".join(tasks_by_status.get("WIP", [])) + "\n\n"
        content += (
            "## Testing\n\n" + "\n".join(tasks_by_status.get("Testing", [])) + "\n\n"
        )
        content += "## Done\n\n" + "\n".join(tasks_by_status.get("Done", [])) + "\n\n"
        path.write_text(content)

    def _write_template(self, path: Path) -> None:
        """Write template file from assets/.

        Args:
            path: Path to write the template file.
        """
        source_template = self.assets_dir / ".template.md"
        if source_template.exists():
            import shutil

            shutil.copy(source_template, path)
        else:
            # Fallback to hardcoded template
            content = """---
name: { { PROMPT_NAME } }
description: <prompt description>
status: Backlog
created_at: { { CREATED_AT } }
updated_at: { { UPDATED_AT } }
---

## { { WBS } }. { { PROMPT_NAME } }

### Background

### Requirements / Objectives

### Solutions / Goals

### References
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

    def cmd_hook(self, operation: str, data: str | None = None) -> int:
        """Handle TodoWrite PreToolUse hook events.

        Called by Claude Code hooks to log TodoWrite operations for synchronization
        with external task files.

        Args:
            operation: The TodoWrite operation (add/update/remove).
            data: JSON string containing tool_input data with items list.

        Returns:
            0 on success, 1 on failure.
        """
        try:
            # Parse and validate the input data if provided
            items = []
            if data:
                try:
                    hook_data = json.loads(data)
                    # Validate JSON structure
                    if not isinstance(hook_data, dict):
                        print(
                            "[ERROR] Invalid hook data: not a JSON object",
                            file=sys.stderr,
                        )
                        return 1
                    tool_input = hook_data.get("tool_input", {})
                    if not isinstance(tool_input, dict):
                        print(
                            "[ERROR] Invalid tool_input: not a JSON object",
                            file=sys.stderr,
                        )
                        return 1
                    items = tool_input.get("items", [])
                    if not isinstance(items, list):
                        print(
                            "[ERROR] Invalid items: not a JSON array", file=sys.stderr
                        )
                        return 1
                except json.JSONDecodeError as e:
                    print(f"[ERROR] Invalid JSON data: {e}", file=sys.stderr)
                    return 1

            # Log to project-local .claude directory (project-specific logs)
            log_file = self.config.project_root / ".claude" / "tasks_hook.log"
            log_file.parent.mkdir(parents=True, exist_ok=True)

            # Rotate log if needed before writing
            rotate_log_file(log_file)

            timestamp = datetime.now().isoformat()
            log_entry = {
                "timestamp": timestamp,
                "operation": operation,
                "item_count": len(items),
                "items": items[:3] if items else [],  # Log first 3 items
            }

            with open(log_file, "a") as f:
                f.write(json.dumps(log_entry) + "\n")

            # Optional: Auto-sync with task files based on operation
            # This can be extended to automatically create/update task files
            if operation == "add" and items:
                # Check if we should auto-create task files for new todos
                # For now, just log - auto-creation can be configured later
                pass

            return 0

        except (OSError, ValueError) as e:
            print(f"[ERROR] Hook failed: {e}", file=sys.stderr)
            return 1

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
            log_entry = (
                f"{timestamp} {prefix} {json.dumps(payload) if payload else '{}'}"
            )

            with open(log_file, "a") as f:
                f.write(log_entry + "\n")

            return 0

        except (OSError, ValueError) as e:
            print(f"[ERROR] Log failed: {e}", file=sys.stderr)
            return 1

    def cmd_sync_todowrite(self, data: str | None = None) -> int:
        """Sync TodoWrite items to external task files.

        Called by PreToolUse hook for TodoWrite events. Evaluates promotion
        criteria and creates/updates external tasks as needed.

        Args:
            data: JSON string from ${TOOL_INPUT} containing todos array

        Returns:
            0 on success, 1 on failure

        Example hook data:
        {
          "todos": [
            {
              "content": "Implement OAuth2 authentication",
              "status": "in_progress",
              "activeForm": "Implementing OAuth2 authentication"
            }
          ]
        }
        """
        try:
            # Parse hook data
            hook_data = json.loads(data) if data else {}
            todos = hook_data.get("todos", [])

            if not todos:
                print("[INFO] No todos to sync", file=sys.stderr)
                return 0

            # Use SyncOrchestrator to process items
            orchestrator = SyncOrchestrator(self.config)
            orchestrator.process_todowrite_items(todos)

            return 0

        except json.JSONDecodeError as e:
            print(f"[ERROR] Invalid JSON data: {e}", file=sys.stderr)
            return 1
        except (OSError, ValueError) as e:
            print(f"[ERROR] Sync failed: {e}", file=sys.stderr)
            return 1

    def cmd_sync_restore(self) -> int:
        """Restore TodoWrite items from active external tasks.

        Use case: Session resume or user asks "What was I working on?"

        Generates TodoWrite-compatible items from WIP/Testing tasks and prints
        them as JSON to stdout.

        Returns:
            0 on success, 1 on failure
        """
        try:
            self.config.validate()

            # Use SyncOrchestrator to restore items
            orchestrator = SyncOrchestrator(self.config)
            active_items = orchestrator.restore_from_tasks()

            if not active_items:
                print("[INFO] No active tasks to restore")
                return 0

            # Print TodoWrite items as JSON
            print(json.dumps(active_items, indent=2))

            return 0

        except (OSError, ValueError) as e:
            print(f"[ERROR] Session restore failed: {e}", file=sys.stderr)
            return 1

    def cmd_check(self) -> int:
        """Check if tasks CLI prerequisites are met.

        Returns:
            0 on success, 1 on failure
        """
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

        print("\n[SUCCESS] Tasks CLI is ready.")
        return 0

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
            wbs_prefix: WBS prefix to use (default: auto-generated)
            parent: Parent task WBS for subtasks
            dry_run: If True, preview without creating files

        Returns:
            0 on success, 1 on failure
        """
        if not requirement:
            print("[ERROR] Please provide a requirement to decompose", file=sys.stderr)
            return 1

        self.config.validate()

        # Determine starting WBS
        if wbs_prefix:
            try:
                start_wbs = int(wbs_prefix)
            except ValueError:
                print(f"[ERROR] Invalid WBS prefix: {wbs_prefix}", file=sys.stderr)
                return 1
        else:
            # Find next available WBS
            existing_tasks = list(self.config.prompts_dir.glob("*.md"))
            existing_tasks = [t for t in existing_tasks if not t.name.startswith(".")]
            if existing_tasks:
                max_wbs = 0
                for task in existing_tasks:
                    match = re.match(r"^(\d{4})", task.name)
                    if match:
                        max_wbs = max(max_wbs, int(match.group(1)))
                start_wbs = max_wbs + 1
            else:
                start_wbs = 1

        # Analyze requirement and suggest subtasks
        subtasks = self._analyze_requirement(requirement)

        # Create task files
        created_files = []
        for idx, subtask in enumerate(subtasks, start_wbs):
            wbs = f"{idx:04d}"
            safe_name = subtask["name"].lower().replace(" ", "_").replace("/", "_")
            filename = f"{wbs}_{safe_name}.md"
            filepath = self.config.prompts_dir / filename

            # Build enhanced task file content
            now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            content = f"""---
name: {subtask['name']}
description: {subtask['description']}
status: Backlog
created_at: {now}
updated_at: {now}
wbs: {wbs}
"""

            # Add dependencies if specified
            if idx > start_wbs:
                content += f"dependencies: ['{idx-1:04d}']\n"
            elif parent:
                content += f"parent: {parent}\n"

            content += f"""---

## {wbs}. {subtask['name']}

### Background

{requirement}

### Requirements / Objectives

{subtask['description']}

#### Q&A

[Clarifications from user, decisions made during implementation]

### Solutions / Goals

[Technical approach, architecture decisions]

#### Plan

[Step-by-step implementation plan]

### References

[Documentation links, code examples, similar implementations]
"""

            if dry_run:
                print(f"[DRY RUN] Would create: {filepath}")
                created_files.append(filepath)
            else:
                filepath.write_text(content)
                print(f"[INFO] Created: {filepath}")
                created_files.append(filepath)

        if dry_run:
            print(f"\n[DRY RUN] Would create {len(created_files)} task files")
        else:
            print(f"\n[SUCCESS] Created {len(created_files)} task files")
            self.cmd_refresh()

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
                {"name": "Design authentication architecture", "description": "Design the overall authentication system architecture"},
                {"name": "Implement user model and database", "description": "Create user model with email/password fields"},
                {"name": "Implement authentication service", "description": "Implement login, logout, and session management"},
                {"name": "Add authentication endpoints", "description": "Create API endpoints for authentication"},
                {"name": "Add authentication tests", "description": "Write tests for authentication functionality"},
            ],
            "oauth": [
                {"name": "Design OAuth integration architecture", "description": "Design OAuth2 integration with providers"},
                {"name": "Implement OAuth client", "description": "Implement OAuth client for provider integration"},
                {"name": "Add OAuth endpoints", "description": "Create OAuth callback and redirect endpoints"},
                {"name": "Add OAuth tests", "description": "Write tests for OAuth functionality"},
            ],
            "api": [
                {"name": "Design API structure", "description": "Design RESTful API endpoints and structure"},
                {"name": "Implement API endpoints", "description": "Implement the core API endpoints"},
                {"name": "Add input validation", "description": "Add request validation and error handling"},
                {"name": "Add API documentation", "description": "Document API endpoints with OpenAPI/Swagger"},
                {"name": "Add API tests", "description": "Write tests for API endpoints"},
            ],
            "ui": [
                {"name": "Design UI layout", "description": "Design the overall UI layout and components"},
                {"name": "Implement UI components", "description": "Implement the UI components"},
                {"name": "Add state management", "description": "Add state management for UI components"},
                {"name": "Add UI tests", "description": "Write tests for UI components"},
            ],
            "dashboard": [
                {"name": "Design dashboard layout", "description": "Design dashboard layout and navigation"},
                {"name": "Implement dashboard components", "description": "Implement dashboard widgets and components"},
                {"name": "Add data fetching", "description": "Implement data fetching and state management"},
                {"name": "Add dashboard tests", "description": "Write tests for dashboard functionality"},
            ],
            "database": [
                {"name": "Design database schema", "description": "Design database schema and relationships"},
                {"name": "Implement migrations", "description": "Create database migration scripts"},
                {"name": "Create repositories", "description": "Implement repository pattern for data access"},
                {"name": "Add data tests", "description": "Write tests for data layer"},
            ],
        }

        # Check for keyword matches
        for keyword, subtasks in keywords.items():
            if keyword in requirement_lower:
                return subtasks

        # Default generic decomposition
        return [
            {"name": "Design and planning", "description": f"Analyze requirements and create implementation plan for: {requirement}"},
            {"name": "Implementation", "description": f"Implement the core functionality for: {requirement}"},
            {"name": "Testing", "description": f"Add tests and verify correctness for: {requirement}"},
        ]


def main() -> int:
    """Main entry point."""
    # First parse: get the command and global options only
    pre_parser = argparse.ArgumentParser(add_help=False)
    pre_parser.add_argument("command", nargs="?")
    pre_parser.add_argument("--data", help="JSON data for commands")
    pre_parser.add_argument("--wbs-prefix", help="WBS prefix for decompose")
    pre_parser.add_argument("--parent", help="Parent task WBS for decompose")
    pre_parser.add_argument("--dry-run", action="store_true", help="Preview decompose")
    pre_args, remaining = pre_parser.parse_known_args()

    if not pre_args.command or pre_args.command == "help":
        print(TASKS_USAGE)
        return 0

    try:
        manager = TasksManager()

        # Route based on command, with custom argument handling
        if pre_args.command == "init":
            return manager.cmd_init()
        elif pre_args.command == "refresh":
            return manager.cmd_refresh()
        elif pre_args.command == "check":
            return manager.cmd_check()
        elif pre_args.command == "create":
            # create takes: <task name> (all remaining args joined)
            task_name = " ".join(remaining) if remaining else ""
            return manager.cmd_create(task_name)
        elif pre_args.command == "list":
            # list takes: [stage] (optional, first remaining arg)
            stage = remaining[0] if remaining else None
            return manager.cmd_list(stage)
        elif pre_args.command == "update":
            # update takes: <WBS> <stage> (two positional args)
            if len(remaining) < 2:
                print("[ERROR] Usage: tasks update <WBS> <stage>", file=sys.stderr)
                return 1
            wbs, stage = remaining[0], remaining[1]
            return manager.cmd_update(wbs, stage)
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
        elif pre_args.command == "hook":
            # hook takes: <operation> (first remaining arg)
            if not remaining:
                print("[ERROR] Usage: tasks hook <operation>", file=sys.stderr)
                return 1
            operation = remaining[0]
            return manager.cmd_hook(operation, pre_args.data)
        elif pre_args.command == "log":
            # log takes: <prefix> (first remaining arg)
            if not remaining:
                print("[ERROR] Usage: tasks log <prefix>", file=sys.stderr)
                return 1
            prefix = remaining[0]
            return manager.cmd_log(prefix, pre_args.data)
        elif pre_args.command == "sync":
            # sync takes: <subcommand> (first remaining arg)
            if not remaining:
                print("[ERROR] Usage: tasks sync <todowrite|restore>", file=sys.stderr)
                return 1
            subcommand = remaining[0]
            if subcommand == "todowrite":
                return manager.cmd_sync_todowrite(pre_args.data)
            elif subcommand == "restore":
                return manager.cmd_sync_restore()
            else:
                print(f"[ERROR] Unknown sync subcommand: {subcommand}", file=sys.stderr)
                print("Valid subcommands: todowrite, restore", file=sys.stderr)
                return 1
        else:
            print(f"[ERROR] Unknown command: {pre_args.command}", file=sys.stderr)
            print(TASKS_USAGE, file=sys.stderr)
            return 1

    except (OSError, ValueError, RuntimeError) as e:
        print(f"[ERROR] {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
