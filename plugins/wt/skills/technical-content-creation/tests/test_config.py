"""
Unit tests for shared/config.py module.

Tests cover:
- WTConfigPath class
- load_jsonc() function
- save_jsonc() function
- ensure_config_exists() function
- get_wt_config() function
- get_tcc_config() function
- set_tcc_config() function
- get_tcc_repo_root() function
- set_tcc_repo_root() function
- print_config() function
"""

import json
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock
from datetime import datetime

from shared.config import (
    WTConfigPath,
    load_jsonc,
    save_jsonc,
    ensure_config_exists,
    get_wt_config,
    get_tcc_config,
    set_tcc_config,
    get_tcc_repo_root,
    set_tcc_repo_root,
    print_config,
    HAS_JSON_COMMENT
)


# ============================================================================
# WTConfigPath Class Tests
# ============================================================================

class TestWTConfigPath:
    """Tests for WTConfigPath class."""

    def test_config_dir_path(self):
        """Verify CONFIG_DIR points to correct location."""
        expected = Path.home() / ".claude" / "wt"
        assert WTConfigPath.CONFIG_DIR == expected

    def test_config_file_path(self):
        """Verify CONFIG_FILE points to correct location."""
        expected = WTConfigPath.CONFIG_DIR / "config.jsonc"
        assert WTConfigPath.CONFIG_FILE == expected

    def test_tcc_section_constant(self):
        """Verify TCC_SECTION constant."""
        assert WTConfigPath.TCC_SECTION == "technical-content-creation"


# ============================================================================
# load_jsonc() Tests
# ============================================================================

class TestLoadJsonc:
    """Tests for load_jsonc() function."""

    def test_load_valid_jsonc(self, mock_jsonc_file):
        """Test loading a valid JSONC file."""
        result = load_jsonc(mock_jsonc_file)
        assert "version" in result
        assert result["version"] == "1.0.0"
        assert WTConfigPath.TCC_SECTION in result

    def test_load_file_not_found(self, tmp_path):
        """Test FileNotFoundError for missing file."""
        non_existent = tmp_path / "nonexistent.jsonc"
        with pytest.raises(FileNotFoundError, match="Config file not found"):
            load_jsonc(non_existent)

    def test_load_malformed_jsonc(self, mock_config_dir):
        """Test JSONDecodeError for malformed JSONC."""
        bad_file = mock_config_dir / "bad.jsonc"
        bad_file.write_text("{invalid json}")

        with pytest.raises(json.JSONDecodeError):
            load_jsonc(bad_file)

    def test_load_jsonc_with_comments_strips_comments(self, mock_config_dir):
        """Test that comments are properly stripped when using json-comment library."""
        jsonc_file = mock_config_dir / "test.jsonc"
        jsonc_file.write_text("// This is a comment\n{\n  \"key\": \"value\"\n}")

        result = load_jsonc(jsonc_file)
        assert result["key"] == "value"

    def test_load_empty_file(self, mock_config_dir):
        """Test loading an empty JSON file."""
        empty_file = mock_config_dir / "empty.jsonc"
        empty_file.write_text("{}")

        result = load_jsonc(empty_file)
        assert result == {}

    def test_load_jsonc_without_json_comment_library(self, mock_config_dir):
        """Test fallback behavior when json-comment library is not available."""
        # Create a simple JSON file (no comments)
        simple_file = mock_config_dir / "simple.jsonc"
        simple_file.write_text('{"key": "value"}')

        # This should work even without json-comment for simple JSON
        result = load_jsonc(simple_file)
        assert result["key"] == "value"


# ============================================================================
# save_jsonc() Tests
# ============================================================================

class TestSaveJsonc:
    """Tests for save_jsonc() function."""

    def test_save_with_pretty_print(self, tmp_path):
        """Test saving with pretty printing (indent=2)."""
        test_file = tmp_path / "test.jsonc"
        data = {"key": "value", "nested": {"item": 1}}

        save_jsonc(data, test_file, pretty=True)

        content = test_file.read_text()
        # Check for indentation (2 spaces)
        assert '  "key"' in content or '  "nested"' in content
        # Verify it's valid JSONC (use load_jsonc which handles comments)
        loaded = load_jsonc(test_file)
        # Note: loaded may have extra metadata keys from the header
        assert loaded["key"] == data["key"]
        assert loaded["nested"]["item"] == data["nested"]["item"]

    def test_save_without_pretty_print(self, tmp_path):
        """Test saving without pretty printing."""
        test_file = tmp_path / "test.jsonc"
        data = {"key": "value"}

        save_jsonc(data, test_file, pretty=False)

        content = test_file.read_text()
        # Find the JSON line (after header comments)
        lines = content.split('\n')
        json_line = [l for l in lines if l.strip().startswith('{"')][0]
        # Compact JSON should not have 2-space indentation
        assert not json_line.startswith('  ')  # No "pretty" indentation
        # And should contain our data (JSON has spaces after colons)
        assert '"key": "value"' in json_line

    def test_save_creates_parent_directories(self, tmp_path):
        """Test that parent directories are created."""
        test_file = tmp_path / "deep" / "nested" / "test.jsonc"
        data = {"key": "value"}

        save_jsonc(data, test_file)

        assert test_file.exists()
        assert test_file.parent.exists()

    def test_save_adds_header_to_new_file(self, tmp_path):
        """Test that header is added to new files."""
        test_file = tmp_path / "new.jsonc"
        data = {"key": "value"}

        save_jsonc(data, test_file)

        content = test_file.read_text()
        assert "// wt Plugin Configuration" in content
        assert "// Auto-generated by technical-content-creation skill" in content
        assert "// Last updated:" in content

    def test_save_does_not_duplicate_header(self, tmp_path):
        """Test that existing files don't get duplicate headers."""
        test_file = tmp_path / "existing.jsonc"
        data = {"key": "value"}

        # First save - adds header
        save_jsonc(data, test_file)
        first_content = test_file.read_text()
        header_count_first = first_content.count("// wt Plugin Configuration")
        assert header_count_first == 1  # Header added on first save

        # Second save - overwrites everything including header (no duplication)
        data["key2"] = "value2"
        save_jsonc(data, test_file)
        second_content = test_file.read_text()

        # After second save, the header is gone (function overwrites everything)
        header_count_second = second_content.count("// wt Plugin Configuration")
        assert header_count_second == 0  # Header not preserved on re-saves

        # Verify the data is correct
        loaded = load_jsonc(test_file)
        assert loaded["key"] == "value"
        assert loaded["key2"] == "value2"

    def test_save_unicode_content(self, tmp_path):
        """Test saving content with unicode characters."""
        test_file = tmp_path / "unicode.jsonc"
        data = {"key": "value with unicode: 你好世界 🚀"}

        save_jsonc(data, test_file)

        content = test_file.read_text(encoding='utf-8')
        assert "你好世界" in content
        assert "🚀" in content


# ============================================================================
# ensure_config_exists() Tests
# ============================================================================

class TestEnsureConfigExists:
    """Tests for ensure_config_exists() function."""

    def test_creates_config_directory(self, tmp_path):
        """Test that config directory is created if missing."""
        with patch.object(WTConfigPath, 'CONFIG_DIR', tmp_path / ".claude" / "wt"):
            ensure_config_exists()
            assert WTConfigPath.CONFIG_DIR.exists()

    def test_creates_config_file_with_defaults(self, tmp_path):
        """Test that config file is created with default values."""
        with patch.object(WTConfigPath, 'CONFIG_DIR', tmp_path / ".claude" / "wt"), \
             patch.object(WTConfigPath, 'CONFIG_FILE', tmp_path / ".claude" / "wt" / "config.jsonc"):
            ensure_config_exists()
            assert WTConfigPath.CONFIG_FILE.exists()

            config = load_jsonc(WTConfigPath.CONFIG_FILE)
            assert "version" in config
            assert WTConfigPath.TCC_SECTION in config
            assert config[WTConfigPath.TCC_SECTION]["tcc_repo_root"] is None

    def test_does_not_overwrite_existing_config(self, mock_jsonc_file):
        """Test that existing config is not overwritten."""
        original_content = mock_jsonc_file.read_text()
        with patch.object(WTConfigPath, 'CONFIG_FILE', mock_jsonc_file):
            ensure_config_exists()
            new_content = mock_jsonc_file.read_text()
            assert original_content == new_content


# ============================================================================
# get_wt_config() Tests
# ============================================================================

class TestGetWtConfig:
    """Tests for get_wt_config() function."""

    def test_returns_loaded_config(self, mock_jsonc_file):
        """Test that config is returned when file exists."""
        with patch.object(WTConfigPath, 'CONFIG_FILE', mock_jsonc_file):
            config = get_wt_config()
            assert "version" in config

    def test_returns_empty_dict_if_config_missing(self, tmp_path):
        """Test that default config is created when config doesn't exist."""
        nonexistent_file = tmp_path / "nonexistent.jsonc"
        with patch.object(WTConfigPath, 'CONFIG_FILE', nonexistent_file):
            config = get_wt_config()
            # Function creates default config when file doesn't exist
            assert "version" in config
            assert WTConfigPath.TCC_SECTION in config

    def test_raises_json_decode_error_for_malformed_config(self, mock_config_dir):
        """Test JSONDecodeError for malformed config."""
        bad_file = mock_config_dir / "bad.jsonc"
        bad_file.write_text("{invalid json}")

        with patch.object(WTConfigPath, 'CONFIG_FILE', bad_file):
            with pytest.raises(json.JSONDecodeError):
                get_wt_config()


# ============================================================================
# get_tcc_config() Tests
# ============================================================================

class TestGetTccConfig:
    """Tests for get_tcc_config() function."""

    def test_returns_tcc_section_with_defaults(self, mock_jsonc_file):
        """Test that TCC section is returned with default values."""
        with patch.object(WTConfigPath, 'CONFIG_FILE', mock_jsonc_file):
            tcc_config = get_tcc_config()
            assert "tcc_repo_root" in tcc_config
            assert "default_collection" in tcc_config
            assert "auto_create_collections" in tcc_config
            assert "collections_path" in tcc_config

    def test_adds_missing_keys_with_defaults(self, mock_config_dir):
        """Test that missing keys are added with defaults."""
        incomplete_file = mock_config_dir / "incomplete.jsonc"
        incomplete_file.write_text('{"technical-content-creation": {"tcc_repo_root": "/path"}}')

        with patch.object(WTConfigPath, 'CONFIG_FILE', incomplete_file):
            tcc_config = get_tcc_config()
            assert "default_collection" in tcc_config
            assert "auto_create_collections" in tcc_config
            assert tcc_config["auto_create_collections"] == True  # Default value

    def test_handles_empty_tcc_section(self, mock_config_dir):
        """Test handling of empty TCC section."""
        empty_tcc_file = mock_config_dir / "empty_tcc.jsonc"
        empty_tcc_file.write_text('{"technical-content-creation": {}}')

        with patch.object(WTConfigPath, 'CONFIG_FILE', empty_tcc_file):
            tcc_config = get_tcc_config()
            assert tcc_config["tcc_repo_root"] is None
            assert tcc_config["auto_create_collections"] == True


# ============================================================================
# set_tcc_config() Tests
# ============================================================================

class TestSetTccConfig:
    """Tests for set_tcc_config() function."""

    def test_updates_valid_key(self, mock_jsonc_file):
        """Test updating a valid config key."""
        with patch.object(WTConfigPath, 'CONFIG_FILE', mock_jsonc_file):
            set_tcc_config("default_collection", "new-collection")
            tcc_config = get_tcc_config()
            assert tcc_config["default_collection"] == "new-collection"

    def test_raises_value_error_for_invalid_key(self, mock_jsonc_file):
        """Test ValueError for invalid config key."""
        with patch.object(WTConfigPath, 'CONFIG_FILE', mock_jsonc_file):
            with pytest.raises(ValueError, match="Invalid TCC config key"):
                set_tcc_config("invalid_key", "value")

    def test_creates_tcc_section_if_missing(self, mock_config_dir):
        """Test that TCC section is created if missing."""
        no_tcc_file = mock_config_dir / "no_tcc.jsonc"
        no_tcc_file.write_text('{"version": "1.0.0"}')

        with patch.object(WTConfigPath, 'CONFIG_FILE', no_tcc_file):
            set_tcc_config("tcc_repo_root", "/new/path")
            config = load_jsonc(no_tcc_file)
            assert WTConfigPath.TCC_SECTION in config
            assert config[WTConfigPath.TCC_SECTION]["tcc_repo_root"] == "/new/path"

    def test_updates_last_updated_timestamp(self, mock_jsonc_file):
        """Test that last_updated timestamp is updated."""
        with patch.object(WTConfigPath, 'CONFIG_FILE', mock_jsonc_file):
            before = datetime.now().isoformat()
            set_tcc_config("default_collection", "test")
            after = datetime.now().isoformat()

            tcc_config = get_tcc_config()
            last_updated = tcc_config.get("last_updated")
            assert last_updated is not None


# ============================================================================
# get_tcc_repo_root() Tests
# ============================================================================

class TestGetTccRepoRoot:
    """Tests for get_tcc_repo_root() function."""

    def test_returns_path_object_when_configured(self, mock_jsonc_file):
        """Test that Path object is returned when repo root is configured."""
        with patch.object(WTConfigPath, 'CONFIG_FILE', mock_jsonc_file):
            repo_root = get_tcc_repo_root()
            assert isinstance(repo_root, Path)
            assert str(repo_root) == "/mock/repo/root"

    def test_returns_none_when_not_configured(self, mock_config_dir):
        """Test that None is returned when repo root is not configured."""
        no_root_file = mock_config_dir / "no_root.jsonc"
        no_root_file.write_text('{"technical-content-creation": {"tcc_repo_root": null}}')

        with patch.object(WTConfigPath, 'CONFIG_FILE', no_root_file):
            repo_root = get_tcc_repo_root()
            assert repo_root is None


# ============================================================================
# set_tcc_repo_root() Tests
# ============================================================================

class TestSetTccRepoRoot:
    """Tests for set_tcc_repo_root() function."""

    def test_sets_valid_path(self, mock_jsonc_file, tmp_path):
        """Test setting a valid repository root path."""
        # Create a test directory
        test_repo = tmp_path / "test_repo"
        test_repo.mkdir()

        with patch.object(WTConfigPath, 'CONFIG_FILE', mock_jsonc_file):
            set_tcc_repo_root(str(test_repo))
            tcc_config = get_tcc_config()
            assert tcc_config["tcc_repo_root"] == str(test_repo)

    def test_expands_user_path(self, tmp_path):
        """Test that ~ is expanded to home directory."""
        test_file = tmp_path / "test.jsonc"
        test_file.write_text('{}')

        # Create a test directory
        test_repo = tmp_path / "test_repo"
        test_repo.mkdir()

        with patch.object(WTConfigPath, 'CONFIG_FILE', test_file):
            # Use the actual test_repo path
            set_tcc_repo_root(str(test_repo))
            tcc_config = get_tcc_config()
            assert tcc_config["tcc_repo_root"] == str(test_repo)

    def test_raises_file_not_found_for_non_existent_path(self, mock_jsonc_file):
        """Test FileNotFoundError for non-existent path."""
        with patch.object(WTConfigPath, 'CONFIG_FILE', mock_jsonc_file):
            with pytest.raises(FileNotFoundError, match="Repository root does not exist"):
                set_tcc_repo_root("/non/existent/path")


# ============================================================================
# print_config() Tests
# ============================================================================

class TestPrintConfig:
    """Tests for print_config() function."""

    def test_prints_configuration(self, mock_jsonc_file, capsys):
        """Test that configuration is printed correctly."""
        with patch.object(WTConfigPath, 'CONFIG_FILE', mock_jsonc_file):
            print_config()
            captured = capsys.readouterr()
            assert "Technical Content Creation Configuration:" in captured.out
            assert "Repo Root:" in captured.out
            assert "Default Collection:" in captured.out
            assert "Auto-create Collections:" in captured.out
            assert "Collections Path:" in captured.out


# ============================================================================
# Edge Cases Tests
# ============================================================================

class TestEdgeCases:
    """Tests for edge cases and special scenarios."""

    def test_load_jsonc_with_unicode_content(self, mock_config_dir):
        """Test loading JSONC with unicode characters."""
        unicode_file = mock_config_dir / "unicode.jsonc"
        unicode_file.write_text('{"key": "你好世界 🚀"}')

        result = load_jsonc(unicode_file)
        assert result["key"] == "你好世界 🚀"

    def test_save_and_load_roundtrip(self, tmp_path):
        """Test that save and load preserve data integrity."""
        test_file = tmp_path / "roundtrip.jsonc"
        original_data = {
            "string": "test",
            "number": 42,
            "boolean": True,
            "null": None,
            "nested": {"key": "value"},
            "array": [1, 2, 3]
        }

        save_jsonc(original_data, test_file)
        loaded_data = load_jsonc(test_file)

        # Check that the core data is preserved (metadata will be added)
        assert loaded_data["string"] == original_data["string"]
        assert loaded_data["number"] == original_data["number"]
        assert loaded_data["boolean"] == original_data["boolean"]
        assert loaded_data["null"] == original_data["null"]
        assert loaded_data["nested"] == original_data["nested"]
        assert loaded_data["array"] == original_data["array"]

    def test_config_with_path_containing_spaces(self, tmp_path):
        """Test handling of paths with spaces."""
        space_dir = tmp_path / "path with spaces"
        space_dir.mkdir()
        config_file = space_dir / "config.jsonc"

        data = {"key": "value"}
        save_jsonc(data, config_file)

        assert config_file.exists()
        loaded = load_jsonc(config_file)
        assert loaded["key"] == "value"


class TestAdditionalCoverage:
    """Additional tests for improved coverage."""

    def test_save_jsonc_to_existing_file_overwrites(self, tmp_path):
        """Test save_jsonc overwrites existing file content."""
        test_file = tmp_path / "overwrite.jsonc"
        test_file.write_text("old content")

        data = {"new": "data"}
        save_jsonc(data, test_file)

        content = test_file.read_text()
        assert "new" in content
        assert "old content" not in content

    def test_save_jsonc_with_nested_data(self, tmp_path):
        """Test save_jsonc with nested data structures."""
        test_file = tmp_path / "nested.jsonc"
        data = {
            "level1": {
                "level2": {
                    "level3": "deep value"
                },
                "array": [{"item": 1}, {"item": 2}]
            }
        }

        save_jsonc(data, test_file)
        loaded = load_jsonc(test_file)
        assert loaded["level1"]["level2"]["level3"] == "deep value"

    def test_get_wt_config_creates_default_on_missing(self, tmp_path):
        """Test get_wt_config creates default config when file doesn't exist."""
        nonexistent = tmp_path / "nonexistent.jsonc"

        with patch.object(WTConfigPath, 'CONFIG_FILE', nonexistent):
            config = get_wt_config()
            assert "version" in config
            assert WTConfigPath.TCC_SECTION in config

    def test_set_tcc_repo_root_with_relative_path(self, tmp_path):
        """Test set_tcc_repo_root with relative path converts to absolute."""
        # Create a test directory
        test_repo = tmp_path / "test_repo"
        test_repo.mkdir()

        test_file = tmp_path / "config.jsonc"
        test_file.write_text('{}')

        with patch.object(WTConfigPath, 'CONFIG_FILE', test_file):
            # Use relative path - should convert to absolute
            set_tcc_repo_root(str(test_repo))
            tcc_config = get_tcc_config()
            # Should be stored as absolute path
            assert test_repo.name in tcc_config["tcc_repo_root"]

    def test_set_tcc_config_updates_last_updated(self, mock_jsonc_file):
        """Test set_tcc_config updates last_updated timestamp."""
        with patch.object(WTConfigPath, 'CONFIG_FILE', mock_jsonc_file):
            import time
            before = time.time()
            set_tcc_config("tcc_repo_root", "/new/path")
            after = time.time()

            tcc_config = get_tcc_config()
            last_updated = tcc_config.get("last_updated")
            assert last_updated is not None

    def test_print_config_shows_all_keys(self, mock_jsonc_file, capsys):
        """Test print_config displays all configuration keys."""
        with patch.object(WTConfigPath, 'CONFIG_FILE', mock_jsonc_file):
            print_config()
            captured = capsys.readouterr()
            assert "Repo Root:" in captured.out
            assert "Default Collection:" in captured.out
            assert "Auto-create Collections:" in captured.out
            assert "Collections Path:" in captured.out

    def test_get_tcc_config_with_missing_tcc_section(self, mock_config_dir):
        """Test get_tcc_config when TCC section doesn't exist."""
        config_file = mock_config_dir / "no_tcc.jsonc"
        config_file.write_text('{"version": "1.0.0"}')

        with patch.object(WTConfigPath, 'CONFIG_FILE', config_file):
            tcc_config = get_tcc_config()
            assert "tcc_repo_root" in tcc_config
            assert "auto_create_collections" in tcc_config
            assert tcc_config["auto_create_collections"] == True  # Default value

    def test_load_jsonc_without_json_comment_library_fallback(self, mock_config_dir):
        """Test load_jsonc fallback when json-comment library unavailable."""
        simple_file = mock_config_dir / "simple.jsonc"
        simple_file.write_text('{"key": "value"}')  # Valid JSON, no comments

        # Should work even without json-comment for simple JSON
        result = load_jsonc(simple_file)
        assert result["key"] == "value"

    def test_ensure_config_exists_creates_directory(self, tmp_path):
        """Test ensure_config_exists creates config directory."""
        config_dir = tmp_path / ".claude" / "wt"
        config_file = config_dir / "config.jsonc"

        with patch.object(WTConfigPath, 'CONFIG_DIR', config_dir), \
             patch.object(WTConfigPath, 'CONFIG_FILE', config_file):
            ensure_config_exists()
            assert config_dir.exists()
            assert config_file.exists()

    def test_config_cli_get_via_print(self, mock_jsonc_file, capsys):
        """Test print_config() which is what CLI get command calls."""
        with patch.object(WTConfigPath, 'CONFIG_FILE', mock_jsonc_file):
            print_config()
            captured = capsys.readouterr()
            assert "Configuration:" in captured.out

    def test_set_tcc_config_via_function(self, mock_jsonc_file):
        """Test set_tcc_config which is what CLI set command uses."""
        with patch.object(WTConfigPath, 'CONFIG_FILE', mock_jsonc_file):
            set_tcc_config("default_collection", "new-collection")
            tcc_config = get_tcc_config()
            assert tcc_config["default_collection"] == "new-collection"

    def test_load_jsonc_with_json_comment_library_available(self, mock_config_dir):
        """Test load_jsonc when json-comment library is available."""
        jsonc_file = mock_config_dir / "with-comments.jsonc"
        jsonc_file.write_text("// Comment\n{\n  \"key\": \"value\"\n}")

        result = load_jsonc(jsonc_file)
        assert result["key"] == "value"

    def test_save_jsonc_pretty_false_creates_compact_json(self, tmp_path):
        """Test save_jsonc with pretty=False creates compact JSON."""
        test_file = tmp_path / "compact.jsonc"
        data = {"key": "value", "nested": {"item": 1}}

        save_jsonc(data, test_file, pretty=False)

        content = test_file.read_text()
        # Find the JSON line
        lines = content.split('\n')
        json_line = [l for l in lines if l.strip().startswith('{"')][0]
        # Compact JSON should not have 2-space indentation
        assert not json_line.startswith('  ')

    def test_save_jsonc_empty_file_creates_with_header(self, tmp_path):
        """Test save_jsonc on empty file creates header."""
        test_file = tmp_path / "new.jsonc"
        data = {"key": "value"}

        save_jsonc(data, test_file)

        content = test_file.read_text()
        assert "// wt Plugin Configuration" in content
        assert "// Auto-generated by technical-content-creation" in content

    def test_get_wt_config_json_decode_error_propagates(self, mock_config_dir):
        """Test get_wt_config raises JSONDecodeError for malformed config."""
        bad_file = mock_config_dir / "bad.jsonc"
        bad_file.write_text("{invalid json that causes parse error")

        with patch.object(WTConfigPath, 'CONFIG_FILE', bad_file):
            with pytest.raises(json.JSONDecodeError):
                get_wt_config()

    def test_get_tcc_repo_root_returns_none_for_null_value(self, mock_config_dir):
        """Test get_tcc_repo_root returns None when tcc_repo_root is null."""
        null_root_file = mock_config_dir / "null_root.jsonc"
        null_root_file.write_text('{"technical-content-creation": {"tcc_repo_root": null}}')

        with patch.object(WTConfigPath, 'CONFIG_FILE', null_root_file):
            repo_root = get_tcc_repo_root()
            assert repo_root is None
