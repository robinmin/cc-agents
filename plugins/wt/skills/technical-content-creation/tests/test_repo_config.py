"""
Unit tests for repo-config.py module.

Tests cover:
- RepoValidator class
- load_collections_json() function
- list_collections() function
- list_topics_in_collection() function
- set_default_collection() function
- CLI commands (cmd_detect, cmd_set_root, cmd_validate, cmd_list_collections,
              cmd_list_topics, cmd_set_default_collection)
"""

import json
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock

# Import shared module first (needed by repo_config)
from shared.config import get_tcc_config, get_tcc_repo_root, WTConfigPath

from repo_config import (
    RepoValidator,
    load_collections_json,
    list_collections,
    list_topics_in_collection,
    set_default_collection,
    cmd_detect,
    cmd_set_root,
    cmd_validate,
    cmd_list_collections,
    cmd_list_topics,
    cmd_set_default_collection,
    REQUIRED_FOLDERS,
    COLLECTIONS_FILE
)

from shared.config import get_tcc_config, get_tcc_repo_root, set_tcc_repo_root


# ============================================================================
# RepoValidator Tests
# ============================================================================

class TestRepoValidator:
    """Tests for RepoValidator class."""

    def test_validate_valid_repo_root(self, mock_valid_repo):
        """Test validation of valid repository."""
        validator = RepoValidator()
        is_valid, errors = validator.validate_repo_root(mock_valid_repo)
        assert is_valid is True
        assert len(errors) == 0

    def test_validate_missing_directory(self, tmp_path):
        """Test validation of missing directory."""
        validator = RepoValidator()
        non_existent = tmp_path / "nonexistent"
        is_valid, errors = validator.validate_repo_root(non_existent)
        assert is_valid is False
        assert len(errors) > 0
        assert any("does not exist" in e for e in errors)

    def test_validate_not_a_directory(self, tmp_path):
        """Test validation when path is not a directory."""
        validator = RepoValidator()
        file_path = tmp_path / "file.txt"
        file_path.write_text("test")
        is_valid, errors = validator.validate_repo_root(file_path)
        assert is_valid is False
        assert any("not a directory" in e for e in errors)

    def test_validate_missing_collections_json(self, tmp_path):
        """Test validation when collections.json is missing."""
        validator = RepoValidator()
        incomplete_repo = tmp_path / "incomplete"
        incomplete_repo.mkdir()
        (incomplete_repo / "collections").mkdir()
        # Missing collections.json

        is_valid, errors = validator.validate_repo_root(incomplete_repo)
        assert is_valid is False
        assert any("Missing required item" in e for e in errors)

    def test_validate_missing_collections_directory(self, tmp_path):
        """Test validation when collections/ is missing."""
        validator = RepoValidator()
        incomplete_repo = tmp_path / "incomplete"
        incomplete_repo.mkdir()
        (incomplete_repo / "collections.json").write_text('{"collections": []}')
        # Missing collections/ directory

        is_valid, errors = validator.validate_repo_root(incomplete_repo)
        assert is_valid is False
        assert any("Missing required item" in e for e in errors)

    def test_validate_collection_dir_valid(self, tmp_path):
        """Test validation of valid collection directory."""
        validator = RepoValidator()
        collection_dir = tmp_path / "collection"
        collection_dir.mkdir()

        is_valid, errors = validator.validate_collection_dir(collection_dir)
        assert is_valid is True
        assert len(errors) == 0

    def test_validate_collection_dir_missing(self, tmp_path):
        """Test validation of missing collection directory."""
        validator = RepoValidator()
        non_existent = tmp_path / "nonexistent"

        is_valid, errors = validator.validate_collection_dir(non_existent)
        assert is_valid is False
        assert len(errors) > 0


# ============================================================================
# load_collections_json() Tests
# ============================================================================

class TestLoadCollectionsJson:
    """Tests for load_collections_json() function."""

    def test_load_valid_collections(self, mock_valid_repo):
        """Test loading valid collections.json."""
        data = load_collections_json(mock_valid_repo)
        assert "collections" in data
        assert isinstance(data["collections"], list)

    def test_file_not_found(self, tmp_path):
        """Test FileNotFoundError when file doesn't exist."""
        repo_root = tmp_path / "no_collections"
        repo_root.mkdir()

        with pytest.raises(FileNotFoundError, match="Collections file not found"):
            load_collections_json(repo_root)

    def test_malformed_json(self, tmp_path):
        """Test JSONDecodeError for malformed JSON."""
        repo_root = tmp_path / "bad_json"
        repo_root.mkdir()
        (repo_root / "collections.json").write_text("{invalid}")

        with pytest.raises(json.JSONDecodeError):
            load_collections_json(repo_root)


# ============================================================================
# list_collections() Tests
# ============================================================================

class TestListCollections:
    """Tests for list_collections() function."""

    def test_lists_collections(self, mock_valid_repo):
        """Test listing all collections."""
        collections = list_collections(mock_valid_repo)
        assert len(collections) >= 1
        assert all("id" in col for col in collections)

    def test_returns_empty_list(self, tmp_path):
        """Test returning empty list when no collections."""
        repo_root = tmp_path / "empty"
        repo_root.mkdir()
        (repo_root / "collections.json").write_text('{"collections": []}')
        (repo_root / "collections").mkdir()

        collections = list_collections(repo_root)
        assert collections == []

    def test_uses_configured_repo_root(self, mock_valid_repo):
        """Test using configured repo root when not provided."""
        with patch('repo_config.get_tcc_repo_root', return_value=mock_valid_repo):
            collections = list_collections()
            assert isinstance(collections, list)

    def test_raises_error_when_no_repo_root(self):
        """Test error when repo root not configured."""
        with patch('repo_config.get_tcc_repo_root', return_value=None):
            with pytest.raises(FileNotFoundError, match="Repository root not configured"):
                list_collections()


# ============================================================================
# list_topics_in_collection() Tests
# ============================================================================

class TestListTopicsInCollection:
    """Tests for list_topics_in_collection() function."""

    def test_lists_topics(self, mock_valid_repo):
        """Test listing topics in a collection."""
        # Create a test topic with topic.md
        test_collection_dir = mock_valid_repo / "collections" / "test-collection"
        test_topic_dir = test_collection_dir / "test-topic"
        test_topic_dir.mkdir()
        (test_topic_dir / "topic.md").write_text(
            "---\nname: test-topic\ntitle: Test Topic\nstatus: draft\n---\n"
        )

        with patch('repo_config.get_tcc_config', return_value={"collections_path": "collections"}):
            topics = list_topics_in_collection("test-collection", mock_valid_repo)
            assert len(topics) >= 1
            assert all("id" in topic for topic in topics)

    def test_parses_topic_md_frontmatter(self, mock_valid_repo):
        """Test parsing topic.md frontmatter."""
        topics = list_topics_in_collection("test-collection", mock_valid_repo)
        if topics:
            topic = topics[0]
            assert "name" in topic
            assert "title" in topic
            assert "status" in topic

    def test_handles_topics_without_topic_md(self, tmp_path):
        """Test handling topics without topic.md (should be skipped)."""
        repo_root = tmp_path / "repo"
        repo_root.mkdir()
        (repo_root / "collections.json").write_text('{"collections": []}')
        collections_dir = repo_root / "collections"
        collections_dir.mkdir()
        collection_dir = collections_dir / "test"
        collection_dir.mkdir()

        # Create topic without topic.md
        topic_dir = collection_dir / "no-md"
        topic_dir.mkdir()

        with patch('repo_config.get_tcc_config', return_value={"collections_path": "collections"}):
            # Topics without topic.md should be skipped
            topics = list_topics_in_collection("test", repo_root)
            assert len(topics) == 0

    def test_returns_empty_list_for_empty_collection(self, tmp_path):
        """Test returning empty list for collection with no topics."""
        repo_root = tmp_path / "repo"
        repo_root.mkdir()
        (repo_root / "collections.json").write_text('{"collections": []}')
        collections_dir = repo_root / "collections"
        collections_dir.mkdir()
        collection_dir = collections_dir / "empty"
        collection_dir.mkdir()

        with patch('repo_config.get_tcc_config', return_value={"collections_path": "collections"}):
            topics = list_topics_in_collection("empty", repo_root)
            assert topics == []

    def test_sorts_topics_by_id(self, mock_valid_repo):
        """Test that topics are sorted by ID."""
        topics = list_topics_in_collection("test-collection", mock_valid_repo)
        ids = [t["id"] for t in topics]
        assert ids == sorted(ids)

    def test_raises_error_for_missing_collection(self, mock_valid_repo):
        """Test error for non-existent collection."""
        with pytest.raises(FileNotFoundError, match="Collection not found"):
            list_topics_in_collection("nonexistent", mock_valid_repo)


# ============================================================================
# set_default_collection() Tests
# ============================================================================

class TestSetDefaultCollection:
    """Tests for set_default_collection() function."""

    def test_sets_valid_collection(self, mock_valid_repo):
        """Test setting a valid collection as default."""
        with patch('repo_config.get_tcc_repo_root', return_value=mock_valid_repo):
            set_default_collection("test-collection")
            # Should not raise

    def test_raises_value_error_for_invalid_collection(self, mock_valid_repo):
        """Test ValueError for non-existent collection."""
        with patch('repo_config.get_tcc_repo_root', return_value=mock_valid_repo):
            with pytest.raises(ValueError, match="Collection .* not found"):
                set_default_collection("nonexistent-collection")

    def test_raises_error_when_no_repo_root(self):
        """Test error when repo root not configured."""
        with patch('repo_config.get_tcc_repo_root', return_value=None):
            with pytest.raises(FileNotFoundError, match="Repository root not configured"):
                set_default_collection("test")


# ============================================================================
# CLI Commands Tests
# ============================================================================

class TestCmdDetect:
    """Tests for cmd_detect() function."""

    def test_prints_configured_root(self, capsys):
        """Test printing configured repository root."""
        args = MagicMock()

        with patch('repo_config.get_tcc_repo_root', return_value=Path("/mock/root")):
            cmd_detect(args)
            captured = capsys.readouterr()
            assert "Repository root:" in captured.out
            assert "/mock/root" in captured.out

    def test_prints_not_configured_message(self, capsys):
        """Test message when root not configured."""
        args = MagicMock()

        with patch('repo_config.get_tcc_repo_root', return_value=None):
            with pytest.raises(SystemExit):
                cmd_detect(args)
            captured = capsys.readouterr()
            assert "Not configured" in captured.out

    def test_validates_root(self, capsys):
        """Test that configured root is validated."""
        args = MagicMock()
        mock_root = Path("/mock/root")

        with patch('repo_config.get_tcc_repo_root', return_value=mock_root), \
             patch('repo_config.RepoValidator') as mock_validator:
            mock_v = MagicMock()
            mock_v.validate_repo_root.return_value = (True, [])
            mock_validator.return_value = mock_v

            cmd_detect(args)
            captured = capsys.readouterr()
            mock_v.validate_repo_root.assert_called_once_with(mock_root)


class TestCmdSetRoot:
    """Tests for cmd_set_root() function."""

    def test_sets_valid_root(self, mock_valid_repo, capsys):
        """Test setting a valid repository root."""
        args = MagicMock()
        args.path = str(mock_valid_repo)

        with patch('repo_config.Path') as mock_path, \
             patch('repo_config.set_tcc_repo_root') as mock_set:
            mock_path.return_value = mock_valid_repo
            mock_v = MagicMock()
            mock_v.validate_repo_root.return_value = (True, [])

            with patch('repo_config.RepoValidator', return_value=mock_v):
                cmd_set_root(args)
                captured = capsys.readouterr()
                assert "Repository root set to:" in captured.out

    def test_validates_before_setting(self, tmp_path):
        """Test that validation happens before setting."""
        args = MagicMock()
        invalid_path = tmp_path / "invalid"

        with patch('repo_config.Path') as mock_path, \
             patch('repo_config.RepoValidator') as mock_validator:
            mock_path.return_value.expanduser.resolve.return_value = invalid_path
            mock_v = MagicMock()
            mock_v.validate_repo_root.return_value = (False, ["Missing required"])

            with patch('repo_config.RepoValidator', return_value=mock_v):
                with pytest.raises(SystemExit):
                    cmd_set_root(args)


class TestCmdValidate:
    """Tests for cmd_validate() function."""

    def test_valid_repo_exits_0(self, mock_valid_repo):
        """Test exits 0 for valid repository."""
        args = MagicMock()

        with patch('repo_config.get_tcc_repo_root', return_value=mock_valid_repo):
            with pytest.raises(SystemExit) as exc_info:
                cmd_validate(args)
            assert exc_info.value.code == 0

    def test_invalid_repo_exits_1(self, tmp_path):
        """Test exits 1 for invalid repository."""
        args = MagicMock()
        invalid_repo = tmp_path / "invalid"
        invalid_repo.mkdir()

        with patch('repo_config.get_tcc_repo_root', return_value=invalid_repo):
            with pytest.raises(SystemExit) as exc_info:
                cmd_validate(args)
            assert exc_info.value.code == 1


class TestCmdListCollections:
    """Tests for cmd_list_collections() function."""

    def test_lists_all_collections(self, mock_valid_repo, capsys):
        """Test listing all collections."""
        args = MagicMock()

        with patch('repo_config.list_collections', return_value=[
            {"id": "test", "name": "Test", "topic_count": 1}
        ]):
            cmd_list_collections(args)
            captured = capsys.readouterr()
            assert "test" in captured.out
            assert "Test" in captured.out

    def test_handles_empty_collections(self, capsys):
        """Test handling empty collections list."""
        args = MagicMock()

        with patch('repo_config.list_collections', return_value=[]):
            cmd_list_collections(args)
            captured = capsys.readouterr()
            assert "No collections found" in captured.out


class TestCmdListTopics:
    """Tests for cmd_list_topics() function."""

    def test_lists_topics_in_collection(self, mock_valid_repo, capsys):
        """Test listing topics."""
        args = MagicMock()
        args.collection = "test-collection"

        with patch('repo_config.list_topics_in_collection', return_value=[
            {"id": "topic-1", "title": "Topic 1", "status": "draft"}
        ]):
            cmd_list_topics(args)
            captured = capsys.readouterr()
            assert "topic-1" in captured.out

    def test_handles_empty_topics(self, capsys):
        """Test handling empty topic list."""
        args = MagicMock()
        args.collection = "test"

        with patch('repo_config.list_topics_in_collection', return_value=[]):
            cmd_list_topics(args)
            captured = capsys.readouterr()
            assert "No topics found" in captured.out


class TestCmdSetDefaultCollection:
    """Tests for cmd_set_default_collection() function."""

    def test_sets_default_collection(self, capsys):
        """Test setting default collection."""
        args = MagicMock()
        args.name = "test-collection"

        with patch('repo_config.set_default_collection'):
            cmd_set_default_collection(args)
            captured = capsys.readouterr()
            assert "Default collection set to:" in captured.out

    def test_shows_current_config(self, capsys):
        """Test showing current configuration."""
        args = MagicMock()
        args.name = "test-collection"

        mock_config = {
            "tcc_repo_root": "/mock/root",
            "default_collection": "test-collection"
        }

        with patch('repo_config.set_default_collection'), \
             patch('repo_config.get_tcc_config', return_value=mock_config):
            cmd_set_default_collection(args)
            captured = capsys.readouterr()
            assert "Current TCC configuration:" in captured.out


# ============================================================================
# Constants Tests
# ============================================================================

class TestConstants:
    """Tests for module constants."""

    def test_required_folders_defined(self):
        """Test that REQUIRED_FOLDERS is defined."""
        assert isinstance(REQUIRED_FOLDERS, set)
        assert "collections.json" in REQUIRED_FOLDERS
        assert "collections" in REQUIRED_FOLDERS

    def test_collections_file_constant(self):
        """Test COLLECTIONS_FILE constant."""
        assert COLLECTIONS_FILE == "collections.json"


# ============================================================================
# Edge Cases Tests
# ============================================================================

class TestEdgeCases:
    """Tests for edge cases and special scenarios."""

    def test_malformed_topic_md(self, tmp_path):
        """Test handling malformed topic.md."""
        repo_root = tmp_path / "repo"
        repo_root.mkdir()
        (repo_root / "collections.json").write_text('{"collections": []}')
        collections_dir = repo_root / "collections"
        collections_dir.mkdir()
        collection_dir = collections_dir / "test"
        collection_dir.mkdir()

        topic_dir = collection_dir / "bad-topic"
        topic_dir.mkdir()
        (topic_dir / "topic.md").write_text("invalid {{{ frontmatter")

        topics = list_topics_in_collection("test", repo_root)
        assert len(topics) == 1

    def test_collection_name_with_special_characters(self, tmp_path):
        """Test handling collection IDs with special characters."""
        repo_root = tmp_path / "repo"
        repo_root.mkdir()
        (repo_root / "collections.json").write_text('{"collections": []}')
        collections_dir = repo_root / "collections"
        collections_dir.mkdir()
        collection_dir = collections_dir / "test-collection"
        collection_dir.mkdir()

        # Should work fine
        topics = list_topics_in_collection("test-collection", repo_root)
        assert topics == []


class TestAdditionalCoverage:
    """Additional tests for improved coverage."""

    def test_cmd_list_collections_json_decode_error(self, capsys):
        """Test cmd_list_collections with malformed JSON."""
        args = MagicMock()

        with patch('repo_config.list_collections', side_effect=json.JSONDecodeError("test", "", 0)):
            with pytest.raises(SystemExit):
                cmd_list_collections(args)
            captured = capsys.readouterr()
            assert "Invalid JSON" in captured.out

    def test_cmd_list_topics_file_not_found(self, capsys):
        """Test cmd_list_topics with collection not found."""
        args = MagicMock()
        args.collection = "nonexistent"

        with patch('repo_config.list_topics_in_collection', side_effect=FileNotFoundError("Not found")):
            with pytest.raises(SystemExit):
                cmd_list_topics(args)
            captured = capsys.readouterr()
            assert "Error:" in captured.out

    def test_cmd_set_default_collection_file_not_found(self, capsys):
        """Test cmd_set_default_collection when repo root not configured."""
        args = MagicMock()
        args.name = "test"

        with patch('repo_config.set_default_collection', side_effect=FileNotFoundError("Not configured")):
            with pytest.raises(SystemExit):
                cmd_set_default_collection(args)
            captured = capsys.readouterr()
            assert "Error:" in captured.out

    def test_cmd_set_default_collection_value_error(self, capsys):
        """Test cmd_set_default_collection with invalid collection."""
        args = MagicMock()
        args.name = "invalid"

        with patch('repo_config.set_default_collection', side_effect=ValueError("Invalid collection")):
            with pytest.raises(SystemExit):
                cmd_set_default_collection(args)
            captured = capsys.readouterr()
            assert "Error:" in captured.out

    def test_cmd_detect_nonexistent_root(self, capsys):
        """Test cmd_detect when configured root doesn't exist."""
        args = MagicMock()
        mock_root = Path("/nonexistent/root")

        with patch('repo_config.get_tcc_repo_root', return_value=mock_root), \
             patch('repo_config.RepoValidator') as mock_validator:
            mock_v = MagicMock()
            mock_v.validate_repo_root.return_value = (False, ["Does not exist"])
            mock_validator.return_value = mock_v

            cmd_detect(args)
            captured = capsys.readouterr()
            assert "Invalid repository structure" in captured.out

    def test_list_topics_with_non_topic_directories(self, mock_valid_repo):
        """Test list_topics_in_collection skips non-topic directories."""
        collection_dir = mock_valid_repo / "collections" / "test-collection"
        collection_dir.mkdir(parents=True, exist_ok=True)

        # Create a directory without topic.md
        non_topic_dir = collection_dir / "not-a-topic"
        non_topic_dir.mkdir()
        (non_topic_dir / "some-file.txt").write_text("test")

        with patch('repo_config.get_tcc_config', return_value={"collections_path": "collections"}):
            topics = list_topics_in_collection("test-collection", mock_valid_repo)
            # Should not include the non-topic directory
            assert not any(t["id"] == "not-a-topic" for t in topics)

    def test_list_collections_with_valid_repo_structure(self, mock_valid_repo):
        """Test list_collections returns all collections from valid repo."""
        collections = list_collections(mock_valid_repo)
        assert len(collections) >= 1
        assert all("id" in col for col in collections)
        assert all("name" in col for col in collections)

    def test_load_collections_json_with_invalid_json(self, tmp_path):
        """Test load_collections_json with invalid JSON raises JSONDecodeError."""
        repo_root = tmp_path / "bad_json"
        repo_root.mkdir()
        (repo_root / "collections.json").write_text("{invalid json}")

        with pytest.raises(json.JSONDecodeError):
            load_collections_json(repo_root)

    def test_cmd_validate_shows_errors(self, capsys):
        """Test cmd_validate shows validation errors."""
        args = MagicMock()
        invalid_repo = Path("/invalid/path")

        with patch('repo_config.get_tcc_repo_root', return_value=invalid_repo), \
             patch('repo_config.RepoValidator') as mock_validator:
            mock_v = MagicMock()
            mock_v.validate_repo_root.return_value = (False, ["Error 1", "Error 2"])
            mock_validator.return_value = mock_v

            with pytest.raises(SystemExit):
                cmd_validate(args)

    def test_set_default_collection_with_available_collections_message(self, mock_valid_repo, capsys):
        """Test set_default_collection shows available collections on error."""
        with patch('repo_config.get_tcc_repo_root', return_value=mock_valid_repo):
            try:
                set_default_collection("nonexistent-collection")
            except ValueError as e:
                error_msg = str(e)
                assert "not found" in error_msg.lower()
                assert "available" in error_msg.lower() or "test-collection" in error_msg

    def test_main_no_command_shows_help(self, capsys):
        """Test main() with no command shows help."""
        with patch('sys.argv', ['repo-config.py']):
            with pytest.raises(SystemExit):
                from repo_config import main
                main()

    def test_main_with_detect_command(self, capsys):
        """Test main() with --detect command."""
        with patch('sys.argv', ['repo-config.py', '--detect']), \
             patch('repo_config.get_tcc_repo_root', return_value=Path("/mock/root")):
            from repo_config import main
            main()
            captured = capsys.readouterr()
            assert "Repository root:" in captured.out

    def test_main_with_list_collections_command(self, capsys):
        """Test main() with --list-collections command."""
        with patch('sys.argv', ['repo-config.py', '--list-collections']), \
             patch('repo_config.list_collections', return_value=[]):
            from repo_config import main
            main()
            captured = capsys.readouterr()
            assert "No collections found" in captured.out

    def test_main_with_validate_command(self, mock_valid_repo, capsys):
        """Test main() with --validate command."""
        with patch('sys.argv', ['repo-config.py', '--validate']), \
             patch('repo_config.get_tcc_repo_root', return_value=mock_valid_repo):
            with pytest.raises(SystemExit) as exc_info:
                from repo_config import main
                main()
            assert exc_info.value.code == 0

    def test_main_with_list_topics_command(self, capsys):
        """Test main() with --list-topics command."""
        with patch('sys.argv', ['repo-config.py', '--list-topics', 'test']), \
             patch('repo_config.list_topics_in_collection', return_value=[]):
            from repo_config import main
            main()
            captured = capsys.readouterr()
            assert "No topics found" in captured.out
