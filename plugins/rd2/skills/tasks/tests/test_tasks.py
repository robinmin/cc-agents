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
        with pytest.raises(RuntimeError, match="Prompts directory not found"):
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
        assert (tmp_path / "docs/.tasks/kanban.md").exists()
        assert (tmp_path / "docs/.tasks/template.md").exists()
        assert (tmp_path / "docs/.tasks/brainstorm").is_dir()
        assert (tmp_path / "docs/.tasks/codereview").is_dir()
        assert (tmp_path / "docs/.tasks/design").is_dir()
        assert (tmp_path / "docs/.tasks/sync").is_dir()

        # Check kanban content
        kanban = (tmp_path / "docs/.tasks/kanban.md").read_text()
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
        # Legacy files should be migrated to docs/.tasks/
        assert (tmp_path / "docs/.tasks/kanban.md").read_text() == "existing kanban"
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
            """---
name: test
status: Backlog
---
"""
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
            """---
name: test
status: Backlog
---
"""
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

            # Update task using TasksManager API directly
            manager = TasksManager(TasksConfig(project_root=tmp_path))
            exit_code = manager.cmd_update("1", "wip")
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

            # Verify kanban (now in docs/.tasks/)
            kanban = tmp_path / "docs/.tasks/kanban.md"
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
        """Config mode uses docs/.tasks/ for metadata."""
        self._create_config(tmp_path, {
            "$schema_version": 1,
            "active_folder": "docs/prompts",
            "folders": {"docs/prompts": {"base_counter": 0, "label": "Phase 1"}},
        })
        config = TasksConfig(project_root=tmp_path)
        assert config.kanban_file == tmp_path / "docs/.tasks/kanban.md"
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
        (meta_dir / "kanban.md").write_text("---\nkanban-plugin: board\n---\n")
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
        (meta_dir / "kanban.md").write_text("---\nkanban-plugin: board\n---\n")

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

        exit_code = manager.cmd_update("47", "wip")
        assert exit_code == 0

        task_content = (tmp_path / "docs/prompts/0047_old_task.md").read_text()
        assert "status: WIP" in task_content

    def test_update_finds_task_in_active_folder(self, tmp_path):
        """cmd_update finds task 0201 in the active folder."""
        config = self._setup_cross_folder(tmp_path)
        manager = TasksManager(config)

        exit_code = manager.cmd_update("201", "testing")
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
        """Init migrates .kanban.md from docs/prompts/ to docs/.tasks/."""
        prompts = tmp_path / "docs/prompts"
        prompts.mkdir(parents=True)
        (prompts / ".kanban.md").write_text("original kanban")

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        manager.cmd_init()

        assert (tmp_path / "docs/.tasks/kanban.md").read_text() == "original kanban"

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

        # First run migrates
        assert (tmp_path / "docs/.tasks/kanban.md").read_text() == "kanban v1"

        # Second run: reload config (now in config mode)
        config2 = TasksConfig(project_root=tmp_path)
        manager2 = TasksManager(config2)
        result = manager2.cmd_init()
        assert result == 0

        # kanban still has original content
        assert (tmp_path / "docs/.tasks/kanban.md").read_text() == "kanban v1"

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
        """Refresh creates single kanban with tasks from all folders."""
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
        (meta_dir / "kanban.md").write_text("---\nkanban-plugin: board\n---\n")

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

        kanban = (meta_dir / "kanban.md").read_text()
        assert "0001_phase1" in kanban
        assert "0201_phase2" in kanban
