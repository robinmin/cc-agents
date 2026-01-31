#!/usr/bin/env python3
"""Quick integration test for Phase 1 scripts."""

import sys
from pathlib import Path

# Add scripts directory to path
scripts_dir = Path(__file__).parent
sys.path.insert(0, str(scripts_dir))

def test_config_module():
    """Test config module imports and basic functions."""
    print("Testing config module...")
    try:
        from shared.config import (
            get_wt_config,
            get_tcc_config,
            set_tcc_config,
            WTConfigPath,
            strip_json_comments,
            ensure_config_exists,
        )
        print("  [PASS] All imports successful")

        # Test JSONC comment stripping
        test_jsonc = '''
        // This is a comment
        {"key": "value", /* another comment */
        "array": [1, 2, 3,],} // trailing comma
        '''
        result = strip_json_comments(test_jsonc)
        assert '//' not in result
        assert '/*' not in result
        print("  [PASS] JSONC comment stripping works")

        # Test config path
        assert WTConfigPath.CONFIG_DIR.name == "wt"
        print(f"  [PASS] Config path: {WTConfigPath.CONFIG_FILE}")

        # Test get_wt_config (creates if needed)
        config = get_wt_config()
        assert isinstance(config, dict)
        print("  [PASS] get_wt_config() works")

        # Test get_tcc_config
        tcc_config = get_tcc_config()
        assert isinstance(tcc_config, dict)
        assert "tcc_repo_root" in tcc_config
        print("  [PASS] get_tcc_config() works")

        return True
    except Exception as e:
        print(f"  [FAIL] {e}")
        return False


def test_cli_scripts_exist():
    """Test that all CLI scripts exist and have proper headers."""
    print("\nTesting CLI scripts...")

    scripts = [
        "repo-config.py",
        "topic-init.py",
        "context-validator.py",
    ]

    for script in scripts:
        path = scripts_dir / script
        if path.exists():
            content = path.read_text()
            if "#!/usr/bin/env python3" in content:
                print(f"  [PASS] {script} exists with shebang")
            else:
                print(f"  [WARN] {script} missing shebang")
        else:
            print(f"  [FAIL] {script} not found")
            return False

    return True


def test_jsonc_functionality():
    """Test JSONC parsing edge cases."""
    print("\nTesting JSONC edge cases...")
    try:
        from shared.config import strip_json_comments

        # URL preservation
        test_with_url = '{"url": "https://example.com"}'
        result = strip_json_comments(test_with_url)
        assert "https://example.com" in result
        print("  [PASS] URLs preserved")

        # Nested comments
        test_nested = '{"a": /* comment */ 1, "b": 2}'
        result = strip_json_comments(test_nested)
        assert '"a": 1' in result
        print("  [PASS] Nested comments handled")

        # Multiple trailing commas
        test_trailing = '{"arr": [1, 2,], "obj": {"a": 1,},}'
        result = strip_json_comments(test_trailing)
        import json
        parsed = json.loads(result)
        assert parsed["arr"] == [1, 2]
        assert parsed["obj"]["a"] == 1
        print("  [PASS] Trailing commas handled")

        return True
    except Exception as e:
        print(f"  [FAIL] {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests."""
    print("=" * 50)
    print("Phase 1 Scripts - Quick Integration Test")
    print("=" * 50)

    tests_passed = 0
    tests_failed = 0

    if test_config_module():
        tests_passed += 1
    else:
        tests_failed += 1

    if test_cli_scripts_exist():
        tests_passed += 1
    else:
        tests_failed += 1

    if test_jsonc_functionality():
        tests_passed += 1
    else:
        tests_failed += 1

    print("\n" + "=" * 50)
    print(f"Results: {tests_passed} passed, {tests_failed} failed")
    print("=" * 50)

    if tests_failed == 0:
        print("\n[SUCCESS] All tests passed!")
        return 0
    else:
        print(f"\n[FAILURE] {tests_failed} test(s) failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
