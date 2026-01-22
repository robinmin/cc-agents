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
        """Test init command."""
        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_init()

        assert exit_code == 0
        assert (tmp_path / "docs/prompts").exists()
        assert (tmp_path / "docs/prompts/.kanban.md").exists()
        assert (tmp_path / "docs/prompts/.template.md").exists()

        # Check kanban content
        kanban = (tmp_path / "docs/prompts/.kanban.md").read_text()
        assert "## Backlog" in kanban
        assert "## Todo" in kanban
        assert "## WIP" in kanban
        assert "## Testing" in kanban
        assert "## Done" in kanban

    def test_cmd_init_existing(self, tmp_path):
        """Test init command with existing setup."""
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("existing")

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        exit_code = manager.cmd_init()

        assert exit_code == 0
        # Should not overwrite existing files
        assert (prompts_dir / ".kanban.md").read_text() == "existing"

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

    @freeze_time("2026-01-21 15:00:00")
    def test_cmd_hook(self, tmp_path):
        """Test hook command for TodoWrite events."""
        # Setup
        prompts_dir = tmp_path / "docs/prompts"
        prompts_dir.mkdir(parents=True)
        (prompts_dir / ".kanban.md").write_text("test")

        manager = TasksManager(TasksConfig(project_root=tmp_path))
        data = json.dumps({"tool_input": {"items": [{"content": "Test task", "status": "pending"}]}})
        exit_code = manager.cmd_hook("add", data)

        assert exit_code == 0

        # Check hook log was created
        log_file = tmp_path / ".claude" / "tasks_hook.log"
        assert log_file.exists()
        log_content = log_file.read_text()
        assert '"operation": "add"' in log_content
        assert '"item_count": 1' in log_content
        assert "Test task" in log_content


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
            # Initialize
            with patch("sys.argv", ["tasks", "init"]):
                assert main() == 0

            # Create tasks using main()
            with patch("sys.argv", ["tasks", "create", "Task One"]):
                assert main() == 0
            with patch("sys.argv", ["tasks", "create", "Task Two"]):
                assert main() == 0

            # Update task using TasksManager API directly
            # (argparse positional limitation makes main() approach problematic)
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

            # Verify kanban
            kanban = tmp_path / "docs/prompts/.kanban.md"
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
