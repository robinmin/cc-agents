#!/usr/bin/env python3
"""
WT Configuration Loader

Loads configuration from ~/.claude/wt/config.jsonc and injects
environment variables into the current process.

Usage:
    from config_loader import load_wt_config, get_wt_config

    # Load config and inject environment variables
    config = load_wt_config()

    # Get config without injecting env vars
    config = get_wt_config()
"""

import os
import json
from pathlib import Path
from typing import Dict, Any, Optional
import re


# Default configuration values
DEFAULT_CONFIG = {
    "env": {
        "HUGGINGFACE_API_TOKEN": "",
        "HUGGINGFACE_MODEL": "stabilityai/stable-diffusion-xl-base-1.0",
        "GEMINI_API_KEY": "",
        "GEMINI_MODEL": "imagen-3.0-generate-001",
    },
    "image_generation": {
        "backend": "nano_banana",  # Preferred backend: nano_banana, huggingface, gemini
        "default_resolution": "1024x1024",
        "default_steps": 8,  # For nano_banana (Z-Image Turbo uses fewer steps)
    },
    "content_generation": {
        "default_language": "en",  # Default language for content
    }
}


# Language code mappings
# Maps language codes to filename suffixes and display names
LANGUAGE_CODES = {
    # Original languages
    "en": {"suffix": "en", "name": "English", "emoji": "🇬🇧"},
    "cn": {"suffix": "cn", "name": "Chinese (Simplified)", "emoji": "🇨🇳"},
    "jp": {"suffix": "jp", "name": "Japanese", "emoji": "🇯🇵"},
    "zh": {"suffix": "cn", "name": "Chinese (Simplified)", "emoji": "🇨🇳"},  # Alias for cn
    "ja": {"suffix": "jp", "name": "Japanese", "emoji": "🇯🇵"},  # Alias for jp

    # NEW LANGUAGES - Add additional languages here
    "ko": {"suffix": "ko", "name": "Korean", "emoji": "🇰🇷"},
    "es": {"suffix": "es", "name": "Spanish", "emoji": "🇪🇸"},
    "fr": {"suffix": "fr", "name": "French", "emoji": "🇫🇷"},
    "de": {"suffix": "de", "name": "German", "emoji": "🇩🇪"},
    "pt": {"suffix": "pt", "name": "Portuguese", "emoji": "🇵🇹"},
    "ru": {"suffix": "ru", "name": "Russian", "emoji": "🇷🇺"},
    "it": {"suffix": "it", "name": "Italian", "emoji": "🇮🇹"},
    "ar": {"suffix": "ar", "name": "Arabic", "emoji": "🇸🇦"},
    "hi": {"suffix": "hi", "name": "Hindi", "emoji": "🇮🇳"},
    "th": {"suffix": "th", "name": "Thai", "emoji": "🇹🇭"},
    "vi": {"suffix": "vi", "name": "Vietnamese", "emoji": "🇻🇳"},
    "id": {"suffix": "id", "name": "Indonesian", "emoji": "🇮🇩"},
    "nl": {"suffix": "nl", "name": "Dutch", "emoji": "🇳🇱"},
    "pl": {"suffix": "pl", "name": "Polish", "emoji": "🇵🇱"},
    "tr": {"suffix": "tr", "name": "Turkish", "emoji": "🇹🇷"},
}

# Language families for region-specific handling (optional)
LANGUAGE_FAMILIES = {
    "zh": {
        "cn": {"suffix": "cn", "name": "Chinese (Simplified)", "emoji": "🇨🇳"},
        "tw": {"suffix": "tw", "name": "Chinese (Traditional)", "emoji": "🇹🇼"},
        "hk": {"suffix": "hk", "name": "Chinese (Hong Kong)", "emoji": "🇭🇰"},
    },
    "pt": {
        "br": {"suffix": "pt-br", "name": "Portuguese (Brazil)", "emoji": "🇧🇷"},
        "pt": {"suffix": "pt", "name": "Portuguese (Portugal)", "emoji": "🇵🇹"},
    },
}


def _strip_json_comments(json_str: str) -> str:
    """Remove single-line (//) and multi-line (/* */) comments from JSON string.

    Args:
        json_str: JSON string with potential comments

    Returns:
        JSON string with comments removed
    """
    # Remove single-line comments (//...)
    pattern = r'//.*?$'
    json_str = re.sub(pattern, '', json_str, flags=re.MULTILINE)

    # Remove multi-line comments (/* ... */)
    pattern = r'/\*.*?\*/'
    json_str = re.sub(pattern, '', json_str, flags=re.DOTALL)

    return json_str


def get_config_path() -> Path:
    """Get the path to the WT config file.

    Returns:
        Path to ~/.claude/wt/config.jsonc
    """
    return Path.home() / ".claude" / "wt" / "config.jsonc"


def get_wt_config() -> Dict[str, Any]:
    """Load WT configuration from ~/.claude/wt/config.jsonc.

    Returns:
        Configuration dictionary with defaults applied
    """
    config_path = get_config_path()

    # Start with default configuration
    config = DEFAULT_CONFIG.copy()

    # Load user config if it exists
    if config_path.exists():
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                content = f.read()

            # Strip comments (support JSONC format)
            content = _strip_json_comments(content)

            # Parse JSON
            user_config = json.loads(content)

            # Deep merge user config with defaults
            config = _deep_merge(config, user_config)

        except json.JSONDecodeError as e:
            print(f"Warning: Failed to parse WT config file: {e}")
            print(f"  Using default configuration")
        except Exception as e:
            print(f"Warning: Error loading WT config file: {e}")
            print(f"  Using default configuration")
    else:
        # Config file doesn't exist, that's okay
        pass

    return config


def _deep_merge(base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
    """Deep merge two dictionaries.

    Args:
        base: Base dictionary
        override: Dictionary with override values

    Returns:
        Merged dictionary
    """
    result = base.copy()

    for key, value in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = _deep_merge(result[key], value)
        else:
            result[key] = value

    return result


def inject_env_vars(config: Optional[Dict[str, Any]] = None) -> None:
    """Inject environment variables from WT config into os.environ.

    This modifies the current process's environment variables.

    Args:
        config: Configuration dictionary (uses get_wt_config() if not provided)
    """
    if config is None:
        config = get_wt_config()

    # Inject environment variables from config
    env_vars = config.get("env", {})
    for key, value in env_vars.items():
        if value:  # Only set non-empty values
            os.environ[key] = str(value)


def load_wt_config() -> Dict[str, Any]:
    """Load WT config and inject environment variables.

    This is the main entry point for scripts that need WT configuration.

    Returns:
        Configuration dictionary
    """
    config = get_wt_config()
    inject_env_vars(config)
    return config


def get_image_generation_backend() -> str:
    """Get the preferred image generation backend from config.

    Returns:
        Backend name (nano_banana, huggingface, gemini)
    """
    config = get_wt_config()
    return config.get("image_generation", {}).get("backend", "nano_banana")


def get_env_var(key: str, default: Optional[str] = None) -> Optional[str]:
    """Get an environment variable value from WT config.

    First checks os.environ (already injected values take precedence),
    then falls back to WT config.

    Args:
        key: Environment variable name
        default: Default value if not found

    Returns:
        Environment variable value or default
    """
    # Check os.environ first (in case inject_env_vars was already called)
    if key in os.environ:
        return os.environ[key]

    # Fall back to config
    config = get_wt_config()
    return config.get("env", {}).get(key, default)


# =============================================================================
# Language Support Functions
# =============================================================================

def get_language_suffix(language_code: str) -> str:
    """Get the filename suffix for a given language code.

    Args:
        language_code: Language code (e.g., 'en', 'cn', 'jp')

    Returns:
        Filename suffix (e.g., 'en', 'cn', 'jp')

    Examples:
        >>> get_language_suffix("en")
        'en'
        >>> get_language_suffix("zh")  # Chinese alias
        'cn'
    """
    if language_code in LANGUAGE_CODES:
        return LANGUAGE_CODES[language_code]["suffix"]
    # Default to English for unknown codes
    return "en"


def get_language_name(language_code: str) -> str:
    """Get the display name for a given language code.

    Args:
        language_code: Language code (e.g., 'en', 'cn', 'jp')

    Returns:
        Display name (e.g., 'English', 'Chinese (Simplified)')

    Examples:
        >>> get_language_name("en")
        'English'
        >>> get_language_name("jp")
        'Japanese'
    """
    if language_code in LANGUAGE_CODES:
        return LANGUAGE_CODES[language_code]["name"]
    return language_code.upper()


def get_article_filename(base_name: str = "article", language_code: str = "en") -> str:
    """Generate the article filename with language suffix.

    Args:
        base_name: Base filename (default: 'article')
        language_code: Language code (e.g., 'en', 'cn', 'jp')

    Returns:
        Filename with language suffix (e.g., 'article_en.md')

    Examples:
        >>> get_article_filename()
        'article_en.md'
        >>> get_article_filename("article", "cn")
        'article_cn.md'
        >>> get_article_filename("post", "jp")
        'post_jp.md'
    """
    suffix = get_language_suffix(language_code)
    return f"{base_name}_{suffix}.md"


def parse_article_filename(filename: str) -> dict:
    """Parse language code from article filename.

    Args:
        filename: Filename to parse (e.g., 'article_en.md')

    Returns:
        Dict with 'base_name', 'language_code', 'language_name'

    Examples:
        >>> parse_article_filename("article_en.md")
        {'base_name': 'article', 'language_code': 'en', 'language_name': 'English'}
        >>> parse_article_filename("article.md")
        {'base_name': 'article', 'language_code': 'en', 'language_name': 'English'}
    """
    # Remove extension
    name = Path(filename).stem

    # Check for language suffix pattern: base_name_LL.md
    parts = name.rsplit("_", 1)
    if len(parts) == 2 and len(parts[1]) == 2:
        potential_code = parts[1].lower()
        if potential_code in LANGUAGE_CODES:
            return {
                "base_name": parts[0],
                "language_code": potential_code,
                "language_name": LANGUAGE_CODES[potential_code]["name"]
            }

    # No language suffix found, default to English
    return {
        "base_name": name,
        "language_code": "en",
        "language_name": "English"
    }


# =============================================================================
# Multi-Language Helper Functions
# =============================================================================


def get_supported_languages() -> list:
    """Get list of all supported languages with metadata.

    Returns:
        List of language dicts with code, suffix, name, emoji

    Examples:
        >>> langs = get_supported_languages()
        >>> len(langs) > 3
        True
    """
    # Get unique languages (exclude aliases)
    seen = set()
    languages = []

    for code, info in LANGUAGE_CODES.items():
        # Skip if this suffix is already seen (prevents duplicates from aliases)
        if info["suffix"] in seen:
            continue
        seen.add(info["suffix"])

        languages.append({
            "code": code,
            "suffix": info["suffix"],
            "name": info["name"],
            "emoji": info["emoji"]
        })

    # Sort by name alphabetically
    languages.sort(key=lambda x: x["name"])
    return languages


def get_language_variants(base_code: str) -> list:
    """Get regional variants for a language family.

    Args:
        base_code: Base language code (e.g., 'zh', 'pt')

    Returns:
        List of variant dicts with code, suffix, name, emoji

    Examples:
        >>> get_language_variants('zh')
        # Returns variants for Chinese (Simplified, Traditional, Hong Kong)
    """
    if base_code not in LANGUAGE_FAMILIES:
        # Return base language if no variants defined
        if base_code in LANGUAGE_CODES:
            info = LANGUAGE_CODES[base_code]
            return [{
                "code": base_code,
                "suffix": info["suffix"],
                "name": info["name"],
                "emoji": info["emoji"]
            }]
        return []

    return [
        {
            "code": code,
            "suffix": info["suffix"],
            "name": info["name"],
            "emoji": info["emoji"]
        }
        for code, info in LANGUAGE_FAMILIES[base_code].items()
    ]


def get_translation_targets(source_lang: str = "en") -> list:
    """Get recommended translation targets from source language.

    Args:
        source_lang: Source language code (default: 'en')

    Returns:
        List of recommended target languages with priority

    Examples:
        >>> targets = get_translation_targets('en')
        >>> # Returns high-priority languages like Spanish, Chinese, etc.
    """
    # Priority mapping based on global speakers and tech adoption
    HIGH_PRIORITY = ["es", "zh", "hi", "ar", "pt", "ko"]
    MEDIUM_PRIORITY = ["fr", "de", "ru", "ja", "it"]
    LOW_PRIORITY = ["tr", "vi", "th", "id", "nl", "pl"]

    targets = []
    for code, info in LANGUAGE_CODES.items():
        # Skip source language and aliases
        if code == source_lang or info["suffix"] == source_lang:
            continue
        if info["suffix"] != code:
            continue

        # Determine priority
        if code in HIGH_PRIORITY:
            priority = "high"
        elif code in MEDIUM_PRIORITY:
            priority = "medium"
        else:
            priority = "low"

        targets.append({
            "code": code,
            "suffix": info["suffix"],
            "name": info["name"],
            "emoji": info["emoji"],
            "priority": priority
        })

    # Sort by priority then by name
    priority_order = {"high": 0, "medium": 1, "low": 2}
    targets.sort(key=lambda x: (priority_order[x["priority"]], x["name"]))

    return targets


def validate_language_code(code: str) -> tuple:
    """Validate a language code and return normalized information.

    Args:
        code: Language code to validate (e.g., 'zh', 'ja', 'ko')

    Returns:
        Tuple of (is_valid, normalized_code, language_info)

    Examples:
        >>> validate_language_code('zh')
        (True, 'cn', {'suffix': 'cn', 'name': 'Chinese (Simplified)', 'emoji': '🇨🇳'})

        >>> validate_language_code('ko')
        (True, 'ko', {'suffix': 'ko', 'name': 'Korean', 'emoji': '🇰🇷'})

        >>> validate_language_code('xx')
        (False, 'xx', {})
    """
    if code in LANGUAGE_CODES:
        return True, code, LANGUAGE_CODES[code]

    # Check if it's a valid code not in our mapping
    # Could be extended to use ISO 639-1 codes
    return False, code, {}


# =============================================================================
# CLI Utility
# =============================================================================


# =============================================================================
# CLI Utility
# =============================================================================

def main():
    """CLI utility for managing WT configuration."""
    import argparse
    import sys

    parser = argparse.ArgumentParser(
        description="WT Configuration Manager",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Show current configuration
  python config_loader.py show

  # Show config file location
  python config_loader.py path

  # Validate config file
  python config_loader.py validate
        """
    )

    parser.add_argument(
        "command",
        choices=["show", "path", "validate"],
        help="Command to execute"
    )

    args = parser.parse_args()

    if args.command == "show":
        config = get_wt_config()
        print("WT Configuration:")
        print(json.dumps(config, indent=2))

    elif args.command == "path":
        config_path = get_config_path()
        print(f"Config file: {config_path}")
        if config_path.exists():
            print(f"Status: Exists")
        else:
            print(f"Status: Not found (will use defaults)")

    elif args.command == "validate":
        config_path = get_config_path()
        if not config_path.exists():
            print(f"✓ Config file does not exist (defaults will be used)")
            sys.exit(0)

        try:
            with open(config_path, 'r') as f:
                content = f.read()

            content = _strip_json_comments(content)
            json.loads(content)

            print(f"✓ Config file is valid")
            print(f"  Location: {config_path}")

        except json.JSONDecodeError as e:
            print(f"✗ Config file has JSON errors: {e}")
            sys.exit(1)


if __name__ == "__main__":
    main()
