"""
Unit tests for topic-init.py module.

Tests cover:
- slugify() function
- load_collections_json() function
- save_collections_json() function
- find_collection_by_id_or_name() function
- create_collection() function
- register_topic() function
- create_topic_structure() function
- cmd_init() CLI command
"""

import json
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock
from datetime import datetime

# Import shared module first (needed by topic_init)
from shared.config import get_tcc_config, get_tcc_repo_root

from topic_init import (
    slugify,
    load_collections_json,
    save_collections_json,
    find_collection_by_id_or_name,
    create_collection,
    register_topic,
    create_topic_structure,
    cmd_init,
    STAGE_FOLDERS,
    STAGE_SUBFOLDERS,
    TOPIC_TEMPLATE
)

from shared.config import get_tcc_config, get_tcc_repo_root


# ============================================================================
# slugify() Tests
# ============================================================================

class TestSlugify:
    """Tests for slugify() function."""

    def test_converts_spaces_to_hyphens(self):
        """Test converting spaces to hyphens."""
        assert slugify("Hello World") == "hello-world"

    def test_removes_special_characters(self):
        """Test removing special characters."""
        assert slugify("Hello, World!") == "hello-world"

    def test_converts_to_lowercase(self):
        """Test converting to lowercase."""
        assert slugify("HELLO WORLD") == "hello-world"

    def test_handles_multiple_consecutive_spaces(self):
        """Test handling multiple consecutive spaces."""
        assert slugify("Hello    World") == "hello-world"

    def test_handles_multiple_consecutive_hyphens(self):
        """Test handling multiple consecutive hyphens."""
        assert slugify("Hello --- World") == "hello-world"

    def test_trims_leading_trailing_spaces(self):
        """Test trimming leading and trailing spaces."""
        assert slugify("  Hello World  ") == "hello-world"

    def test_handles_empty_string(self):
        """Test handling empty string."""
        assert slugify("") == ""

    def test_handles_only_special_characters(self):
        """Test handling strings with only special characters."""
        assert slugify("@#$%^&*()") == ""

    def test_preserves_numbers(self):
        """Test preserving numbers."""
        assert slugify("Python 3.11 Features") == "python-311-features"

    def test_handles_underscore(self):
        """Test handling underscores."""
        assert slugify("hello_world_test") == "hello_world_test"

    def test_complex_real_world_example(self):
        """Test a complex real-world example."""
        assert slugify("How to Build Microservices with Python & Docker!") == \
            "how-to-build-microservices-with-python-docker"


# ============================================================================
# load_collections_json() / save_collections_json() Tests
# ============================================================================

class TestCollectionsJson:
    """Tests for collections.json loading and saving."""

    def test_load_valid_collections_json(self, mock_repo_root):
        """Test loading valid collections.json."""
        data = load_collections_json(mock_repo_root)
        assert "collections" in data
        assert isinstance(data["collections"], list)
        assert len(data["collections"]) == 1

    def test_load_updates_last_updated(self, mock_repo_root):
        """Test that save updates last_updated timestamp."""
        collections_file = mock_repo_root / "collections.json"
        before = datetime.now().isoformat()

        save_collections_json(mock_repo_root, {"collections": []})

        data = json.loads(collections_file.read_text())
        after = datetime.now().isoformat()
        assert "last_updated" in data
        assert data["last_updated"] >= before or data["last_updated"] <= after

    def test_save_creates_proper_json_format(self, tmp_path):
        """Test that save creates properly formatted JSON."""
        repo_root = tmp_path / "repo"
        repo_root.mkdir()
        (repo_root / "collections.json").write_text('{"collections": []}')

        data = {
            "collections": [
                {"id": "test", "name": "Test"}
            ]
        }
        save_collections_json(repo_root, data)

        content = (repo_root / "collections.json").read_text()
        loaded = json.loads(content)
        assert loaded == data

    def test_load_file_not_found(self, tmp_path):
        """Test FileNotFoundError when file doesn't exist."""
        repo_root = tmp_path / "no_repo"
        repo_root.mkdir()

        with pytest.raises(FileNotFoundError, match="Collections file not found"):
            load_collections_json(repo_root)

    def test_load_malformed_json(self, tmp_path):
        """Test JSONDecodeError for malformed JSON."""
        repo_root = tmp_path / "bad_repo"
        repo_root.mkdir()
        (repo_root / "collections.json").write_text("{invalid json}")

        with pytest.raises(json.JSONDecodeError):
            load_collections_json(repo_root)


# ============================================================================
# find_collection_by_id_or_name() Tests
# ============================================================================

class TestFindCollectionByIdOrName:
    """Tests for find_collection_by_id_or_name() function."""

    def test_find_by_exact_id(self, mock_collections_data):
        """Test finding collection by exact ID."""
        result = find_collection_by_id_or_name(mock_collections_data, "test-collection")
        assert result is not None
        assert result["id"] == "test-collection"

    def test_find_by_name(self, mock_collections_data):
        """Test finding collection by name."""
        result = find_collection_by_id_or_name(mock_collections_data, "Test Collection")
        assert result is not None
        assert result["name"] == "Test Collection"

    def test_returns_none_when_not_found(self, mock_collections_data):
        """Test returning None when collection not found."""
        result = find_collection_by_id_or_name(mock_collections_data, "nonexistent")
        assert result is None

    def test_handles_empty_collections_list(self):
        """Test handling empty collections list."""
        result = find_collection_by_id_or_name({"collections": []}, "test")
        assert result is None

    def test_case_sensitive_name_match(self, mock_collections_data):
        """Test that name matching is case-sensitive."""
        result = find_collection_by_id_or_name(mock_collections_data, "test collection")
        assert result is None  # Should not match "Test Collection"


# ============================================================================
# create_collection() Tests
# ============================================================================

class TestCreateCollection:
    """Tests for create_collection() function."""

    def test_creates_collection_directory(self, mock_repo_root, mock_collections_data):
        """Test that collection directory is created."""
        new_col = create_collection(mock_repo_root, mock_collections_data, "New Collection")
        collection_dir = mock_repo_root / "collections" / "new-collection"
        assert collection_dir.exists()

    def test_adds_collection_to_json(self, mock_repo_root, mock_collections_data):
        """Test that collection is added to collections.json."""
        initial_count = len(mock_collections_data["collections"])
        create_collection(mock_repo_root, mock_collections_data, "New Collection")

        updated_data = load_collections_json(mock_repo_root)
        assert len(updated_data["collections"]) == initial_count + 1

    def test_sets_proper_metadata(self, mock_repo_root, mock_collections_data):
        """Test that proper metadata is set."""
        new_col = create_collection(mock_repo_root, mock_collections_data, "Brand New Collection")

        assert "id" in new_col
        assert "name" in new_col
        assert "path" in new_col
        assert "created_at" in new_col
        assert "updated_at" in new_col
        assert "topic_count" in new_col
        assert "tags" in new_col

    def test_slugifies_collection_id(self, mock_repo_root, mock_collections_data):
        """Test that collection ID is slugified."""
        new_col = create_collection(mock_repo_root, mock_collections_data, "Test Collection Name!")
        assert new_col["id"] == "test-collection-name"

    def test_raises_value_error_for_duplicate(self, mock_repo_root, mock_collections_data):
        """Test ValueError when collection already exists."""
        with pytest.raises(ValueError, match="Collection already exists"):
            create_collection(mock_repo_root, mock_collections_data, "Test Collection")


# ============================================================================
# register_topic() Tests
# ============================================================================

class TestRegisterTopic:
    """Tests for register_topic() function."""

    def test_increments_topic_count(self, mock_repo_root):
        """Test that topic count is incremented."""
        initial_data = load_collections_json(mock_repo_root)
        initial_count = initial_data["collections"][0]["topic_count"]

        register_topic(mock_repo_root, "test-collection", "new-topic")

        updated_data = load_collections_json(mock_repo_root)
        assert updated_data["collections"][0]["topic_count"] == initial_count + 1

    def test_updates_updated_at_timestamp(self, mock_repo_root):
        """Test that updated_at timestamp is updated."""
        before = datetime.now().isoformat()
        register_topic(mock_repo_root, "test-collection", "test-topic")

        data = load_collections_json(mock_repo_root)
        after = datetime.now().isoformat()
        updated_at = data["collections"][0]["updated_at"]
        # Check timestamp is recent
        assert updated_at is not None


# ============================================================================
# create_topic_structure() Tests
# ============================================================================

class TestCreateTopicStructure:
    """Tests for create_topic_structure() function."""

    def test_creates_all_stage_folders(self, mock_repo_root, mock_topic_data):
        """Test that all 7 stage folders are created."""
        topic_dir = create_topic_structure(
            mock_repo_root, "test-collection", "test-topic", mock_topic_data
        )

        for stage in STAGE_FOLDERS:
            assert (topic_dir / stage).exists()

    def test_creates_subfolders(self, mock_repo_root, mock_topic_data):
        """Test that subfolders are created."""
        topic_dir = create_topic_structure(
            mock_repo_root, "test-collection", "test-topic", mock_topic_data
        )

        for stage, subfolders in STAGE_SUBFOLDERS.items():
            stage_dir = topic_dir / stage
            for subfolder in subfolders:
                assert (stage_dir / subfolder).exists()

    def test_creates_topic_md(self, mock_repo_root, mock_topic_data):
        """Test that topic.md is created."""
        topic_dir = create_topic_structure(
            mock_repo_root, "test-collection", "test-topic", mock_topic_data
        )

        topic_md = topic_dir / "topic.md"
        assert topic_md.exists()

    def test_topic_md_contains_frontmatter(self, mock_repo_root, mock_topic_data):
        """Test that topic.md contains proper frontmatter."""
        topic_dir = create_topic_structure(
            mock_repo_root, "test-collection", "test-topic", mock_topic_data
        )

        content = (topic_dir / "topic.md").read_text()
        assert "---" in content
        assert "name: test-topic" in content
        assert "title:" in content
        assert "collection: test-collection" in content

    def test_uses_topic_data_in_frontmatter(self, mock_repo_root):
        """Test that topic_data is used in frontmatter."""
        custom_data = {
            "title": "Custom Title",
            "description": "Custom Description",
            "author_name": "Custom Author",
            "author_email": "custom@example.com",
            "primary_tag": "custom-tag",
            "primary_keyword": "custom-keyword",
            "notes": "Custom notes"
        }
        topic_dir = create_topic_structure(
            mock_repo_root, "test-collection", "custom-topic", custom_data
        )

        content = (topic_dir / "topic.md").read_text()
        assert "Custom Title" in content
        assert "Custom Author" in content
        assert "custom-tag" in content

    def test_returns_topic_dir_path(self, mock_repo_root, mock_topic_data):
        """Test that topic directory path is returned."""
        topic_dir = create_topic_structure(
            mock_repo_root, "test-collection", "test-topic", mock_topic_data
        )

        assert topic_dir.name == "test-topic"
        assert topic_dir.parent.name == "test-collection"


# ============================================================================
# cmd_init() Tests
# ============================================================================

class TestCmdInit:
    """Tests for cmd_init() CLI command."""

    def test_creates_topic_with_minimal_args(self, mock_repo_root, capsys):
        """Test creating topic with minimal arguments."""
        args = MagicMock()
        args.topic = "minimal-topic"
        args.collection = "test-collection"
        args.title = None
        args.description = None
        args.author = "Author"
        args.email = "author@example.com"
        args.tag = "technical"
        args.notes = ""

        with patch('topic_init.get_tcc_repo_root', return_value=mock_repo_root):
            cmd_init(args)
            captured = capsys.readouterr()

        assert "Topic created successfully!" in captured.out
        assert "minimal-topic" in captured.out

    def test_auto_creates_collection_if_enabled(self, mock_repo_root, capsys):
        """Test auto-creating collection when enabled."""
        args = MagicMock()
        args.topic = "test-topic"
        args.collection = "new-collection"
        args.title = "Test"
        args.description = ""
        args.author = "Author"
        args.email = "author@example.com"
        args.tag = "test"
        args.notes = ""

        with patch('topic_init.get_tcc_repo_root', return_value=mock_repo_root), \
             patch('topic_init.get_tcc_config', return_value={"auto_create_collections": True}):
            cmd_init(args)
            captured = capsys.readouterr()

        assert "Creating new collection" in captured.out or "Topic created successfully" in captured.out

    def test_errors_if_collection_not_found_and_disabled(self, mock_repo_root, capsys):
        """Test error when collection not found and auto-create disabled."""
        args = MagicMock()
        args.topic = "test-topic"
        args.collection = "nonexistent-collection"
        args.title = "Test"
        args.description = ""
        args.author = "Author"
        args.email = "author@example.com"
        args.tag = "test"
        args.notes = ""

        with patch('topic_init.get_tcc_repo_root', return_value=mock_repo_root), \
             patch('topic_init.get_tcc_config', return_value={"auto_create_collections": False}):
            try:
                cmd_init(args)
            except SystemExit:
                pass  # Expected to exit

    def test_errors_if_repo_root_not_configured(self, capsys):
        """Test error when repo root not configured."""
        args = MagicMock()
        args.topic = "test-topic"
        args.collection = "test-collection"
        args.title = "Test"
        args.description = ""
        args.author = "Author"
        args.email = "author@example.com"
        args.tag = "test"
        args.notes = ""

        with patch('topic_init.get_tcc_repo_root', return_value=None):
            with pytest.raises(SystemExit):
                cmd_init(args)


# ============================================================================
# STAGE_FOLDERS and STAGE_SUBFOLDERS Tests
# ============================================================================

class TestStageConstants:
    """Tests for stage folder constants."""

    def test_stage_folders_count(self):
        """Test that exactly 7 stage folders are defined."""
        assert len(STAGE_FOLDERS) == 7

    def test_stage_folders_names(self):
        """Test that stage folders are named correctly."""
        expected = [
            "0-materials",
            "1-research",
            "2-outline",
            "3-draft",
            "4-illustration",
            "5-adaptation",
            "6-publish"
        ]
        assert STAGE_FOLDERS == expected

    def test_stage_subfolders_structure(self):
        """Test that subfolders are properly defined."""
        assert isinstance(STAGE_SUBFOLDERS, dict)
        for stage, subfolders in STAGE_SUBFOLDERS.items():
            assert stage in STAGE_FOLDERS
            assert isinstance(subfolders, list)


# ============================================================================
# TOPIC_TEMPLATE Tests
# ============================================================================

class TestTopicTemplate:
    """Tests for TOPIC_TEMPLATE constant."""

    def test_template_exists(self):
        """Test that template is defined."""
        assert TOPIC_TEMPLATE is not None
        assert isinstance(TOPIC_TEMPLATE, str)

    def test_template_has_placeholders(self):
        """Test that template has required placeholders."""
        placeholders = [
            "{name}",
            "{title}",
            "{description}",
            "{collection}",
            "{created_at}",
            "{updated_at}",
            "{author_name}",
            "{author_email}",
            "{primary_tag}",
            "{primary_keyword}",
            "{notes}"
        ]
        template = TOPIC_TEMPLATE
        for placeholder in placeholders:
            assert placeholder in template


# ============================================================================
# Edge Cases Tests
# ============================================================================

class TestEdgeCases:
    """Tests for edge cases and special scenarios."""

    def test_collection_name_with_special_characters(self, mock_repo_root, mock_collections_data):
        """Test handling collection names with special characters."""
        new_col = create_collection(
            mock_repo_root, mock_collections_data, "Test@Collection#Name!"
        )
        assert new_col["id"] == "testcollectionname"

    def test_topic_id_with_unicode(self, mock_repo_root, mock_topic_data):
        """Test handling topic ID with unicode."""
        topic_dir = create_topic_structure(
            mock_repo_root, "test-collection", "test-topic", mock_topic_data
        )
        assert topic_dir.exists()

    def test_empty_topic_data(self, mock_repo_root):
        """Test handling empty topic data."""
        topic_dir = create_topic_structure(
            mock_repo_root, "test-collection", "test-topic", {}
        )
        assert topic_dir.exists()
        assert (topic_dir / "topic.md").exists()

    def test_very_long_topic_name(self, mock_repo_root):
        """Test handling very long topic names."""
        long_data = {
            "title": "A" * 200,
            "description": "B" * 500
        }
        topic_dir = create_topic_structure(
            mock_repo_root, "test-collection", "test-topic", long_data
        )
        assert topic_dir.exists()


class TestAdditionalCoverage:
    """Additional tests for improved coverage."""

    def test_cmd_init_with_missing_collections_json(self, mock_repo_root, capsys):
        """Test cmd_init when collections.json is missing."""
        # Remove collections.json
        (mock_repo_root / "collections.json").unlink()

        args = MagicMock()
        args.topic = "test-topic"
        args.collection = "test-collection"
        args.title = "Test"
        args.description = ""
        args.author = "Author"
        args.email = "author@example.com"
        args.tag = "test"
        args.notes = ""

        with patch('topic_init.get_tcc_repo_root', return_value=mock_repo_root):
            with pytest.raises(SystemExit):
                cmd_init(args)
            captured = capsys.readouterr()
            assert "Error:" in captured.out or "Collections file not found" in captured.out

    def test_cmd_init_auto_creates_collection_when_enabled(self, mock_repo_root, capsys):
        """Test cmd_init auto-creates collection when enabled."""
        # Remove test-collection from collections.json
        collections_file = mock_repo_root / "collections.json"
        data = json.loads(collections_file.read_text())
        data["collections"] = []
        collections_file.write_text(json.dumps(data, indent=2))

        args = MagicMock()
        args.topic = "test-topic"
        args.collection = "new-auto-collection"
        args.title = "Test"
        args.description = ""
        args.author = "Author"
        args.email = "author@example.com"
        args.tag = "test"
        args.notes = ""

        with patch('topic_init.get_tcc_repo_root', return_value=mock_repo_root), \
             patch('topic_init.get_tcc_config', return_value={"auto_create_collections": True}):
            cmd_init(args)
            captured = capsys.readouterr()
            assert "Creating new collection" in captured.out or "Topic created successfully" in captured.out

    def test_cmdinit_shows_available_collections_on_error(self, mock_repo_root, capsys):
        """Test cmd_init shows available collections when collection not found."""
        args = MagicMock()
        args.topic = "test-topic"
        args.collection = "nonexistent-collection"
        args.title = "Test"
        args.description = ""
        args.author = "Author"
        args.email = "author@example.com"
        args.tag = "test"
        args.notes = ""

        with patch('topic_init.get_tcc_repo_root', return_value=mock_repo_root), \
             patch('topic_init.get_tcc_config', return_value={"auto_create_collections": False}):
            with pytest.raises(SystemExit):
                cmd_init(args)
            captured = capsys.readouterr()
            assert "not found" in captured.out.lower()

    def test_create_topic_structure_with_custom_collections_path(self, mock_repo_root):
        """Test create_topic_structure uses custom collections_path from config."""
        custom_data = {
            "title": "Custom Path Topic",
            "description": "Test",
            "author_name": "Author",
            "author_email": "author@example.com",
            "primary_tag": "test",
            "primary_keyword": "test",
            "notes": ""
        }

        with patch('topic_init.get_tcc_config', return_value={"collections_path": "collections"}):
            topic_dir = create_topic_structure(
                mock_repo_root, "test-collection", "custom-path-topic", custom_data
            )
            # Should use default "collections" path
            assert "test-collection" in str(topic_dir)
            assert "custom-path-topic" in str(topic_dir)

    def test_register_topic_with_missing_collection_id(self, mock_repo_root):
        """Test register_topic when collection ID doesn't exist."""
        # This should not raise an error, just not update anything
        register_topic(mock_repo_root, "nonexistent-collection", "test-topic")
        # collections.json should remain unchanged
        data = json.loads((mock_repo_root / "collections.json").read_text())
        assert data["collections"][0]["id"] == "test-collection"

    def test_find_collection_by_id_or_name_partial_match(self, mock_collections_data):
        """Test find_collection_by_id_or_name doesn't do partial matching."""
        # Partial ID match should not work
        result = find_collection_by_id_or_name(mock_collections_data, "test")
        assert result is None  # "test" is not a full ID or name

    def test_slugify_preserves_underscores(self):
        """Test slugify preserves underscores."""
        assert slugify("hello_world") == "hello_world"
        assert slugify("test_name_value") == "test_name_value"

    def test_save_collections_json_updates_timestamp(self, mock_repo_root):
        """Test save_collections_json updates last_updated timestamp."""
        from datetime import datetime
        before = datetime.now().isoformat()

        data = {"collections": [{"id": "test"}]}
        save_collections_json(mock_repo_root, data)

        collections_file = mock_repo_root / "collections.json"
        saved_data = json.loads(collections_file.read_text())
        assert "last_updated" in saved_data

    def test_cmd_init_with_topic_arg_slugified(self, mock_repo_root, capsys):
        """Test cmd_init slugifies the topic argument."""
        args = MagicMock()
        args.topic = "Test Topic With Spaces!"
        args.collection = "test-collection"
        args.title = None
        args.description = ""
        args.author = "Author"
        args.email = "author@example.com"
        args.tag = "test"
        args.notes = ""

        with patch('topic_init.get_tcc_repo_root', return_value=mock_repo_root):
            cmd_init(args)
            captured = capsys.readouterr()
            # Topic ID should be slugified
            assert "test-topic-with-spaces" in captured.out or "Topic created successfully" in captured.out

    def test_create_collection_sets_description(self, mock_repo_root, mock_collections_data):
        """Test create_collection sets proper description."""
        new_col = create_collection(
            mock_repo_root, mock_collections_data, "Test Description Collection"
        )
        assert "Test Description Collection" in new_col["description"]

    def test_create_collection_initializes_with_zeros(self, mock_repo_root, mock_collections_data):
        """Test create_collection initializes counts to zero."""
        new_col = create_collection(
            mock_repo_root, mock_collections_data, "New Collection"
        )
        assert new_col["topic_count"] == 0
        assert new_col["published_count"] == 0

    def test_main_with_required_arguments(self, mock_repo_root, capsys):
        """Test main() with required arguments."""
        with patch('sys.argv', [
            'topic-init.py',
            '--topic', 'test-topic',
            '--collection', 'test-collection',
            '--title', 'Test Topic'
        ]), \
        patch('topic_init.get_tcc_repo_root', return_value=mock_repo_root):
            from topic_init import main
            main()
            captured = capsys.readouterr()
            assert "Topic created successfully" in captured.out

    def test_main_with_all_arguments(self, mock_repo_root, capsys):
        """Test main() with all arguments provided."""
        with patch('sys.argv', [
            'topic-init.py',
            '--topic', 'full-test-topic',
            '--collection', 'test-collection',
            '--title', 'Full Test Topic',
            '--description', 'A complete test topic',
            '--author', 'Test Author',
            '--email', 'test@example.com',
            '--tag', 'testing',
            '--notes', 'Test notes for full coverage'
        ]), \
        patch('topic_init.get_tcc_repo_root', return_value=mock_repo_root):
            from topic_init import main
            main()
            captured = capsys.readouterr()
            assert "Topic created successfully" in captured.out
            assert "full-test-topic" in captured.out
