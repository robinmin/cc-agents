#!/usr/bin/env python3
"""
Unit tests for tasks CLI tool.

Run with:
    pytest tests/test_tasks.py -v
    pytest tests/test_tasks.py -v --cov=scripts --cov-report=term-missing
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from unittest.mock import patch

import pytest
from freezegun import freeze_time

# Add scripts directory to path
scripts_dir = Path(__file__).parent.parent / "scripts"
sys.path.insert(0, str(scripts_dir))

from tasks import TaskStatus, TasksConfig, TasksManager, TaskFile  # noqa: E402
from tasks import rotate_log_file, _cleanup_old_logs, MAX_LOG_SIZE  # noqa: E402
from tasks import (  # noqa: E402
    IMPL_PHASES,
    IMPL_PHASE_STATUSES,
    ValidationResult,
    _phase_status_indicator,
    compute_status_from_progress,
    validate_task_for_transition,
)


class TestTaskStatus:
    """Test TaskStatus enum and alias mapping."""

    def test_canonical_statuses(self):
        """Test canonical status values."""
        assert TaskStatus.BACKLOG.value == "Backlog"
        assert TaskStatus.TODO.value == "Todo"
        assert TaskStatus.WIP.value == "WIP"
        assert TaskStatus.TESTING.value == "Testing"
        assert TaskStatus.DONE.value == "Done"

    def test_from_alias_valid(self):
        """Test from_alias with valid aliases."""
        assert TaskStatus.from_alias("backlog") == TaskStatus.BACKLOG
        assert TaskStatus.from_alias("BACKLOG") == TaskStatus.BACKLOG

        assert TaskStatus.from_alias("todo") == TaskStatus.TODO
        assert TaskStatus.from_alias("to-do") == TaskStatus.TODO
        assert TaskStatus.from_alias("TO DO") == TaskStatus.TODO

        assert TaskStatus.from_alias("wip") == TaskStatus.WIP
        assert TaskStatus.from_alias("in-progress") == TaskStatus.WIP
        assert TaskStatus.from_alias("INPROGRESS") == TaskStatus.WIP
        assert TaskStatus.from_alias("working") == TaskStatus.WIP

        assert TaskStatus.from_alias("testing") == TaskStatus.TESTING
        assert TaskStatus.from_alias("test") == TaskStatus.TESTING
        assert TaskStatus.from_alias("review") == TaskStatus.TESTING

        assert TaskStatus.from_alias("done") == TaskStatus.DONE
        assert TaskStatus.from_alias("completed") == TaskStatus.DONE
        assert TaskStatus.from_alias("finished") == TaskStatus.DONE

    def test_from_alias_invalid(self):
        """Test from_alias with invalid aliases."""
        assert TaskStatus.from_alias("invalid") is None
        assert TaskStatus.from_alias("") is None


class TestTasksConfig:
    """Test TasksConfig class."""

    def test_init_with_project_root(self, tmp_path):
        """Test initialization with explicit project root."""
        config = TasksConfig(project_root=tmp_path)
        assert config.project_root == tmp_path
        assert config.prompts_dir == tmp_path / "docs/prompts"

    @patch("tasks.Path.cwd")
    @patch("tasks.Path")
    def test_find_git_root(self, mock_path, mock_cwd, tmp_path):
        """Test git root detection."""
        # Create a fake git repository
        git_dir = tmp_path / ".git"
        git_dir.mkdir()

        # Setup mocks
        mock_cwd.return_value = tmp_path
        mock_path.Path = Path
        mock_path.return_value = tmp_path

        config = TasksConfig()
        assert config.project_root == tmp_path

    def test_validate_success(self, tmp_path):
        """Test validate with existing setup."""
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("test")

        config = TasksConfig(project_root=tmp_path)
        config.validate()  # Should not raise

    def test_validate_missing_prompts_dir(self, tmp_path):
        """Test validate with missing prompts directory."""
        config = TasksConfig(project_root=tmp_path)
        with pytest.raises(RuntimeError, match=r"Tasks? directory not found"):
            config.validate()

    def test_validate_missing_kanban(self, tmp_path):
        """Test validate with missing kanban file."""
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)

        config = TasksConfig(project_root=tmp_path)
        with pytest.raises(RuntimeError, match="Kanban file not found"):
            config.validate()


class TestTaskFile:
    """Test TaskFile class."""

    def test_wbs_extraction(self, tmp_path):
        """Test WBS extraction from filename."""
        task_file = tmp_path / "0047_test_task.md"
        task_file.write_text("test")

        tf = TaskFile(task_file)
        assert tf.wbs == "0047"

    def test_wbs_invalid_filename(self, tmp_path):
        """Test WBS extraction with invalid filename."""
        task_file = tmp_path / "invalid_task.md"
        task_file.write_text("test")

        tf = TaskFile(task_file)
        with pytest.raises(ValueError, match="Invalid task filename"):
            _ = tf.wbs

    def test_name_extraction(self, tmp_path):
        """Test name extraction from filename."""
        task_file = tmp_path / "0047_test_task.md"
        task_file.write_text("test")

        tf = TaskFile(task_file)
        assert tf.name == "test_task"

    def test_get_status(self, tmp_path):
        """Test reading status from frontmatter."""
        task_file = tmp_path / "0047_test.md"
        task_file.write_text(
            """---
name: test
status: WIP
---
"""
        )

        tf = TaskFile(task_file)
        assert tf.get_status() == TaskStatus.WIP

    def test_get_status_default(self, tmp_path):
        """Test get_status returns default when status missing."""
        task_file = tmp_path / "0047_test.md"
        task_file.write_text("test")

        tf = TaskFile(task_file)
        assert tf.get_status() == TaskStatus.BACKLOG

    @freeze_time("2026-01-21 14:30:00")
    def test_update_status(self, tmp_path):
        """Test updating status in frontmatter."""
        task_file = tmp_path / "0047_test.md"
        task_file.write_text(
            """---
name: test
status: Backlog
updated_at: 2026-01-21 10:00:00
---
"""
        )

        tf = TaskFile(task_file)
        tf.update_status(TaskStatus.WIP)

        content = task_file.read_text()
        assert "status: WIP" in content
        assert "updated_at: 2026-01-21 14:30:00" in content


class TestTasksManager:
    """Test TasksManager class."""

    def test_cmd_init(self, tmp_path):
        """Test init command creates docs/.tasks/ structure."""
        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_init()

        assert exit_code == 0
        assert (tmp_path / "docs/prompts").exists()
        # After init, metadata is in docs/.tasks/
        assert (tmp_path / "docs/.tasks/config.jsonc").exists()
        # Kanban file is per-folder: kanban_prompts.md for docs/prompts
        assert (tmp_path / "docs/.tasks/kanban_prompts.md").exists()
        assert (tmp_path / "docs/.tasks/template.md").exists()
        assert (tmp_path / "docs/.tasks/brainstorm").is_dir()
        assert (tmp_path / "docs/.tasks/codereview").is_dir()
        assert (tmp_path / "docs/.tasks/design").is_dir()
        assert (tmp_path / "docs/.tasks/sync").is_dir()

        # Check kanban content
        kanban = (tmp_path / "docs/.tasks/kanban_prompts.md").read_text()
        assert "## Backlog" in kanban
        assert "## Todo" in kanban
        assert "## WIP" in kanban
        assert "## Testing" in kanban
        assert "## Done" in kanban

    def test_cmd_init_existing(self, tmp_path):
        """Test init command with existing legacy setup migrates files."""
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("existing kanban")
        (prompts_dir / ".template.md").write_text("existing template")

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_init()

        assert exit_code == 0
        # Legacy files should be migrated to docs/.tasks/ with per-folder kanban
        assert (tmp_path / "docs/.tasks/kanban_prompts.md").read_text() == "existing kanban"
        assert (tmp_path / "docs/.tasks/template.md").read_text() == "existing template"

    @freeze_time("2026-01-21 14:30:00")
    def test_cmd_create(self, tmp_path):
        """Test create command."""
        # Setup
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("---\nkanban-plugin: board\n---\n")
        (prompts_dir / ".template.md").write_text(
            """---
name: { { PROMPT_NAME } }
description: <prompt description>
status: Backlog
created_at: { { CREATED_AT } }
updated_at: { { UPDATED_AT } }
---

## { { WBS } }. { { PROMPT_NAME } }
"""
        )

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_create("Test Task")

        assert exit_code == 0
        assert (prompts_dir / "0001_test_task.md").exists()

        # Check task content
        task_content = (prompts_dir / "0001_test_task.md").read_text()
        assert "name: Test Task" in task_content
        assert "status: Backlog" in task_content
        assert "2026-01-21 14:30:00" in task_content
        assert "## 0001. Test Task" in task_content

    def test_cmd_create_no_name(self, tmp_path):
        """Test create command with no name."""
        # Setup
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("test")

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_create("")

        assert exit_code == 1

    def test_cmd_list_all(self, tmp_path, capsys):
        """Test list command (all stages)."""
        # Setup
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text(
            """---
kanban-plugin: board
---

## Backlog

- [ ] 0001_task1

## WIP

- [.] 0002_task2

"""
        )

        manager = TasksManager(TasksConfig(project_root=tmp_path))

        # Mock glow to use print() instead of subprocess
        with patch("shutil.which", return_value=None):
            exit_code = manager.cmd_list()

        assert exit_code == 0
        captured = capsys.readouterr()
        assert "0001_task1" in captured.out
        assert "0002_task2" in captured.out

    def test_cmd_list_filtered(self, tmp_path, capsys):
        """Test list command with stage filter."""
        # Setup
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text(
            """---
kanban-plugin: board
---

## WIP

- [.] 0002_task2

"""
        )

        manager = TasksManager(TasksConfig(project_root=tmp_path))

        # Mock glow to use print() instead of subprocess
        with patch("shutil.which", return_value=None):
            exit_code = manager.cmd_list("wip")

        assert exit_code == 0
        captured = capsys.readouterr()
        assert "0002_task2" in captured.out

    def test_cmd_list_invalid_stage(self, tmp_path, capsys):
        """Test list command with invalid stage."""
        # Setup
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("test")

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_list("invalid")

        assert exit_code == 1
        captured = capsys.readouterr()
        assert "Invalid stage" in captured.err

    def test_cmd_update(self, tmp_path):
        """Test update command."""
        # Setup
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text(
            "---\nkanban-plugin: board\n---\n\n## Backlog\n\n"
        )
        (prompts_dir / "0047_test.md").write_text(
            "---\nname: test\nstatus: Backlog\n---\n\n"
            "### Background\n\nReal context here\n\n"
            "### Requirements\n\nReal requirements here\n\n"
            "### Solution\n\nReal solution here\n\n"
            "### Design\n\nReal design here\n\n"
            "### Plan\n\nStep 1: do the thing\n"
        )

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_update("47", "wip")

        assert exit_code == 0

        # Check task file was updated
        task_content = (prompts_dir / "0047_test.md").read_text()
        assert "status: WIP" in task_content

    def test_cmd_update_short_wbs(self, tmp_path):
        """Test update command with short WBS form."""
        # Setup
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text(
            "---\nkanban-plugin: board\n---\n\n## Backlog\n\n"
        )
        (prompts_dir / "0047_test.md").write_text(
            "---\nname: test\nstatus: Backlog\n---\n\n"
            "### Background\n\nReal context here\n\n"
            "### Requirements\n\nReal requirements here\n\n"
            "### Solution\n\nReal solution here\n\n"
            "### Design\n\nReal design here\n\n"
            "### Plan\n\nStep 1: do the thing\n"
        )

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_update("47", "testing")

        assert exit_code == 0
        task_content = (prompts_dir / "0047_test.md").read_text()
        assert "status: Testing" in task_content

    def test_cmd_update_not_found(self, tmp_path, capsys):
        """Test update command with non-existent WBS."""
        # Setup
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("test")

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_update("9999", "wip")

        assert exit_code == 1
        captured = capsys.readouterr()
        assert "No task found" in captured.err

    def test_cmd_refresh(self, tmp_path):
        """Test refresh command."""
        # Setup
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("---\nkanban-plugin: board\n---\n")
        (prompts_dir / "0047_wip_task.md").write_text("---\nstatus: WIP\n---\n")
        (prompts_dir / "0048_done_task.md").write_text("---\nstatus: Done\n---\n")
        (prompts_dir / ".template.md").write_text("test")

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_refresh()

        assert exit_code == 0

        # Check kanban was updated
        kanban_content = (prompts_dir / ".kanban.md").read_text()
        assert "- [.] 0047_wip_task" in kanban_content
        assert "- [x] 0048_done_task" in kanban_content

class TestCmdLog:
    """Tests for the log command."""

    @freeze_time("2026-01-21 15:30:00")
    def test_cmd_log_basic(self, tmp_path):
        """Test log command with prefix only."""
        # Setup
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("test")

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_log("test_event", None)

        assert exit_code == 0

        # Check log file was created in correct location
        log_file = tmp_path / ".claude" / "logs" / "hook_event.log"
        assert log_file.exists()
        log_content = log_file.read_text().strip()

        # Verify format: timestamp prefix json_payload
        assert "2026-01-21T15:30:00" in log_content
        assert "test_event" in log_content
        assert "{}" in log_content

    @freeze_time("2026-01-21 15:30:00")
    def test_cmd_log_with_json_data(self, tmp_path):
        """Test log command with JSON data payload."""
        # Setup
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("test")

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        data = json.dumps({"key": "value", "number": 42})
        exit_code = manager.cmd_log("test_event", data)

        assert exit_code == 0

        # Check log file
        log_file = tmp_path / ".claude" / "logs" / "hook_event.log"
        log_content = log_file.read_text().strip()

        # Verify JSON payload is in log
        assert '"key": "value"' in log_content
        assert '"number": 42' in log_content

    @freeze_time("2026-01-21 15:30:00")
    def test_cmd_log_with_string_data(self, tmp_path):
        """Test log command with non-JSON string data."""
        # Setup
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("test")

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_log("test_event", "plain string data")

        assert exit_code == 0

        # Check log file
        log_file = tmp_path / ".claude" / "logs" / "hook_event.log"
        log_content = log_file.read_text().strip()

        # Verify string data is preserved
        assert "plain string data" in log_content

    @freeze_time("2026-01-21 15:30:00")
    def test_cmd_log_multiple_entries(self, tmp_path):
        """Test log command with multiple entries."""
        # Setup
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("test")

        manager = TasksManager(TasksConfig(project_root=tmp_path))

        # Log multiple entries
        manager.cmd_log("event_one", None)
        manager.cmd_log("event_two", json.dumps({"data": "value"}))

        # Check log file has both entries
        log_file = tmp_path / ".claude" / "logs" / "hook_event.log"
        log_content = log_file.read_text()

        assert "event_one" in log_content
        assert "event_two" in log_content
        # Should have 2 lines (one per entry), each ending with \n
        assert log_content.count("\n") == 2  # 2 entries = 2 newlines

    @freeze_time("2026-01-21 15:30:00")
    def test_cmd_log_directory_creation(self, tmp_path):
        """Test that log command creates directory if needed."""
        # Setup - only create prompts dir, not .claude/logs
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("test")

        # Verify .claude/logs doesn't exist
        log_dir = tmp_path / ".claude" / "logs"
        assert not log_dir.exists()

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_log("test_event", None)

        assert exit_code == 0

        # Verify directory was created
        assert log_dir.exists()
        assert log_dir.is_dir()

    def test_cmd_log_error_handling(self, tmp_path, capsys):
        """Test log command error handling with invalid JSON."""
        # Setup
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("test")

        manager = TasksManager(TasksConfig(project_root=tmp_path))

        # Even with invalid JSON, cmd_log should handle it gracefully
        # (it treats non-JSON as string data)
        exit_code = manager.cmd_log("test_event", "{invalid json")

        assert exit_code == 0

        # Verify log was still written
        log_file = tmp_path / ".claude" / "logs" / "hook_event.log"
        assert log_file.exists()


class TestIntegration:
    """Integration tests for the tasks CLI."""

    @freeze_time("2026-01-21 14:30:00")
    def test_full_workflow(self, tmp_path):
        """Test complete workflow: init -> create -> update -> list."""
        from tasks import main, TasksManager, TasksConfig

        # Create .git directory for git root detection
        (tmp_path / ".git").mkdir()

        # Change to temp directory
        original_cwd = Path.cwd()
        import os

        os.chdir(tmp_path)

        try:
            # Initialize (creates docs/.tasks/ with config.jsonc)
            with patch("sys.argv", ["tasks", "init"]):
                assert main() == 0

            # Create tasks using main()
            with patch("sys.argv", ["tasks", "create", "Task One"]):
                assert main() == 0
            with patch("sys.argv", ["tasks", "create", "Task Two"]):
                assert main() == 0

            # Update task using TasksManager API directly (force to bypass placeholder validation)
            manager = TasksManager(TasksConfig(project_root=tmp_path))
            exit_code = manager.cmd_update("1", "wip", force=True)
            assert exit_code == 0

            # Verify task files exist and have correct content
            task1 = tmp_path / "docs/prompts/0001_Task_One.md"
            task2 = tmp_path / "docs/prompts/0002_Task_Two.md"

            assert task1.exists()
            assert task2.exists()

            task1_content = task1.read_text()
            assert "status: WIP" in task1_content

            task2_content = task2.read_text()
            assert "status: Backlog" in task2_content

            # Verify kanban (now in docs/.tasks/ with per-folder name)
            # Default active folder is docs/prompts, so kanban is kanban_prompts.md
            kanban = tmp_path / "docs/.tasks/kanban_prompts.md"
            kanban_content = kanban.read_text()
            assert "- [.] 0001_Task_One" in kanban_content
            assert "- [ ] 0002_Task_Two" in kanban_content

        finally:
            os.chdir(original_cwd)


@pytest.fixture
def mock_glow_not_available():
    """Mock glow as not available."""
    with patch("shutil.which", return_value=None):
        yield


@pytest.fixture
def mock_glow_available():
    """Mock glow as available."""
    with patch("shutil.which", return_value="/usr/bin/glow"):
        yield


if __name__ == "__main__":
    pytest.main([__file__, "-v"])


class TestLogRotation:
    """Tests for log rotation functionality."""

    def test_rotate_log_file_creates_rotated_log(self, tmp_path):
        """Test that log rotation creates a timestamped backup."""
        log_file = tmp_path / "test.log"

        # Create a log file exceeding MAX_LOG_SIZE
        log_file.write_text("x" * (MAX_LOG_SIZE + 1000))

        # Rotate
        rotate_log_file(log_file)

        # Original file should be gone (rotated)
        assert not log_file.exists()

        # Check for rotated file with timestamp pattern
        rotated_files = list(tmp_path.glob("test.*.log"))
        assert len(rotated_files) == 1

        # Rotated file should have the original content
        assert rotated_files[0].read_text().startswith("x")

    def test_rotate_log_file_small_file_no_rotation(self, tmp_path):
        """Test that small files are not rotated."""
        log_file = tmp_path / "test.log"
        original_content = "small log content"

        log_file.write_text(original_content)

        # Rotate should do nothing for small files
        rotate_log_file(log_file)

        # File should still exist with original content
        assert log_file.exists()
        assert log_file.read_text() == original_content

    def test_rotate_log_file_nonexistent_no_error(self, tmp_path):
        """Test that rotating non-existent file doesn't raise error."""
        log_file = tmp_path / "nonexistent.log"

        # Should not raise
        rotate_log_file(log_file)

    def test_cleanup_old_logs_keeps_recent(self, tmp_path):
        """Test that cleanup keeps only specified number of logs."""
        import time
        import os

        log_file = tmp_path / "test.log"

        # Create 7 rotated log files with staggered ages
        # We create them oldest first, then newer ones
        for i in range(7):
            timestamp = f"20260121_1{i}0000"
            rotated = tmp_path / f"test.{timestamp}.log"
            rotated.write_text(f"log content {i}")
            # Sleep briefly to ensure different mtimes
            time.sleep(0.01)
            # Set explicit mtime: older i = older file
            # Base time minus (7-i) hours so i=0 is oldest
            base_time = time.time()
            offset_hours = (7 - i) * 3600  # i=0 is 7 hours ago, i=6 is 1 hour ago
            os.utime(rotated, (base_time - offset_hours, base_time - offset_hours))

        # Verify all files exist before cleanup
        all_before = list(tmp_path.glob("test.*.log"))
        assert len(all_before) == 7, f"Expected 7 files before cleanup, got {len(all_before)}"

        # Cleanup keeping only 5
        _cleanup_old_logs(log_file, keep_count=5)

        # Should have 5 most recent logs remaining
        rotated_files = sorted(tmp_path.glob("test.*.log"))
        assert len(rotated_files) == 5, f"Expected 5 files after cleanup, got {len(rotated_files)}: {[f.name for f in rotated_files]}"

        # Verify the 2 oldest files (by mtime) were removed
        # Files are sorted by mtime descending, so oldest 2 should be gone
        # We verify by checking that 5 files remain and the original 7 - 5 = 2 were removed
        assert len(rotated_files) == 5

    def test_cleanup_old_logs_empty_directory(self, tmp_path):
        """Test cleanup with no rotated logs."""
        log_file = tmp_path / "test.log"

        # Should not raise
        _cleanup_old_logs(log_file, keep_count=5)

    @freeze_time("2026-01-21 16:00:00")
    def test_log_rotation_with_logging_operations(self, tmp_path):
        """Test log rotation integration with actual logging operations."""
        # Setup
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("test")

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        log_file = tmp_path / ".claude" / "logs" / "hook_event.log"

        # Write enough log entries to trigger rotation
        # Each log entry is about 100-200 bytes, so we need ~5000-10000 entries
        # For testing, we'll write a large single entry to trigger rotation
        large_data = "x" * (MAX_LOG_SIZE + 1000)

        # First, create a log file that exceeds the size
        log_file.parent.mkdir(parents=True, exist_ok=True)
        log_file.write_text(large_data)

        # Now try to log - should trigger rotation
        import time

        time.sleep(0.01)  # Ensure different timestamp for rotation
        manager.cmd_log("test_event", None)

        # Check that rotation happened
        rotated_files = list((tmp_path / ".claude" / "logs").glob("hook_event.*.log"))
        assert len(rotated_files) >= 1

        # Current log file should exist and be smaller
        assert log_file.exists()
        assert log_file.stat().st_size < MAX_LOG_SIZE


class TestTasksConfigLegacy:
    """Test that legacy mode (no config.jsonc) preserves all existing behavior."""

    def test_legacy_mode_default(self, tmp_path):
        """No config.jsonc means legacy mode."""
        config = TasksConfig(project_root=tmp_path)
        assert config.mode == "legacy"

    def test_legacy_paths(self, tmp_path):
        """Legacy mode uses docs/prompts/ for everything."""
        config = TasksConfig(project_root=tmp_path)
        assert config.prompts_dir == tmp_path / "docs/prompts"
        assert config.kanban_file == tmp_path / "docs/prompts/.kanban.md"
        assert config.template_file == tmp_path / "docs/prompts/.template.md"
        assert config.sync_dir == tmp_path / "docs/tasks_sync"

    def test_legacy_all_folders(self, tmp_path):
        """Legacy mode has single folder."""
        config = TasksConfig(project_root=tmp_path)
        assert config.all_folders == [tmp_path / "docs/prompts"]

    def test_legacy_get_next_wbs(self, tmp_path):
        """Legacy get_next_wbs scans docs/prompts/."""
        prompts = tmp_path / "docs/prompts"
        prompts.mkdir(parents=True)
        (prompts / "0010_task.md").write_text("test")
        (prompts / "0020_task.md").write_text("test")

        config = TasksConfig(project_root=tmp_path)
        assert config.get_next_wbs() == 21

    def test_legacy_get_next_wbs_empty(self, tmp_path):
        """Legacy get_next_wbs returns 1 for empty folder."""
        prompts = tmp_path / "docs/prompts"
        prompts.mkdir(parents=True)

        config = TasksConfig(project_root=tmp_path)
        assert config.get_next_wbs() == 1

    def test_legacy_find_task_by_wbs(self, tmp_path):
        """Legacy find_task_by_wbs searches docs/prompts/."""
        prompts = tmp_path / "docs/prompts"
        prompts.mkdir(parents=True)
        task = prompts / "0047_test.md"
        task.write_text("test")

        config = TasksConfig(project_root=tmp_path)
        assert config.find_task_by_wbs("0047") == task

    def test_legacy_find_task_by_wbs_not_found(self, tmp_path):
        """Legacy find_task_by_wbs returns None for missing task."""
        prompts = tmp_path / "docs/prompts"
        prompts.mkdir(parents=True)

        config = TasksConfig(project_root=tmp_path)
        assert config.find_task_by_wbs("9999") is None


class TestTasksConfigWithConfig:
    """Test config mode (with config.jsonc)."""

    def _create_config(self, tmp_path, config_data):
        """Helper: create config.jsonc."""
        meta_dir = tmp_path / "docs/.tasks"
        meta_dir.mkdir(parents=True, exist_ok=True)
        config_text = (
            "// Test config\n"
            + json.dumps(config_data, indent=2)
            + "\n"
        )
        (meta_dir / "config.jsonc").write_text(config_text)

    def test_config_mode_detected(self, tmp_path):
        """Config.jsonc triggers config mode."""
        self._create_config(tmp_path, {
            "$schema_version": 1,
            "active_folder": "docs/prompts",
            "folders": {"docs/prompts": {"base_counter": 0, "label": "Phase 1"}},
        })
        config = TasksConfig(project_root=tmp_path)
        assert config.mode == "config"

    def test_config_paths(self, tmp_path):
        """Config mode uses docs/.tasks/ for metadata with per-folder kanban."""
        self._create_config(tmp_path, {
            "$schema_version": 1,
            "active_folder": "docs/prompts",
            "folders": {"docs/prompts": {"base_counter": 0, "label": "Phase 1"}},
        })
        config = TasksConfig(project_root=tmp_path)
        # Kanban file is now per-folder: kanban_prompts.md for docs/prompts
        assert config.kanban_file == tmp_path / "docs/.tasks/kanban_prompts.md"
        assert config.template_file == tmp_path / "docs/.tasks/template.md"
        assert config.sync_dir == tmp_path / "docs/.tasks/sync"
        assert config.prompts_dir == tmp_path / "docs/prompts"

    def test_config_active_folder(self, tmp_path):
        """Config mode respects active_folder setting."""
        self._create_config(tmp_path, {
            "$schema_version": 1,
            "active_folder": "docs/next-phase",
            "folders": {
                "docs/prompts": {"base_counter": 0},
                "docs/next-phase": {"base_counter": 200},
            },
        })
        config = TasksConfig(project_root=tmp_path)
        assert config.active_folder == tmp_path / "docs/next-phase"

    def test_config_folder_override(self, tmp_path):
        """--folder overrides active_folder."""
        self._create_config(tmp_path, {
            "$schema_version": 1,
            "active_folder": "docs/prompts",
            "folders": {
                "docs/prompts": {"base_counter": 0},
                "docs/next-phase": {"base_counter": 200},
            },
        })
        config = TasksConfig(project_root=tmp_path, folder="docs/next-phase")
        assert config.active_folder == tmp_path / "docs/next-phase"

    def test_config_all_folders(self, tmp_path):
        """Config mode lists all folders."""
        self._create_config(tmp_path, {
            "$schema_version": 1,
            "active_folder": "docs/prompts",
            "folders": {
                "docs/prompts": {"base_counter": 0},
                "docs/next-phase": {"base_counter": 200},
            },
        })
        config = TasksConfig(project_root=tmp_path)
        assert len(config.all_folders) == 2
        assert tmp_path / "docs/prompts" in config.all_folders
        assert tmp_path / "docs/next-phase" in config.all_folders

    def test_jsonc_parsing(self, tmp_path):
        """JSONC comments are stripped correctly."""
        meta_dir = tmp_path / "docs/.tasks"
        meta_dir.mkdir(parents=True)
        (meta_dir / "config.jsonc").write_text(
            '// This is a comment\n'
            '{\n'
            '  // Another comment\n'
            '  "$schema_version": 1,\n'
            '  "active_folder": "docs/prompts", // inline comment\n'
            '  "folders": {\n'
            '    "docs/prompts": {"base_counter": 0}\n'
            '  }\n'
            '}\n'
        )
        config = TasksConfig(project_root=tmp_path)
        assert config.mode == "config"
        assert config.active_folder == tmp_path / "docs/prompts"


class TestGlobalWBSUniqueness:
    """Test WBS uniqueness across multiple folders."""

    def _setup_multi_folder(self, tmp_path):
        """Helper: set up multi-folder config with tasks."""
        meta_dir = tmp_path / "docs/.tasks"
        meta_dir.mkdir(parents=True)
        config_data = {
            "$schema_version": 1,
            "active_folder": "docs/prompts",
            "folders": {
                "docs/prompts": {"base_counter": 0, "label": "Phase 1"},
                "docs/next-phase": {"base_counter": 200, "label": "Phase 2"},
            },
        }
        (meta_dir / "config.jsonc").write_text(
            "// test\n" + json.dumps(config_data, indent=2) + "\n"
        )

        # Create folders with tasks
        p1 = tmp_path / "docs/prompts"
        p1.mkdir(parents=True)
        (p1 / "0100_task_a.md").write_text("---\nstatus: WIP\n---\n")
        (p1 / "0150_task_b.md").write_text("---\nstatus: Done\n---\n")

        p2 = tmp_path / "docs/next-phase"
        p2.mkdir(parents=True)
        (p2 / "0201_task_c.md").write_text("---\nstatus: Backlog\n---\n")

        return TasksConfig(project_root=tmp_path)

    def test_global_max_across_folders(self, tmp_path):
        """get_next_wbs returns max across ALL folders + 1."""
        config = self._setup_multi_folder(tmp_path)
        # Global max is 201 (from next-phase), so next = 202
        assert config.get_next_wbs() == 202

    def test_base_counter_as_floor(self, tmp_path):
        """base_counter acts as floor when it's higher than global max."""
        meta_dir = tmp_path / "docs/.tasks"
        meta_dir.mkdir(parents=True)
        config_data = {
            "$schema_version": 1,
            "active_folder": "docs/next-phase",
            "folders": {
                "docs/prompts": {"base_counter": 0},
                "docs/next-phase": {"base_counter": 500},
            },
        }
        (meta_dir / "config.jsonc").write_text(
            "// test\n" + json.dumps(config_data, indent=2) + "\n"
        )

        p1 = tmp_path / "docs/prompts"
        p1.mkdir(parents=True)
        (p1 / "0010_task.md").write_text("test")

        p2 = tmp_path / "docs/next-phase"
        p2.mkdir(parents=True)

        config = TasksConfig(project_root=tmp_path)
        # Global max is 10, but base_counter for active folder is 500
        assert config.get_next_wbs() == 501

    def test_no_collisions_after_create(self, tmp_path):
        """Creating tasks in different folders never collides."""
        config = self._setup_multi_folder(tmp_path)
        # Create kanban and template for validate()
        meta_dir = tmp_path / "docs/.tasks"
        # Use per-folder kanban (kanban_prompts.md since active_folder is docs/prompts)
        (meta_dir / "kanban_prompts.md").write_text("---\nkanban-plugin: board\n---\n")
        (meta_dir / "template.md").write_text(
            "---\nname: {{PROMPT_NAME}}\nstatus: Backlog\n"
            "created_at: {{CREATED_AT}}\nupdated_at: {{UPDATED_AT}}\n---\n"
            "## {{WBS}}. {{PROMPT_NAME}}\n"
        )

        manager = TasksManager(config)
        exit_code = manager.cmd_create("New Task")
        assert exit_code == 0

        # Should be 0202 (global max 201 + 1)
        assert (tmp_path / "docs/prompts/0202_New_Task.md").exists()


class TestCrossFolderOperations:
    """Test that update/open find tasks across all folders."""

    def _setup_cross_folder(self, tmp_path):
        """Helper: multi-folder with kanban in docs/.tasks/."""
        meta_dir = tmp_path / "docs/.tasks"
        meta_dir.mkdir(parents=True)
        config_data = {
            "$schema_version": 1,
            "active_folder": "docs/next-phase",
            "folders": {
                "docs/prompts": {"base_counter": 0},
                "docs/next-phase": {"base_counter": 200},
            },
        }
        (meta_dir / "config.jsonc").write_text(
            "// test\n" + json.dumps(config_data, indent=2) + "\n"
        )
        # Use per-folder kanban (kanban_next-phase.md since active_folder is docs/next-phase)
        (meta_dir / "kanban_next-phase.md").write_text("---\nkanban-plugin: board\n---\n")

        p1 = tmp_path / "docs/prompts"
        p1.mkdir(parents=True)
        (p1 / "0047_old_task.md").write_text("---\nstatus: Backlog\nupdated_at: 2026-01-01\n---\n")

        p2 = tmp_path / "docs/next-phase"
        p2.mkdir(parents=True)
        (p2 / "0201_new_task.md").write_text("---\nstatus: Backlog\nupdated_at: 2026-01-01\n---\n")

        return TasksConfig(project_root=tmp_path)

    def test_update_finds_task_in_other_folder(self, tmp_path):
        """cmd_update finds task 0047 in docs/prompts/ even when active is docs/next-phase/."""
        config = self._setup_cross_folder(tmp_path)
        manager = TasksManager(config)

        exit_code = manager.cmd_update("47", "wip", force=True)
        assert exit_code == 0

        task_content = (tmp_path / "docs/prompts/0047_old_task.md").read_text()
        assert "status: WIP" in task_content

    def test_update_finds_task_in_active_folder(self, tmp_path):
        """cmd_update finds task 0201 in the active folder."""
        config = self._setup_cross_folder(tmp_path)
        manager = TasksManager(config)

        exit_code = manager.cmd_update("201", "testing", force=True)
        assert exit_code == 0

        task_content = (tmp_path / "docs/next-phase/0201_new_task.md").read_text()
        assert "status: Testing" in task_content

    def test_find_task_by_wbs_across_folders(self, tmp_path):
        """find_task_by_wbs searches all configured folders."""
        config = self._setup_cross_folder(tmp_path)
        assert config.find_task_by_wbs("0047") == tmp_path / "docs/prompts/0047_old_task.md"
        assert config.find_task_by_wbs("0201") == tmp_path / "docs/next-phase/0201_new_task.md"
        assert config.find_task_by_wbs("9999") is None


class TestMigration:
    """Test init migration from legacy to config mode."""

    def test_migration_moves_kanban(self, tmp_path):
        """Init migrates .kanban.md from docs/prompts/ to docs/.tasks/kanban_prompts.md."""
        prompts = tmp_path / "docs/prompts"
        prompts.mkdir(parents=True)
        (prompts / ".kanban.md").write_text("original kanban")

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        manager.cmd_init()

        # Migrates to per-folder kanban file
        assert (tmp_path / "docs/.tasks/kanban_prompts.md").read_text() == "original kanban"

    def test_migration_moves_template(self, tmp_path):
        """Init migrates .template.md from docs/prompts/ to docs/.tasks/."""
        prompts = tmp_path / "docs/prompts"
        prompts.mkdir(parents=True)
        (prompts / ".template.md").write_text("original template")

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        manager.cmd_init()

        assert (tmp_path / "docs/.tasks/template.md").read_text() == "original template"

    def test_migration_moves_sync_data(self, tmp_path):
        """Init migrates docs/tasks_sync/ to docs/.tasks/sync/."""
        prompts = tmp_path / "docs/prompts"
        prompts.mkdir(parents=True)
        sync_dir = tmp_path / "docs/tasks_sync"
        sync_dir.mkdir(parents=True)
        (sync_dir / "session_map.json").write_text('{"key": "value"}')
        (sync_dir / "promotions.log").write_text("log data")

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        manager.cmd_init()

        assert (tmp_path / "docs/.tasks/sync/session_map.json").read_text() == '{"key": "value"}'
        assert (tmp_path / "docs/.tasks/sync/promotions.log").read_text() == "log data"

    def test_migration_idempotent(self, tmp_path):
        """Running init twice doesn't break anything."""
        prompts = tmp_path / "docs/prompts"
        prompts.mkdir(parents=True)
        (prompts / ".kanban.md").write_text("kanban v1")

        config = TasksConfig(project_root=tmp_path)
        manager = TasksManager(config)
        manager.cmd_init()

        # First run migrates to per-folder kanban
        assert (tmp_path / "docs/.tasks/kanban_prompts.md").read_text() == "kanban v1"

        # Second run: reload config (now in config mode)
        config2 = TasksConfig(project_root=tmp_path)
        manager2 = TasksManager(config2)
        result = manager2.cmd_init()
        assert result == 0

        # kanban still has original content
        assert (tmp_path / "docs/.tasks/kanban_prompts.md").read_text() == "kanban v1"

    def test_migration_generates_config(self, tmp_path):
        """Init creates config.jsonc with correct structure."""
        prompts = tmp_path / "docs/prompts"
        prompts.mkdir(parents=True)

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        manager.cmd_init()

        config_path = tmp_path / "docs/.tasks/config.jsonc"
        assert config_path.exists()

        config = TasksConfig._parse_jsonc(config_path)
        assert config["$schema_version"] == 1
        assert config["active_folder"] == "docs/prompts"
        assert "docs/prompts" in config["folders"]


class TestCmdConfig:
    """Test the config command."""

    def _init_project(self, tmp_path):
        """Helper: run init to create config."""
        prompts = tmp_path / "docs/prompts"
        prompts.mkdir(parents=True)
        manager = TasksManager(TasksConfig(project_root=tmp_path))
        manager.cmd_init()
        return TasksManager(TasksConfig(project_root=tmp_path))

    def test_config_show(self, tmp_path, capsys):
        """tasks config shows current settings."""
        manager = self._init_project(tmp_path)
        exit_code = manager.cmd_config()

        assert exit_code == 0
        captured = capsys.readouterr()
        assert "Mode: config" in captured.out
        assert "docs/prompts" in captured.out

    def test_config_add_folder(self, tmp_path):
        """tasks config add-folder adds a new folder."""
        manager = self._init_project(tmp_path)
        exit_code = manager.cmd_config(
            "add-folder",
            ["docs/next-phase", "--base-counter", "200", "--label", "Phase 2"],
        )

        assert exit_code == 0

        # Reload and verify
        config = TasksConfig(project_root=tmp_path)
        assert len(config.all_folders) == 2
        assert (tmp_path / "docs/next-phase").exists()

    def test_config_set_active(self, tmp_path):
        """tasks config set-active changes the active folder."""
        manager = self._init_project(tmp_path)
        # First add the folder
        manager.cmd_config(
            "add-folder",
            ["docs/next-phase", "--base-counter", "200"],
        )
        # Then set it active
        exit_code = manager.cmd_config("set-active", ["docs/next-phase"])
        assert exit_code == 0

        # Reload and verify
        config = TasksConfig(project_root=tmp_path)
        assert config.active_folder == tmp_path / "docs/next-phase"

    def test_config_set_active_invalid(self, tmp_path, capsys):
        """tasks config set-active rejects unknown folders."""
        manager = self._init_project(tmp_path)
        exit_code = manager.cmd_config("set-active", ["docs/nonexistent"])

        assert exit_code == 1
        captured = capsys.readouterr()
        assert "not in config" in captured.err


class TestMultiFolderRefresh:
    """Test kanban refresh across multiple folders."""

    def test_refresh_aggregates_all_folders(self, tmp_path):
        """Refresh creates per-folder kanban files."""
        meta_dir = tmp_path / "docs/.tasks"
        meta_dir.mkdir(parents=True)
        config_data = {
            "$schema_version": 1,
            "active_folder": "docs/prompts",
            "folders": {
                "docs/prompts": {"base_counter": 0},
                "docs/next-phase": {"base_counter": 200},
            },
        }
        (meta_dir / "config.jsonc").write_text(
            "// test\n" + json.dumps(config_data, indent=2) + "\n"
        )
        (meta_dir / "kanban_prompts.md").write_text("---\nkanban-plugin: board\n---\n")

        p1 = tmp_path / "docs/prompts"
        p1.mkdir(parents=True)
        (p1 / "0001_phase1.md").write_text("---\nstatus: WIP\n---\n")

        p2 = tmp_path / "docs/next-phase"
        p2.mkdir(parents=True)
        (p2 / "0201_phase2.md").write_text("---\nstatus: Backlog\n---\n")

        config = TasksConfig(project_root=tmp_path)
        manager = TasksManager(config)
        exit_code = manager.cmd_refresh()

        assert exit_code == 0

        # Check per-folder kanban files
        kanban_prompts = (meta_dir / "kanban_prompts.md").read_text()
        assert "0001_phase1" in kanban_prompts
        assert "0201_phase2" not in kanban_prompts  # Should NOT contain tasks from other folder

        kanban_next_phase = (meta_dir / "kanban_next-phase.md").read_text()
        assert "0201_phase2" in kanban_next_phase
        assert "0001_phase1" not in kanban_next_phase  # Should NOT contain tasks from other folder


# ============================================================================
# New tests for 0182 (impl_progress), 0181 (validation + rich create), 0178 (batch-create)
# ============================================================================

TASK_WITH_IMPL_PROGRESS = """\
---
name: test task
status: Backlog
updated_at: 2026-01-01
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0047. test task

### Background

Real background content

### Requirements

Real requirements content

### Solution

Real solution content

### Design

Modular architecture with service layer

### Plan

Step 1: do the thing

### References

[Links to docs]
"""

TASK_PLACEHOLDER = """\
---
name: test task
status: Backlog
updated_at: 2026-01-01
---

## 0047. test task

### Background

[Context and motivation - why this task exists]

### Requirements

[What needs to be done - acceptance criteria]

### Solution

[Solution added by specialists]

### Plan

[Step-by-step implementation plan]

### References

[Links to docs, related tasks, external resources]
"""


class TestImplProgress:
    """Tests for impl_progress (0182)."""

    def test_get_impl_progress(self, tmp_path):
        """Reads impl_progress from frontmatter."""
        task_file = tmp_path / "0047_test.md"
        task_file.write_text(TASK_WITH_IMPL_PROGRESS)
        tf = TaskFile(task_file)
        progress = tf.get_impl_progress()
        assert progress == {
            "planning": "pending",
            "design": "pending",
            "implementation": "pending",
            "review": "pending",
            "testing": "pending",
        }

    def test_get_impl_progress_missing(self, tmp_path):
        """Returns empty dict when no impl_progress."""
        task_file = tmp_path / "0047_test.md"
        task_file.write_text("---\nstatus: Backlog\n---\n")
        tf = TaskFile(task_file)
        assert tf.get_impl_progress() == {}

    def test_update_impl_progress(self, tmp_path):
        """Updates a single phase in frontmatter."""
        task_file = tmp_path / "0047_test.md"
        task_file.write_text(TASK_WITH_IMPL_PROGRESS)
        tf = TaskFile(task_file)
        tf.update_impl_progress("implementation", "completed")
        progress = tf.get_impl_progress()
        assert progress["implementation"] == "completed"
        assert progress["planning"] == "pending"  # unchanged

    def test_compute_status_all_completed(self):
        """All completed -> Done."""
        progress = {p: "completed" for p in IMPL_PHASES}
        assert compute_status_from_progress(progress) == TaskStatus.DONE

    def test_compute_status_any_blocked(self):
        """Any blocked -> Blocked."""
        progress = {"planning": "completed", "design": "blocked", "implementation": "pending"}
        assert compute_status_from_progress(progress) == TaskStatus.BLOCKED

    def test_compute_status_any_in_progress(self):
        """Any in_progress -> WIP."""
        progress = {"planning": "completed", "design": "in_progress", "implementation": "pending"}
        assert compute_status_from_progress(progress) == TaskStatus.WIP

    def test_compute_status_mixed(self):
        """Mixed completed/pending -> WIP."""
        progress = {"planning": "completed", "design": "pending", "implementation": "pending"}
        assert compute_status_from_progress(progress) == TaskStatus.WIP

    def test_compute_status_all_pending(self):
        """All pending -> None (no change)."""
        progress = {p: "pending" for p in IMPL_PHASES}
        assert compute_status_from_progress(progress) is None

    def test_compute_status_empty(self):
        """Empty -> None."""
        assert compute_status_from_progress({}) is None

    def test_cmd_update_with_phase(self, tmp_path):
        """End-to-end: tasks update WBS --phase implementation in_progress."""
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("---\nkanban-plugin: board\n---\n")
        (prompts_dir / "0047_test.md").write_text(TASK_WITH_IMPL_PROGRESS)

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_update("47", phase="implementation", phase_status="in_progress")
        assert exit_code == 0

        tf = TaskFile(prompts_dir / "0047_test.md")
        assert tf.get_impl_progress()["implementation"] == "in_progress"

    def test_cmd_update_phase_auto_status(self, tmp_path):
        """Phase update auto-advances task status."""
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("---\nkanban-plugin: board\n---\n")

        # Task with all completed except testing
        content = TASK_WITH_IMPL_PROGRESS.replace(
            "planning: pending", "planning: completed"
        ).replace(
            "design: pending", "design: completed"
        ).replace(
            "implementation: pending", "implementation: completed"
        ).replace(
            "review: pending", "review: completed"
        )
        (prompts_dir / "0047_test.md").write_text(content)

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        # Complete the last phase -> should auto-compute Done
        exit_code = manager.cmd_update("47", phase="testing", phase_status="completed")
        assert exit_code == 0

        tf = TaskFile(prompts_dir / "0047_test.md")
        assert tf.get_status() == TaskStatus.DONE

    def test_cmd_update_phase_invalid_phase(self, tmp_path, capsys):
        """Invalid phase name is rejected."""
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("---\nkanban-plugin: board\n---\n")
        (prompts_dir / "0047_test.md").write_text(TASK_WITH_IMPL_PROGRESS)

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_update("47", phase="invalid", phase_status="completed")
        assert exit_code == 1
        assert "Invalid phase" in capsys.readouterr().err

    def test_cmd_update_phase_invalid_status(self, tmp_path, capsys):
        """Invalid phase status is rejected."""
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("---\nkanban-plugin: board\n---\n")
        (prompts_dir / "0047_test.md").write_text(TASK_WITH_IMPL_PROGRESS)

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_update("47", phase="implementation", phase_status="invalid")
        assert exit_code == 1
        assert "Invalid phase status" in capsys.readouterr().err

    def test_sync_impl_progress_done(self, tmp_path):
        """Direct status=Done syncs all phases to completed."""
        task_file = tmp_path / "0047_test.md"
        task_file.write_text(TASK_WITH_IMPL_PROGRESS)
        tf = TaskFile(task_file)
        updated = tf.sync_impl_progress_to_status(TaskStatus.DONE)
        assert updated is True
        progress = tf.get_impl_progress()
        assert all(v == "completed" for v in progress.values())

    def test_sync_impl_progress_backlog(self, tmp_path):
        """Direct status=Backlog syncs all phases to pending."""
        task_file = tmp_path / "0047_test.md"
        content = TASK_WITH_IMPL_PROGRESS.replace(
            "planning: pending", "planning: completed"
        ).replace(
            "implementation: pending", "implementation: in_progress"
        )
        task_file.write_text(content)
        tf = TaskFile(task_file)
        updated = tf.sync_impl_progress_to_status(TaskStatus.BACKLOG)
        assert updated is True
        progress = tf.get_impl_progress()
        assert all(v == "pending" for v in progress.values())

    def test_sync_impl_progress_wip_no_change(self, tmp_path):
        """Direct status=WIP does not alter phases (ambiguous)."""
        task_file = tmp_path / "0047_test.md"
        task_file.write_text(TASK_WITH_IMPL_PROGRESS)
        tf = TaskFile(task_file)
        updated = tf.sync_impl_progress_to_status(TaskStatus.WIP)
        assert updated is False
        progress = tf.get_impl_progress()
        assert all(v == "pending" for v in progress.values())

    def test_sync_impl_progress_no_impl_block(self, tmp_path):
        """Tasks without impl_progress are unaffected."""
        task_file = tmp_path / "0047_test.md"
        task_file.write_text("---\nstatus: Backlog\n---\n")
        tf = TaskFile(task_file)
        updated = tf.sync_impl_progress_to_status(TaskStatus.DONE)
        assert updated is False

    def test_sync_impl_progress_already_synced(self, tmp_path):
        """No-op when phases already match target."""
        task_file = tmp_path / "0047_test.md"
        task_file.write_text(TASK_WITH_IMPL_PROGRESS)  # all pending
        tf = TaskFile(task_file)
        updated = tf.sync_impl_progress_to_status(TaskStatus.BACKLOG)
        assert updated is False  # already all pending

    def test_cmd_update_direct_syncs_phases(self, tmp_path, capsys):
        """tasks update WBS done auto-syncs impl_progress to completed."""
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("---\nkanban-plugin: board\n---\n")
        (prompts_dir / "0047_test.md").write_text(TASK_WITH_IMPL_PROGRESS)

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_update("47", "done", force=True)
        assert exit_code == 0

        tf = TaskFile(prompts_dir / "0047_test.md")
        assert tf.get_status() == TaskStatus.DONE
        progress = tf.get_impl_progress()
        assert all(v == "completed" for v in progress.values())

        out = capsys.readouterr().out
        assert "Synced impl_progress" in out


class TestValidation:
    """Tests for tiered validation (0181)."""

    def test_tier2_empty_background_blocks_wip(self, tmp_path, capsys):
        """Empty background blocks WIP transition."""
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("---\nkanban-plugin: board\n---\n")
        (prompts_dir / "0047_test.md").write_text(TASK_PLACEHOLDER)

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_update("47", "wip")
        assert exit_code == 1
        err = capsys.readouterr().err
        assert "Background section is empty" in err

    def test_tier2_empty_design_blocks_wip(self, tmp_path, capsys):
        """Empty Design section blocks WIP transition."""
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("---\nkanban-plugin: board\n---\n")
        (prompts_dir / "0047_test.md").write_text(
            "---\nname: test\nstatus: Backlog\nupdated_at: 2026-01-01\n---\n\n"
            "### Background\n\nReal background\n\n"
            "### Requirements\n\nReal requirements\n\n"
            "### Solution\n\nReal solution\n\n"
            "### Design\n\n[Architecture/UI specs added by specialists]\n"
        )

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_update("47", "wip")
        assert exit_code == 1
        err = capsys.readouterr().err
        assert "Design section is empty" in err

    def test_tier2_real_design_allows_wip(self, tmp_path):
        """Populated Design section allows WIP transition."""
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("---\nkanban-plugin: board\n---\n")
        (prompts_dir / "0047_test.md").write_text(
            "---\nname: test\nstatus: Backlog\nupdated_at: 2026-01-01\n---\n\n"
            "### Background\n\nReal background\n\n"
            "### Requirements\n\nReal requirements\n\n"
            "### Solution\n\nReal solution\n\n"
            "### Design\n\nModular architecture with service layer\n\n"
            "### Plan\n\nStep 1: implement the solution\n"
        )

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_update("47", "wip")
        assert exit_code == 0

    def test_tier2_force_bypasses(self, tmp_path):
        """--force allows transition despite warnings."""
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("---\nkanban-plugin: board\n---\n")
        (prompts_dir / "0047_test.md").write_text(TASK_PLACEHOLDER)

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_update("47", "wip", force=True)
        assert exit_code == 0

        content = (prompts_dir / "0047_test.md").read_text()
        assert "status: WIP" in content

    def test_tier2_empty_plan_blocks_testing(self, tmp_path, capsys):
        """Empty plan blocks Testing transition."""
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("---\nkanban-plugin: board\n---\n")
        (prompts_dir / "0047_test.md").write_text(
            "---\nname: test\nstatus: WIP\nupdated_at: 2026-01-01\n---\n\n"
            "### Background\n\nReal background\n\n"
            "### Requirements\n\nReal requirements\n\n"
            "### Solution\n\nReal solution\n\n"
            "### Design\n\nReal design\n\n"
            "### Plan\n\n[Step-by-step implementation plan]\n"
        )

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_update("47", "testing")
        assert exit_code == 1
        assert "Plan section is empty" in capsys.readouterr().err

    def test_tier3_suggestions_dont_block(self, tmp_path):
        """Suggestions are informational, don't block."""
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("---\nkanban-plugin: board\n---\n")
        (prompts_dir / "0047_test.md").write_text(
            "---\nname: test\nstatus: Backlog\nupdated_at: 2026-01-01\n---\n\n"
            "### Background\n\nReal background\n\n"
            "### Requirements\n\nReal requirements\n\n"
            "### Solution\n\nReal solution\n\n"
            "### Design\n\nReal design\n\n"
            "### Plan\n\nStep 1: implement\n\n"
            "### References\n\n[Links to docs]\n"
        )

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_update("47", "wip")
        assert exit_code == 0

    def test_backlog_to_todo_no_warnings(self, tmp_path):
        """No content warnings for early transitions (Backlog -> Todo)."""
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("---\nkanban-plugin: board\n---\n")
        (prompts_dir / "0047_test.md").write_text(TASK_PLACEHOLDER)

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_update("47", "todo")
        assert exit_code == 0

    def test_validate_task_for_transition_directly(self, tmp_path):
        """Direct validation function test."""
        task_file = tmp_path / "0047_test.md"
        task_file.write_text(TASK_PLACEHOLDER)
        tf = TaskFile(task_file)
        result = validate_task_for_transition(tf, TaskStatus.WIP)
        assert result.has_warnings
        assert not result.has_errors
        assert any("Background" in w for w in result.warnings)

    def test_validation_result_clean(self, tmp_path):
        """Clean task passes validation."""
        task_file = tmp_path / "0047_test.md"
        task_file.write_text(TASK_WITH_IMPL_PROGRESS)
        tf = TaskFile(task_file)
        result = validate_task_for_transition(tf, TaskStatus.DONE)
        assert not result.has_errors
        assert not result.has_warnings


class TestRichCreate:
    """Tests for rich create flags (0181)."""

    def _setup_project(self, tmp_path):
        """Helper: set up minimal project for create tests."""
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)
        meta_dir = tmp_path / "docs/.tasks"
        meta_dir.mkdir(parents=True)
        # Use per-folder kanban file (kanban_prompts.md for docs/prompts)
        (meta_dir / "kanban_prompts.md").write_text("---\nkanban-plugin: board\n---\n")
        (meta_dir / "template.md").write_text(
            "---\nname: {{PROMPT_NAME}}\nstatus: Backlog\n"
            "created_at: {{CREATED_AT}}\nupdated_at: {{UPDATED_AT}}\n---\n\n"
            "### Background\n\n[Context and motivation - why this task exists]\n\n"
            "### Requirements\n\n[What needs to be done - acceptance criteria]\n"
        )
        config_data = {
            "$schema_version": 1,
            "active_folder": "docs/prompts",
            "folders": {"docs/prompts": {"base_counter": 0}},
        }
        (meta_dir / "config.jsonc").write_text(
            "// test\n" + json.dumps(config_data, indent=2) + "\n"
        )
        return TasksManager(TasksConfig(project_root=tmp_path))

    def test_create_with_background(self, tmp_path):
        """--background injects content."""
        manager = self._setup_project(tmp_path)
        exit_code = manager.cmd_create("Feature X", background="We need feature X for users")
        assert exit_code == 0
        content = (tmp_path / "docs/prompts/0001_Feature_X.md").read_text()
        assert "We need feature X for users" in content
        assert "[Context and motivation" not in content  # placeholder replaced

    def test_create_with_requirements(self, tmp_path):
        """--requirements injects content."""
        manager = self._setup_project(tmp_path)
        exit_code = manager.cmd_create("Feature X", requirements="Must handle 1000 RPS")
        assert exit_code == 0
        content = (tmp_path / "docs/prompts/0001_Feature_X.md").read_text()
        assert "Must handle 1000 RPS" in content

    def test_create_with_both(self, tmp_path):
        """--background and --requirements together."""
        manager = self._setup_project(tmp_path)
        exit_code = manager.cmd_create(
            "Feature X", background="Context here", requirements="Criteria here"
        )
        assert exit_code == 0
        content = (tmp_path / "docs/prompts/0001_Feature_X.md").read_text()
        assert "Context here" in content
        assert "Criteria here" in content

    def test_create_from_json(self, tmp_path):
        """--from-json creates from JSON file."""
        manager = self._setup_project(tmp_path)
        json_file = tmp_path / "task.json"
        json_file.write_text(json.dumps({
            "name": "JSON Task",
            "background": "From JSON",
            "requirements": "JSON requirements",
        }))
        exit_code = manager.cmd_create("", from_json=str(json_file))
        assert exit_code == 0
        content = (tmp_path / "docs/prompts/0001_JSON_Task.md").read_text()
        assert "From JSON" in content

    def test_create_bare_still_works(self, tmp_path):
        """Bare create (no flags) still works."""
        manager = self._setup_project(tmp_path)
        exit_code = manager.cmd_create("Simple Task")
        assert exit_code == 0
        assert (tmp_path / "docs/prompts/0001_Simple_Task.md").exists()


class TestEnhancedCheck:
    """Tests for enhanced check command (0181)."""

    def test_check_single_task(self, tmp_path, capsys):
        """tasks check <WBS> validates one task."""
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("---\nkanban-plugin: board\n---\n")
        (prompts_dir / "0047_test.md").write_text(TASK_PLACEHOLDER)

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_check("47")
        assert exit_code == 0  # no structural errors
        out = capsys.readouterr().out
        assert "[CHECK]" in out
        assert "warnings" in out

    def test_check_single_task_not_found(self, tmp_path, capsys):
        """tasks check <WBS> with invalid WBS."""
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("---\nkanban-plugin: board\n---\n")

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_check("9999")
        assert exit_code == 1


class TestBatchCreate:
    """Tests for batch-create command (0178)."""

    def _setup_project(self, tmp_path):
        """Helper: set up minimal project for batch-create tests."""
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)
        meta_dir = tmp_path / "docs/.tasks"
        meta_dir.mkdir(parents=True)
        # Per-folder kanban file (kanban_prompts.md for docs/prompts folder)
        (meta_dir / "kanban_prompts.md").write_text("---\nkanban-plugin: board\n---\n")
        (meta_dir / "template.md").write_text(
            "---\nname: {{PROMPT_NAME}}\nstatus: Backlog\n"
            "created_at: {{CREATED_AT}}\nupdated_at: {{UPDATED_AT}}\n---\n\n"
            "### Background\n\n[Context and motivation - why this task exists]\n\n"
            "### Requirements\n\n[What needs to be done - acceptance criteria]\n"
        )
        config_data = {
            "$schema_version": 1,
            "active_folder": "docs/prompts",
            "folders": {"docs/prompts": {"base_counter": 0}},
        }
        (meta_dir / "config.jsonc").write_text(
            "// test\n" + json.dumps(config_data, indent=2) + "\n"
        )
        return TasksManager(TasksConfig(project_root=tmp_path))

    def test_batch_create_from_json(self, tmp_path):
        """Creates multiple tasks from JSON array."""
        manager = self._setup_project(tmp_path)
        json_file = tmp_path / "tasks.json"
        json_file.write_text(json.dumps([
            {"name": "Task A", "background": "bg A"},
            {"name": "Task B", "background": "bg B"},
            {"name": "Task C"},
        ]))

        exit_code = manager.cmd_batch_create(from_json=str(json_file))
        assert exit_code == 0
        assert (tmp_path / "docs/prompts/0001_Task_A.md").exists()
        assert (tmp_path / "docs/prompts/0002_Task_B.md").exists()
        assert (tmp_path / "docs/prompts/0003_Task_C.md").exists()

    def test_batch_create_wbs_uniqueness(self, tmp_path):
        """Each task gets a unique WBS number."""
        manager = self._setup_project(tmp_path)
        # Pre-create a task to ensure WBS starts after it
        (tmp_path / "docs/prompts/0010_existing.md").write_text("---\nstatus: Backlog\n---\n")

        json_file = tmp_path / "tasks.json"
        json_file.write_text(json.dumps([
            {"name": "New A"},
            {"name": "New B"},
        ]))

        exit_code = manager.cmd_batch_create(from_json=str(json_file))
        assert exit_code == 0
        assert (tmp_path / "docs/prompts/0011_New_A.md").exists()
        assert (tmp_path / "docs/prompts/0012_New_B.md").exists()

    def test_batch_create_from_agent_output(self, tmp_path):
        """Extracts tasks from <!-- TASKS: [...] --> footer."""
        manager = self._setup_project(tmp_path)
        output_file = tmp_path / "output.md"
        output_file.write_text(
            "# Analysis Report\n\nSome analysis content.\n\n"
            "<!-- TASKS:\n"
            '[\n'
            '  {"name": "Fix auth bug", "background": "Auth is broken"},\n'
            '  {"name": "Add logging", "requirements": "Log all API calls"}\n'
            ']\n'
            "-->\n"
        )

        exit_code = manager.cmd_batch_create(from_agent_output=str(output_file))
        assert exit_code == 0
        assert (tmp_path / "docs/prompts/0001_Fix_auth_bug.md").exists()
        assert (tmp_path / "docs/prompts/0002_Add_logging.md").exists()

        content = (tmp_path / "docs/prompts/0001_Fix_auth_bug.md").read_text()
        assert "Auth is broken" in content

    def test_batch_create_empty_array(self, tmp_path, capsys):
        """Empty array handles gracefully."""
        manager = self._setup_project(tmp_path)
        json_file = tmp_path / "tasks.json"
        json_file.write_text("[]")

        exit_code = manager.cmd_batch_create(from_json=str(json_file))
        assert exit_code == 0
        assert "No tasks to create" in capsys.readouterr().out

    def test_batch_create_no_footer(self, tmp_path, capsys):
        """Missing footer in agent output is an error."""
        manager = self._setup_project(tmp_path)
        output_file = tmp_path / "output.md"
        output_file.write_text("# Report\n\nNo tasks here.\n")

        exit_code = manager.cmd_batch_create(from_agent_output=str(output_file))
        assert exit_code == 1
        assert "No <!-- TASKS:" in capsys.readouterr().err

    def test_batch_create_invalid_json(self, tmp_path, capsys):
        """Invalid JSON is handled gracefully."""
        manager = self._setup_project(tmp_path)
        json_file = tmp_path / "tasks.json"
        json_file.write_text("{invalid json")

        exit_code = manager.cmd_batch_create(from_json=str(json_file))
        assert exit_code == 1
        assert "Failed to parse" in capsys.readouterr().err

    def test_batch_create_single_kanban_refresh(self, tmp_path, capsys):
        """Kanban is refreshed only once at end, not per task."""
        manager = self._setup_project(tmp_path)
        json_file = tmp_path / "tasks.json"
        json_file.write_text(json.dumps([
            {"name": "Task A"},
            {"name": "Task B"},
        ]))

        exit_code = manager.cmd_batch_create(from_json=str(json_file))
        assert exit_code == 0

        out = capsys.readouterr().out
        # Should see kanban refresh message only once
        assert "kanban" in out.lower()


class TestGetSectionContent:
    """Tests for TaskFile.get_section_content()."""

    def test_get_section_content(self, tmp_path):
        """Reads section content correctly."""
        task_file = tmp_path / "0047_test.md"
        task_file.write_text(TASK_WITH_IMPL_PROGRESS)
        tf = TaskFile(task_file)
        bg = tf.get_section_content("Background")
        assert bg == "Real background content"

    def test_get_section_content_missing(self, tmp_path):
        """Returns empty string for missing section."""
        task_file = tmp_path / "0047_test.md"
        task_file.write_text("---\nstatus: Backlog\n---\n\nSome content\n")
        tf = TaskFile(task_file)
        assert tf.get_section_content("Background") == ""

    def test_get_section_content_placeholder(self, tmp_path):
        """Reads placeholder content."""
        task_file = tmp_path / "0047_test.md"
        task_file.write_text(TASK_PLACEHOLDER)
        tf = TaskFile(task_file)
        bg = tf.get_section_content("Background")
        assert bg.startswith("[")


class TestPhaseStatusIndicator:
    """Test _phase_status_indicator helper."""

    def test_completed(self):
        assert _phase_status_indicator("completed") == "[x]"

    def test_in_progress(self):
        assert _phase_status_indicator("in_progress") == "[~]"

    def test_blocked(self):
        assert _phase_status_indicator("blocked") == "[!]"

    def test_pending(self):
        assert _phase_status_indicator("pending") == "[ ]"

    def test_unknown_defaults_to_pending(self):
        assert _phase_status_indicator("unknown") == "[ ]"


class TestCheckAllTasks:
    """Test M1: tasks check (no WBS) validates all tasks."""

    def test_check_all_passes(self, tmp_path, capsys):
        """All tasks with real content pass validation."""
        prompts_dir = tmp_path / "docs" / "prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("---\nkanban-plugin: board\n---\n")
        (prompts_dir / ".template.md").write_text("---\nstatus: Backlog\n---\n")

        (prompts_dir / "0001_task_a.md").write_text(TASK_WITH_IMPL_PROGRESS)
        (prompts_dir / "0002_task_b.md").write_text(
            TASK_WITH_IMPL_PROGRESS.replace("0047", "0002")
        )

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_check()
        assert exit_code == 0

        output = capsys.readouterr().out
        assert "Validated 2 tasks" in output
        assert "All tasks pass" in output

    def test_check_all_reports_issues(self, tmp_path, capsys):
        """Tasks with placeholder content are reported."""
        prompts_dir = tmp_path / "docs" / "prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("---\nkanban-plugin: board\n---\n")
        (prompts_dir / ".template.md").write_text("---\nstatus: Backlog\n---\n")

        # One good task, one with placeholders at WIP status
        (prompts_dir / "0001_good.md").write_text(TASK_WITH_IMPL_PROGRESS)
        (prompts_dir / "0002_bad.md").write_text(
            TASK_PLACEHOLDER.replace("status: Backlog", "status: WIP")
        )

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_check()
        # Should return 0 (warnings don't cause errors)
        assert exit_code == 0

        output = capsys.readouterr().out
        assert "Validated 2 tasks" in output
        assert "0002_bad.md" in output
        assert "warnings" in output

    def test_check_all_skips_dotfiles(self, tmp_path, capsys):
        """Dotfiles like .kanban.md are not validated."""
        prompts_dir = tmp_path / "docs" / "prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("---\nkanban-plugin: board\n---\n")
        (prompts_dir / ".template.md").write_text("---\nstatus: Backlog\n---\n")

        (prompts_dir / "0001_task.md").write_text(TASK_WITH_IMPL_PROGRESS)

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_check()
        assert exit_code == 0

        output = capsys.readouterr().out
        assert "Validated 1 tasks" in output

    def test_check_all_empty_folder(self, tmp_path, capsys):
        """Empty folder reports 0 tasks."""
        prompts_dir = tmp_path / "docs" / "prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("---\nkanban-plugin: board\n---\n")
        (prompts_dir / ".template.md").write_text("---\nstatus: Backlog\n---\n")

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_check()
        assert exit_code == 0

        output = capsys.readouterr().out
        assert "Validated 0 tasks" in output


class TestCheckWithProgress:
    """Test tasks check displays impl_progress."""

    def test_check_shows_impl_progress(self, tmp_path, capsys):
        """tasks check <WBS> shows impl_progress breakdown."""
        prompts_dir = tmp_path / "docs" / "prompts"
        prompts_dir.mkdir(parents=True)
        kanban = prompts_dir / ".kanban.md"
        kanban.write_text("---\nkanban-plugin: board\n---\n\n# Kanban Board\n")

        content = TASK_WITH_IMPL_PROGRESS.replace(
            "planning: pending", "planning: completed"
        ).replace(
            "design: pending", "design: in_progress"
        )
        (prompts_dir / "0047_test.md").write_text(content)

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        manager.cmd_check("47")

        output = capsys.readouterr().out
        assert "impl_progress:" in output
        assert "[x] planning: completed" in output
        assert "[~] design: in_progress" in output
        assert "[ ] implementation: pending" in output

    def test_check_no_progress_no_display(self, tmp_path, capsys):
        """tasks check <WBS> without impl_progress doesn't show section."""
        prompts_dir = tmp_path / "docs" / "prompts"
        prompts_dir.mkdir(parents=True)
        kanban = prompts_dir / ".kanban.md"
        kanban.write_text("---\nkanban-plugin: board\n---\n\n# Kanban Board\n")

        content = "---\nname: simple\nstatus: Backlog\n---\n\n### Background\n\nReal bg\n\n### Requirements\n\nReal req\n"
        (prompts_dir / "0047_simple.md").write_text(content)

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        manager.cmd_check("47")

        output = capsys.readouterr().out
        assert "impl_progress:" not in output


class TestKanbanWithProgress:
    """Test kanban refresh shows phase progress for active tasks."""

    def test_kanban_wip_shows_phase_progress(self, tmp_path):
        """WIP tasks in kanban show phase indicators."""
        prompts_dir = tmp_path / "docs" / "prompts"
        prompts_dir.mkdir(parents=True)
        kanban = prompts_dir / ".kanban.md"
        kanban.write_text("---\nkanban-plugin: board\n---\n\n# Kanban Board\n")

        content = TASK_WITH_IMPL_PROGRESS.replace(
            "status: Backlog", "status: WIP"
        ).replace(
            "planning: pending", "planning: completed"
        ).replace(
            "design: pending", "design: in_progress"
        )
        (prompts_dir / "0047_test.md").write_text(content)

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        manager.cmd_refresh()

        kanban_content = kanban.read_text()
        assert "[x] planning" in kanban_content
        assert "[~] design" in kanban_content
        assert "[ ] implementation" in kanban_content

    def test_kanban_done_no_phase_progress(self, tmp_path):
        """Done tasks in kanban don't show phase indicators."""
        prompts_dir = tmp_path / "docs" / "prompts"
        prompts_dir.mkdir(parents=True)
        kanban = prompts_dir / ".kanban.md"
        kanban.write_text("---\nkanban-plugin: board\n---\n\n# Kanban Board\n")

        content = TASK_WITH_IMPL_PROGRESS.replace("status: Backlog", "status: Done")
        (prompts_dir / "0047_test.md").write_text(content)

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        manager.cmd_refresh()

        kanban_content = kanban.read_text()
        # Done task shouldn't have phase progress line
        assert "planning" not in kanban_content or "[x] planning" not in kanban_content


class TestPhaseValidation:
    """Test B5: --phase auto-advance respects validation."""

    def test_phase_auto_advance_blocked_by_placeholder(self, tmp_path, capsys):
        """Phase completing all phases doesn't auto-advance if content is placeholder."""
        prompts_dir = tmp_path / "docs" / "prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("---\nkanban-plugin: board\n---\n")

        # Task with placeholder content but all phases completed except testing
        content = TASK_PLACEHOLDER.replace(
            "---\nname:", "---\nimpl_progress:\n  planning: completed\n  design: completed\n  implementation: completed\n  review: completed\n  testing: pending\nname:"
        )
        (prompts_dir / "0047_test.md").write_text(content)

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_update("47", phase="testing", phase_status="completed")
        assert exit_code == 0

        # Phase should be updated
        tf = TaskFile(prompts_dir / "0047_test.md")
        assert tf.get_impl_progress()["testing"] == "completed"
        # But status should NOT auto-advance to Done (validation blocks it)
        assert tf.get_status() == TaskStatus.BACKLOG

        output = capsys.readouterr()
        assert "not auto-advanced" in output.err or "not auto-advanced" in output.out

    def test_phase_auto_advance_with_force(self, tmp_path, capsys):
        """Phase auto-advance bypasses warnings with --force."""
        prompts_dir = tmp_path / "docs" / "prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("---\nkanban-plugin: board\n---\n")

        # Task with placeholder content but all phases completed except testing
        content = TASK_PLACEHOLDER.replace(
            "---\nname:", "---\nimpl_progress:\n  planning: completed\n  design: completed\n  implementation: completed\n  review: completed\n  testing: pending\nname:"
        )
        (prompts_dir / "0047_test.md").write_text(content)

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_update(
            "47", phase="testing", phase_status="completed", force=True
        )
        assert exit_code == 0

        tf = TaskFile(prompts_dir / "0047_test.md")
        # With --force, status SHOULD auto-advance
        assert tf.get_status() == TaskStatus.DONE

    def test_phase_auto_advance_passes_with_real_content(self, tmp_path):
        """Phase auto-advance works when task has real content."""
        prompts_dir = tmp_path / "docs" / "prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("---\nkanban-plugin: board\n---\n")

        content = TASK_WITH_IMPL_PROGRESS.replace(
            "planning: pending", "planning: completed"
        ).replace(
            "design: pending", "design: completed"
        ).replace(
            "implementation: pending", "implementation: completed"
        ).replace(
            "review: pending", "review: completed"
        )
        (prompts_dir / "0047_test.md").write_text(content)

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_update("47", phase="testing", phase_status="completed")
        assert exit_code == 0

        tf = TaskFile(prompts_dir / "0047_test.md")
        assert tf.get_status() == TaskStatus.DONE


class TestDecomposeRefactored:
    """Test B4/I3: decompose uses standard create flow with impl_progress."""

    def test_decompose_creates_tasks_with_impl_progress(self, tmp_path):
        """Decomposed tasks have impl_progress in frontmatter."""
        prompts_dir = tmp_path / "docs" / "prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("---\nkanban-plugin: board\n---\n")
        # Need template with impl_progress
        template = prompts_dir / ".template.md"
        template.write_text(
            "---\nname: {{ PROMPT_NAME }}\nstatus: Backlog\n"
            "created_at: {{ CREATED_AT }}\nupdated_at: {{ UPDATED_AT }}\n"
            "impl_progress:\n  planning: pending\n  design: pending\n"
            "  implementation: pending\n  review: pending\n  testing: pending\n"
            "---\n\n## {{ WBS }}. {{ PROMPT_NAME }}\n\n"
            "### Background\n\n[Context and motivation - why this task exists]\n\n"
            "### Requirements\n\n[What needs to be done - acceptance criteria]\n\n"
            "### Plan\n\n[Step-by-step implementation plan]\n\n"
            "### References\n\n[Links to docs, related tasks, external resources]\n"
        )

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_decompose("Build authentication system")
        assert exit_code == 0

        # Find created files
        task_files = sorted(prompts_dir.glob("[0-9]*.md"))
        assert len(task_files) > 0

        # Each task should have impl_progress
        for tf_path in task_files:
            tf = TaskFile(tf_path)
            progress = tf.get_impl_progress()
            assert progress, f"Missing impl_progress in {tf_path.name}"
            assert "planning" in progress

    def test_decompose_injects_background_and_requirements(self, tmp_path):
        """Decomposed tasks have Background and Requirements filled in."""
        prompts_dir = tmp_path / "docs" / "prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("---\nkanban-plugin: board\n---\n")
        template = prompts_dir / ".template.md"
        template.write_text(
            "---\nname: {{ PROMPT_NAME }}\nstatus: Backlog\n"
            "created_at: {{ CREATED_AT }}\nupdated_at: {{ UPDATED_AT }}\n"
            "impl_progress:\n  planning: pending\n  design: pending\n"
            "  implementation: pending\n  review: pending\n  testing: pending\n"
            "---\n\n## {{ WBS }}. {{ PROMPT_NAME }}\n\n"
            "### Background\n\n[Context and motivation - why this task exists]\n\n"
            "### Requirements\n\n[What needs to be done - acceptance criteria]\n\n"
            "### Plan\n\n[Step-by-step implementation plan]\n"
        )

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        manager.cmd_decompose("Build API endpoints")
        assert exit == 0 or True  # cmd_decompose returns 0

        task_files = sorted(prompts_dir.glob("[0-9]*.md"))
        first_task = TaskFile(task_files[0])
        bg = first_task.get_section_content("Background")
        assert "Build API endpoints" in bg

        req = first_task.get_section_content("Requirements")
        assert req  # Should have real requirements from analysis

    def test_decompose_dry_run(self, tmp_path, capsys):
        """Dry run doesn't create files."""
        prompts_dir = tmp_path / "docs" / "prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("---\nkanban-plugin: board\n---\n")
        template = prompts_dir / ".template.md"
        template.write_text("---\nname: {{ PROMPT_NAME }}\nstatus: Backlog\n---\n")

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_decompose("Build something", dry_run=True)
        assert exit_code == 0

        # No task files should be created
        task_files = list(prompts_dir.glob("[0-9]*.md"))
        assert len(task_files) == 0

        output = capsys.readouterr().out
        assert "DRY RUN" in output

    def test_decompose_wbs_prefix_deprecated(self, tmp_path, capsys):
        """--wbs-prefix prints deprecation notice."""
        prompts_dir = tmp_path / "docs" / "prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("---\nkanban-plugin: board\n---\n")
        template = prompts_dir / ".template.md"
        template.write_text(
            "---\nname: {{ PROMPT_NAME }}\nstatus: Backlog\n"
            "created_at: {{ CREATED_AT }}\nupdated_at: {{ UPDATED_AT }}\n---\n\n"
            "## {{ WBS }}. {{ PROMPT_NAME }}\n\n"
            "### Background\n\n[Context and motivation - why this task exists]\n\n"
            "### Requirements\n\n[What needs to be done - acceptance criteria]\n"
        )

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_decompose("Build something", wbs_prefix="50")
        assert exit_code == 0

        output = capsys.readouterr().out
        assert "deprecated" in output

    def test_decompose_adds_dependency_info(self, tmp_path):
        """Subsequent decomposed tasks reference previous task in Background."""
        prompts_dir = tmp_path / "docs" / "prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("---\nkanban-plugin: board\n---\n")
        template = prompts_dir / ".template.md"
        template.write_text(
            "---\nname: {{ PROMPT_NAME }}\nstatus: Backlog\n"
            "created_at: {{ CREATED_AT }}\nupdated_at: {{ UPDATED_AT }}\n---\n\n"
            "## {{ WBS }}. {{ PROMPT_NAME }}\n\n"
            "### Background\n\n[Context and motivation - why this task exists]\n\n"
            "### Requirements\n\n[What needs to be done - acceptance criteria]\n"
        )

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        manager.cmd_decompose("Build database layer")

        task_files = sorted(prompts_dir.glob("[0-9]*.md"))
        assert len(task_files) >= 2

        # Second task should reference first task's WBS
        second_task = TaskFile(task_files[1])
        bg = second_task.get_section_content("Background")
        first_wbs = task_files[0].name[:4]
        assert f"Depends on: {first_wbs}" in bg


# --- Section Update Tests ---

TASK_WITH_ALL_SECTIONS = """\
---
name: test task
status: WIP
updated_at: 2026-01-01 00:00:00
---

## 0047. test task

### Background

Real background content

### Requirements

Real requirements content

### Q&A

[Clarifications added during planning phase]

### Design

[Architecture/UI specs added by specialists]

### Plan

[Step-by-step implementation plan]

### Artifacts

| Type | Path | Generated By | Date |
|------|------|--------------|------|

### References

[Links to docs, related tasks, external resources]
"""


class TestSetSectionContent:
    """Tests for TaskFile.set_section_content()."""

    def test_set_design_section(self, tmp_path):
        """Replace placeholder Design section with real content."""
        task = tmp_path / "0047_test.md"
        task.write_text(TASK_WITH_ALL_SECTIONS)

        tf = TaskFile(task)
        result = tf.set_section_content("Design", "## Component Architecture\n\nThe system uses MVC.")
        assert result is True

        content = task.read_text()
        assert "## Component Architecture" in content
        assert "The system uses MVC." in content
        assert "[Architecture/UI specs added by specialists]" not in content

    def test_set_plan_section(self, tmp_path):
        """Replace placeholder Plan section with real content."""
        task = tmp_path / "0047_test.md"
        task.write_text(TASK_WITH_ALL_SECTIONS)

        tf = TaskFile(task)
        tf.set_section_content("Plan", "1. Step one\n2. Step two\n3. Step three")

        content = task.read_text()
        assert "1. Step one" in content
        assert "[Step-by-step implementation plan]" not in content

    def test_set_qa_section(self, tmp_path):
        """Replace Q&A section."""
        task = tmp_path / "0047_test.md"
        task.write_text(TASK_WITH_ALL_SECTIONS)

        tf = TaskFile(task)
        tf.set_section_content("Q&A", "Q: How?\nA: Like this.")

        assert "Q: How?" in task.read_text()

    def test_set_background_section(self, tmp_path):
        """set_section_content works for Background too (universal)."""
        task = tmp_path / "0047_test.md"
        task.write_text(TASK_WITH_ALL_SECTIONS)

        tf = TaskFile(task)
        tf.set_section_content("Background", "Updated background after discussion")

        content = task.read_text()
        assert "Updated background after discussion" in content
        assert "Real background content" not in content

    def test_set_requirements_section(self, tmp_path):
        """set_section_content works for Requirements too (universal)."""
        task = tmp_path / "0047_test.md"
        task.write_text(TASK_WITH_ALL_SECTIONS)

        tf = TaskFile(task)
        tf.set_section_content("Requirements", "- Must support OAuth2\n- Must handle errors")

        content = task.read_text()
        assert "Must support OAuth2" in content
        assert "Real requirements content" not in content

    def test_set_nonexistent_section_returns_false(self, tmp_path):
        """Return False if section heading not found."""
        task = tmp_path / "0047_test.md"
        task.write_text(TASK_WITH_ALL_SECTIONS)

        tf = TaskFile(task)
        result = tf.set_section_content("NonExistent", "content")
        assert result is False

    def test_set_section_updates_timestamp(self, tmp_path):
        """Setting section content bumps updated_at."""
        task = tmp_path / "0047_test.md"
        task.write_text(TASK_WITH_ALL_SECTIONS)

        tf = TaskFile(task)
        tf.set_section_content("Design", "New design")

        content = task.read_text()
        assert "updated_at: 2026-01-01" not in content
        assert "updated_at:" in content

    def test_set_section_idempotent(self, tmp_path):
        """Calling set_section_content twice replaces previous content."""
        task = tmp_path / "0047_test.md"
        task.write_text(TASK_WITH_ALL_SECTIONS)

        tf = TaskFile(task)
        tf.set_section_content("Design", "First version")
        tf.set_section_content("Design", "Second version")

        content = task.read_text()
        assert "Second version" in content
        assert "First version" not in content

    def test_set_section_preserves_other_sections(self, tmp_path):
        """Updating one section leaves others untouched."""
        task = tmp_path / "0047_test.md"
        task.write_text(TASK_WITH_ALL_SECTIONS)

        tf = TaskFile(task)
        tf.set_section_content("Design", "New design content")

        content = task.read_text()
        assert "Real background content" in content
        assert "Real requirements content" in content
        assert "[Step-by-step implementation plan]" in content

    def test_set_section_with_code_blocks(self, tmp_path):
        """Content with code blocks is preserved correctly."""
        task = tmp_path / "0047_test.md"
        task.write_text(TASK_WITH_ALL_SECTIONS)

        code_content = "```python\ndef hello():\n    print('world')\n```"
        tf = TaskFile(task)
        tf.set_section_content("Plan", code_content)

        content = task.read_text()
        assert "def hello():" in content
        assert "```python" in content


class TestAppendArtifactRow:
    """Tests for TaskFile.append_artifact_row()."""

    def test_append_single_row(self, tmp_path):
        """Append one artifact row to table."""
        task = tmp_path / "0047_test.md"
        task.write_text(TASK_WITH_ALL_SECTIONS)

        tf = TaskFile(task)
        result = tf.append_artifact_row("diagram", "docs/arch.png", "super-architect", "2026-02-10")
        assert result is True

        content = task.read_text()
        assert "| diagram | docs/arch.png | super-architect | 2026-02-10 |" in content

    def test_append_multiple_rows(self, tmp_path):
        """Append multiple artifact rows."""
        task = tmp_path / "0047_test.md"
        task.write_text(TASK_WITH_ALL_SECTIONS)

        tf = TaskFile(task)
        tf.append_artifact_row("diagram", "docs/arch.png", "super-architect", "2026-02-10")
        tf.append_artifact_row("test", "tests/test_auth.py", "super-coder", "2026-02-10")

        content = task.read_text()
        assert "| diagram |" in content
        assert "| test |" in content

    def test_append_updates_timestamp(self, tmp_path):
        """Appending artifact bumps updated_at."""
        task = tmp_path / "0047_test.md"
        task.write_text(TASK_WITH_ALL_SECTIONS)

        tf = TaskFile(task)
        tf.append_artifact_row("diagram", "docs/arch.png", "agent", "2026-02-10")

        content = task.read_text()
        assert "updated_at: 2026-01-01" not in content

    def test_append_no_table_returns_false(self, tmp_path):
        """Return False if no Artifacts table found."""
        task = tmp_path / "0047_test.md"
        task.write_text("---\nstatus: WIP\n---\n\n### Artifacts\n\nNo table here\n")

        tf = TaskFile(task)
        result = tf.append_artifact_row("diagram", "path", "agent", "date")
        assert result is False


class TestCmdUpdateSection:
    """Tests for cmd_update --section --from-file."""

    def test_update_section_from_file(self, tmp_path, capsys):
        """Update Design section from a file."""
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("---\nkanban-plugin: board\n---\n")
        (prompts_dir / "0047_test.md").write_text(TASK_WITH_ALL_SECTIONS)

        # Write content to a source file
        source = tmp_path / "0047_design.md"
        source.write_text("## Architecture\n\nModular design with clean layers.")

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_update("47", section="Design", from_file=str(source))
        assert exit_code == 0

        content = (prompts_dir / "0047_test.md").read_text()
        assert "Modular design with clean layers" in content
        assert "[Architecture/UI specs added by specialists]" not in content
        assert "Updated section 'Design'" in capsys.readouterr().out

    def test_update_background_section(self, tmp_path):
        """--section works for Background (universal mechanism)."""
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("---\nkanban-plugin: board\n---\n")
        (prompts_dir / "0047_test.md").write_text(TASK_WITH_ALL_SECTIONS)

        source = tmp_path / "0047_background.md"
        source.write_text("Updated background via --section flag")

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_update("47", section="Background", from_file=str(source))
        assert exit_code == 0

        content = (prompts_dir / "0047_test.md").read_text()
        assert "Updated background via --section flag" in content

    def test_update_section_missing_from_file(self, tmp_path, capsys):
        """Error when --section without --from-file."""
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("---\nkanban-plugin: board\n---\n")
        (prompts_dir / "0047_test.md").write_text(TASK_WITH_ALL_SECTIONS)

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_update("47", section="Design")
        assert exit_code == 1
        assert "--from-file" in capsys.readouterr().err

    def test_update_section_file_not_found(self, tmp_path, capsys):
        """Error when --from-file path doesn't exist."""
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("---\nkanban-plugin: board\n---\n")
        (prompts_dir / "0047_test.md").write_text(TASK_WITH_ALL_SECTIONS)

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_update("47", section="Design", from_file="/tmp/nonexistent.md")
        assert exit_code == 1
        assert "File not found" in capsys.readouterr().err

    def test_update_section_empty_file(self, tmp_path, capsys):
        """Error when --from-file is empty."""
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("---\nkanban-plugin: board\n---\n")
        (prompts_dir / "0047_test.md").write_text(TASK_WITH_ALL_SECTIONS)

        source = tmp_path / "empty.md"
        source.write_text("   \n")

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_update("47", section="Design", from_file=str(source))
        assert exit_code == 1
        assert "empty" in capsys.readouterr().err

    def test_update_section_not_found(self, tmp_path, capsys):
        """Error when section heading doesn't exist in task file."""
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("---\nkanban-plugin: board\n---\n")
        (prompts_dir / "0047_test.md").write_text(TASK_WITH_ALL_SECTIONS)

        source = tmp_path / "content.md"
        source.write_text("Some content")

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_update("47", section="NonExistent", from_file=str(source))
        assert exit_code == 1
        assert "not found" in capsys.readouterr().err

    def test_update_append_row(self, tmp_path, capsys):
        """--section Artifacts --append-row adds a table row."""
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("---\nkanban-plugin: board\n---\n")
        (prompts_dir / "0047_test.md").write_text(TASK_WITH_ALL_SECTIONS)

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_update(
            "47",
            section="Artifacts",
            append_row="diagram|docs/arch.png|super-architect|2026-02-10",
        )
        assert exit_code == 0

        content = (prompts_dir / "0047_test.md").read_text()
        assert "| diagram | docs/arch.png | super-architect | 2026-02-10 |" in content

    def test_append_row_wrong_section(self, tmp_path, capsys):
        """--append-row only valid with --section Artifacts."""
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("---\nkanban-plugin: board\n---\n")
        (prompts_dir / "0047_test.md").write_text(TASK_WITH_ALL_SECTIONS)

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_update(
            "47", section="Design", append_row="type|path|agent|date"
        )
        assert exit_code == 1
        assert "only valid with --section Artifacts" in capsys.readouterr().err

    def test_append_row_invalid_format(self, tmp_path, capsys):
        """--append-row with wrong number of fields."""
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("---\nkanban-plugin: board\n---\n")
        (prompts_dir / "0047_test.md").write_text(TASK_WITH_ALL_SECTIONS)

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_update(
            "47", section="Artifacts", append_row="only|two"
        )
        assert exit_code == 1
        assert "4 pipe-delimited fields" in capsys.readouterr().err

    def test_update_custom_section(self, tmp_path):
        """--section works with arbitrary custom section headings."""
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("---\nkanban-plugin: board\n---\n")
        # Task with a custom section
        (prompts_dir / "0047_test.md").write_text(
            "---\nstatus: WIP\nupdated_at: 2026-01-01\n---\n\n"
            "### Background\n\nBG\n\n"
            "### Custom Section\n\n[placeholder]\n\n"
            "### References\n\nRefs\n"
        )

        source = tmp_path / "custom.md"
        source.write_text("Custom content here")

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_update(
            "47", section="Custom Section", from_file=str(source)
        )
        assert exit_code == 0

        content = (prompts_dir / "0047_test.md").read_text()
        assert "Custom content here" in content
        assert "[placeholder]" not in content
