# Multi-Language Translation Implementation Guide

## Overview

This guide explains how to add additional language support to the wt plugin's technical-content-creation workflow, extending beyond the current English, Chinese, and Japanese support.

## Current Architecture

### Supported Languages (Current)

| Code | Suffix | Language | Emoji | Aliases |
|------|--------|----------|-------|---------|
| `en` | `en` | English | 🇬🇧 | - |
| `cn` | `cn` | Chinese (Simplified) | 🇨🇳 | `zh` |
| `jp` | `jp` | Japanese | 🇯🇵 | `ja` |

### Translation Flow

```
Stage 3: Draft (article_draft.md)
    ↓
Stage 5: Adaptation (platform-specific)
    ↓
Stage 6: Publish (article_{lang}.md)
    ↓
Optional: /wt:translate article_en.md {target_lang}
```

---

## Implementation: Adding New Languages

### Step 1: Extend Language Code Mappings

**File**: `plugins/wt/skills/technical-content-creation/scripts/config_loader.py`

**Location**: Lines 46-52 (LANGUAGE_CODES dictionary)

**Add new language entries**:

```python
# Language code mappings
# Maps language codes to filename suffixes and display names
LANGUAGE_CODES = {
    # Existing languages
    "en": {"suffix": "en", "name": "English", "emoji": "🇬🇧"},
    "cn": {"suffix": "cn", "name": "Chinese (Simplified)", "emoji": "🇨🇳"},
    "jp": {"suffix": "jp", "name": "Japanese", "emoji": "🇯🇵"},
    "zh": {"suffix": "cn", "name": "Chinese (Simplified)", "emoji": "🇨🇳"},  # Alias for cn
    "ja": {"suffix": "jp", "name": "Japanese", "emoji": "🇯🇵"},  # Alias for jp

    # NEW LANGUAGES - Add entries below
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
    "en": {
        "us": {"suffix": "en", "name": "English (US)", "emoji": "🇺🇸"},
        "gb": {"suffix": "en-gb", "name": "English (UK)", "emoji": "🇬🇧"},
    }
}
```

---

### Step 2: Update Translation Command

**File**: `plugins/wt/commands/translate.md`

**Update the argument-hint and language support section**:

```markdown
---
description: Professional multi-lingual content translation (EN, ZH, JA, KO, ES, FR, DE, PT, RU, IT, AR, HI, TH, VI, ID, NL, PL, TR)
argument-hint: <file_path> <target_language> [--style <style>]
---

# Professional Content Translation

You are an elite multilingual translator with expertise in technical content localization across 20+ languages.

## Input Format

```
$ARGUMENTS = <file_path> <target_language> [--style <style>]
```

Where `<target_language>` is one of:

| Code | Language | Code | Language | Code | Language |
|------|----------|------|----------|------|----------|
| EN | English | ES | Spanish | RU | Russian |
| ZH | Chinese | FR | French | IT | Italian |
| JA | Japanese | DE | German | AR | Arabic |
| KO | Korean | PT | Portuguese | HI | Hindi |
| TH | Thai | PL | Polish | ID | Indonesian |
| VI | Vietnamese | TR | Turkish | NL | Dutch |

## Style Options

| Style | Description | Best For |
|-------|-------------|---------|
| `technical` | Precise terminology, formal structure | Documentation, tutorials |
| `blog` | Engaging, conversational | Blog posts, articles |
| `news` | Journalistic, objective | News, announcements |
| `social` | Casual, platform-native | Social media, threads |
| `academic` | Formal, citation-rich | Research papers |

## Language-Specific Guidelines

### CJK Languages (Chinese, Japanese, Korean)

- Use appropriate quotes: 「」 for ZH/JA, 「」 for KO
- Add spacing between CJK and Latin: `使用 Python 编写`
- Preserve proper nouns in original script when established

### RTL Languages (Arabic)

- Use RTL markdown formatting
- Preserve LTR content (code, URLs) in isolation
- Test RTL rendering before final output

### European Languages

- Respect formal/informal address (du/Sie, tú/usted)
- Use locale-specific quotation marks
- Preserve technical terminology in English when appropriate

## Translation Quality Assurance

For each translation, verify:

1. [ ] Complete information transfer (no omissions)
2. [ ] Technical accuracy (terminology consistency)
3. [ ] Natural expression (native-level flow)
4. [ ] Cultural appropriateness (avoid taboos/sensitivities)
5. [ ] Formatting preservation (markdown structure)
```

---

### Step 3: Add Helper Functions for Multi-Language Support

**File**: `plugins/wt/skills/technical-content-creation/scripts/config_loader.py`

**Add these functions after the existing language functions**:

```python
def get_supported_languages() -> list[dict]:
    """Get list of all supported languages with metadata.

    Returns:
        List of language dicts with code, suffix, name, emoji
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


def get_language_variants(base_code: str) -> list[dict]:
    """Get regional variants for a language family.

    Args:
        base_code: Base language code (e.g., 'zh', 'pt', 'en')

    Returns:
        List of variant dicts with code, suffix, name, emoji

    Examples:
        >>> get_language_variants('zh')
        [
            {'code': 'cn', 'suffix': 'cn', 'name': 'Chinese (Simplified)', 'emoji': '🇨🇳'},
            {'code': 'tw', 'suffix': 'tw', 'name': 'Chinese (Traditional)', 'emoji': '🇹🇼'},
        ]
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


def get_translation_targets(source_lang: str) -> list[dict]:
    """Get recommended translation targets from source language.

    Args:
        source_lang: Source language code (e.g., 'en')

    Returns:
        List of recommended target languages

    Examples:
        >>> get_translation_targets('en')
        [
            {'code': 'es', 'name': 'Spanish', 'priority': 'high'},
            {'code': 'zh', 'name': 'Chinese', 'priority': 'high'},
            {'code': 'fr', 'name': 'French', 'priority': 'medium'},
            ...
        ]
    """
    # Priority mapping based on global speakers and tech adoption
    HIGH_PRIORITY = ["es", "zh", "hi", "ar", "pt"]
    MEDIUM_PRIORITY = ["fr", "de", "ru", "ja", "ko"]
    LOW_PRIORITY = ["it", "tr", "vi", "th", "id"]

    targets = []
    for code, info in LANGUAGE_CODES.items():
        # Skip source language
        if code == source_lang or info["suffix"] == source_lang:
            continue

        # Skip aliases (keep primary codes only)
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


def validate_language_code(code: str) -> tuple[bool, str, dict]:
    """Validate a language code and return normalized information.

    Args:
        code: Language code to validate (e.g., 'zh', 'ja', 'en-us')

    Returns:
        Tuple of (is_valid, normalized_code, language_info)

    Examples:
        >>> validate_language_code('zh')
        (True, 'cn', {'suffix': 'cn', 'name': 'Chinese (Simplified)', 'emoji': '🇨🇳'})

        >>> validate_language_code('ja')
        (True, 'jp', {'suffix': 'jp', 'name': 'Japanese', 'emoji': '🇯🇵'})

        >>> validate_language_code('xx')
        (False, 'xx', {})
    """
    if code in LANGUAGE_CODES:
        return True, code, LANGUAGE_CODES[code]

    # Check if it's a valid code not in our mapping
    # Could be extended to use ISO 639-1 codes
    return False, code, {}
```

---

### Step 4: Update Topic Metadata Structure

**File**: `plugins/wt/skills/technical-content-creation/assets/topic.md`

**Add languages field**:

```yaml
---
name: topic-name
title: Human-Readable Topic Title
description: Brief description of the content topic
collection: collection-id
created_at: 2026-01-28
updated_at: 2026-01-28
status: draft
language: en
languages:  # NEW: Track all translated versions
  - code: en
    suffix: en
    name: English
    emoji: 🇬🇧
    file: 6-publish/article_en.md
    status: published
    translated_at: "2026-01-28T12:00:00Z"
  - code: zh
    suffix: cn
    name: Chinese (Simplified)
    emoji: 🇨🇳
    file: 6-publish/article_cn.md
    status: draft
    translated_at: null
  - code: ko
    suffix: ko
    name: Korean
    emoji: 🇰🇷
    file: 6-publish/article_ko.md
    status: pending
    translated_at: null
author:
  name: Author Name
  email: author@example.com
tags:
  - tag1
  - tag2
  - tag3
keywords:
  - keyword1
  - keyword2
  - keyword3
stage: 0
version: 1.0.0
review:
  last_reviewed_at: null
  reviewer: null
  status: pending
  feedback: []
links:
  materials: 0-materials/materials-extracted.md
  research: 1-research/research-brief.md
  outline: 2-outline/outline-approved.md
  draft: 3-draft/draft-article.md
  illustration: 4-illustration/
  adaptation: 5-adaptation/
  publish: 6-publish/article_en.md
stats:
  word_count: null
  reading_time: null
  source_count: 0
  image_count: 0
translation:
  base_language: en
  target_languages:
    - zh
    - ko
    - es
  completed:
    - en
  in_progress: []
  pending:
    - zh
    - ko
    - es
---
```

---

### Step 5: Create Multi-Language Translation Script

**File**: `plugins/wt/skills/technical-content-creation/scripts/translate_content.py`

```python
#!/usr/bin/env python3
"""
Multi-Language Content Translation Script

Translates technical content into multiple languages with proper
formatting, terminology preservation, and cultural adaptation.

Usage:
    python translate_content.py article_en.md --targets zh,ko,es
    python translate_content.py article_en.md --all
    python translate_content.py article_en.md --list
"""

import argparse
import json
import sys
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime

# Import language utilities
try:
    from config_loader import (
        LANGUAGE_CODES,
        get_supported_languages,
        get_language_suffix,
        get_language_name,
        validate_language_code
    )
except ImportError:
    print("Error: config_loader.py not found")
    sys.exit(1)


class ContentTranslator:
    """Handles multi-language content translation."""

    def __init__(self, source_file: Path):
        """Initialize translator with source file.

        Args:
            source_file: Path to source article file
        """
        self.source_file = Path(source_file)
        self.source_content = self.source_file.read_text(encoding="utf-8")

        # Detect source language from filename
        source_lang_code = self._detect_source_language()
        is_valid, normalized_code, lang_info = validate_language_code(source_lang_code)

        if not is_valid:
            print(f"Warning: Could not detect source language, assuming 'en'")
            self.source_lang = "en"
            self.source_lang_info = LANGUAGE_CODES["en"]
        else:
            self.source_lang = normalized_code
            self.source_lang_info = lang_info

    def _detect_source_language(self) -> str:
        """Detect source language from filename pattern.

        Expects format: article_{lang}.md or {base}_{lang}.md

        Returns:
            Language code (e.g., 'en', 'cn', 'jp')
        """
        stem = self.source_file.stem

        # Check for language suffix pattern
        if "_" in stem:
            parts = stem.rsplit("_", 1)
            if len(parts[1]) == 2 and parts[1].isalpha():
                return parts[1].lower()

        # Default to English
        return "en"

    def get_translation_prompt(self, target_lang: str, style: str = "technical") -> str:
        """Generate translation prompt for Claude.

        Args:
            target_lang: Target language code
            style: Translation style (technical, blog, news, social, academic)

        Returns:
            Translation prompt string
        """
        is_valid, normalized_code, lang_info = validate_language_code(target_lang)

        if not is_valid:
            raise ValueError(f"Invalid language code: {target_lang}")

        target_name = lang_info["name"]
        target_emoji = lang_info["emoji"]

        prompt = f"""You are an elite multilingual translator specializing in technical content.

## Task

Translate the following article from {self.source_lang_info['name']} to {target_name} {target_emoji}.

## Translation Style

{style.upper()} - {'Formal, precise terminology' if style == 'technical' else style}

## Content Type

Technical article about software development.

## Preservation Rules

CRITICAL - DO NOT TRANSLATE:
- Code blocks (``` or inline `) - keep as-is
- URLs - keep original
- @mentions - keep original
- #hashtags - keep original
- Proper nouns / Brand names - keep original, use spacing: "the UN resolution" → "该 UN 决议"
- Technical terms - keep original when no established translation exists

## Formatting Rules

- Preserve original structure: headings, lists, tables, blockquotes
- Output format: Markdown
- Spacing: Add space between CJK and Latin characters (e.g., "使用 Python 编写")

## Source Content

{self.source_content}

## Output Format

```markdown
# [Translated Title]

[Translated content in Markdown format, preserving all structure and formatting]
```

## Translation Instructions

1. Read and understand the full source content first
2. Translate accurately while maintaining technical precision
3. Use natural {target_name} expressions appropriate for {style} style
4. Ensure terminology consistency throughout
5. Verify all preservation rules are followed
6. Output ONLY the translated markdown, no explanations

Begin translation now:
"""

        return prompt

    def list_available_languages(self):
        """List all available translation target languages."""
        languages = get_supported_languages()

        print(f"\nSource Language: {self.source_lang_info['name']} {self.source_lang_info['emoji']}")
        print(f"\nAvailable Target Languages:\n")

        # Group by priority
        high = [l for l in languages if l['code'] in ['es', 'zh', 'hi', 'ar', 'pt', 'ko']]
        medium = [l for l in languages if l['code'] in ['fr', 'de', 'ru', 'ja', 'it']]
        low = [l for l in languages if l['code'] not in high + medium]

        if high:
            print("🔥 High Priority:")
            for lang in high:
                if lang['code'] != self.source_lang:
                    print(f"  {lang['code']:<4} {lang['emoji']} {lang['name']}")

        if medium:
            print("\n⭐ Medium Priority:")
            for lang in medium:
                if lang['code'] != self.source_lang:
                    print(f"  {lang['code']:<4} {lang['emoji']} {lang['name']}")

        if low:
            print("\n💚 Available:")
            for lang in low:
                if lang['code'] != self.source_lang:
                    print(f"  {lang['code']:<4} {lang['emoji']} {lang['name']}")

    def translate(self, target_langs: List[str], style: str = "technical") -> Dict[str, Any]:
        """Generate translation prompts for multiple target languages.

        Args:
            target_langs: List of target language codes
            style: Translation style

        Returns:
            Dict with translation prompts and metadata
        """
        translations = {}

        for lang in target_langs:
            try:
                prompt = self.get_translation_prompt(lang, style)
                is_valid, normalized_code, lang_info = validate_language_code(lang)

                translations[normalized_code] = {
                    "language": lang_info["name"],
                    "emoji": lang_info["emoji"],
                    "suffix": lang_info["suffix"],
                    "prompt": prompt,
                    "output_file": self.source_file.with_stem(
                        f"{self.source_file.stem.rsplit('_', 1)[0]}_{lang_info['suffix']}"
                    )
                }
            except ValueError as e:
                print(f"Warning: Skipping invalid language code '{lang}': {e}")
                continue

        return translations


def main():
    """CLI interface for content translation."""
    parser = argparse.ArgumentParser(
        description="Multi-Language Content Translation",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )

    parser.add_argument(
        "source_file",
        type=str,
        help="Source article file (e.g., article_en.md)"
    )

    parser.add_argument(
        "--targets",
        type=str,
        help="Comma-separated target language codes (e.g., zh,ko,es)"
    )

    parser.add_argument(
        "--all",
        action="store_true",
        help="Translate to all available languages"
    )

    parser.add_argument(
        "--list",
        action="store_true",
        help="List available target languages"
    )

    parser.add_argument(
        "--style",
        type=str,
        default="technical",
        choices=["technical", "blog", "news", "social", "academic"],
        help="Translation style (default: technical)"
    )

    parser.add_argument(
        "--output-prompts",
        type=str,
        help="Save translation prompts to JSON file"
    )

    args = parser.parse_args()

    # Initialize translator
    translator = ContentTranslator(args.source_file)

    # List languages
    if args.list:
        translator.list_available_languages()
        return

    # Determine target languages
    if args.all:
        languages = get_supported_languages()
        target_codes = [l["code"] for l in languages if l["code"] != translator.source_lang]
    elif args.targets:
        target_codes = [code.strip() for code in args.targets.split(",")]
    else:
        parser.error("Specify --targets or --all")

    # Generate translations
    translations = translator.translate(target_codes, args.style)

    print(f"\nGenerating {len(translations)} translation prompts...\n")

    for code, info in translations.items():
        print(f"✓ {info['language']} {info['emoji']} -> {info['output_file'].name}")

    # Save prompts if requested
    if args.output_prompts:
        output_file = Path(args.output_prompts)
        output_file.write_text(
            json.dumps(translations, indent=2, ensure_ascii=False),
            encoding="utf-8"
        )
        print(f"\nPrompts saved to: {output_file}")


if __name__ == "__main__":
    main()
```

---

### Step 6: Update Documentation

**File**: `plugins/wt/README.md`

**Add multi-language section**:

```markdown
## Multi-Language Support

### Supported Languages

The wt plugin supports content translation into 20+ languages:

| Priority | Languages | Use Case |
|----------|-----------|----------|
| 🔥 High | Spanish, Chinese, Hindi, Arabic, Portuguese, Korean | Global reach |
| ⭐ Medium | French, German, Russian, Japanese, Italian | European markets |
| 💚 Available | Turkish, Vietnamese, Thai, Indonesian, Dutch, Polish | Regional expansion |

### Usage Examples

```bash
# Translate to specific languages
/wt:translate article_en.md ko
/wt:translate article_en.md zh,ko,es

# Translate with style
/wt:translate article_en.md es --style blog

# Batch translate using script
python scripts/translate_content.py article_en.md --targets zh,ko,es
python scripts/translate_content.py article_en.md --all
```

### Filename Convention

Translated articles use language suffixes:

```
6-publish/
├── article_en.md  # English (source)
├── article_cn.md  # Chinese (Simplified)
├── article_ko.md  # Korean
├── article_es.md  # Spanish
├── article_fr.md  # French
└── article_de.md  # German
```
```

---

## Quick Implementation Checklist

- [ ] **Step 1**: Update `LANGUAGE_CODES` in `config_loader.py`
- [ ] **Step 2**: Update `/wt:translate` command with new languages
- [ ] **Step 3**: Add helper functions to `config_loader.py`
- [ ] **Step 4**: Update `topic.md` with `languages` field
- [ ] **Step 5**: Create `translate_content.py` script
- [ ] **Step 6**: Update documentation in `README.md`
- [ ] **Test**: Translate article to new language
- [ ] **Verify**: Check filename format and content quality

---

## Recommended Language Priority

Based on global tech community size and content consumption:

### Tier 1 (Implement First)
- **Korean (ko)** 🇰🇷 - Large tech community, active developers
- **Spanish (es)** 🇪🇸 - 20+ Spanish-speaking countries
- **Portuguese (pt)** 🇧🇷 - Large Brazilian market

### Tier 2 (High Value)
- **German (de)** 🇩🇪 - Strong European tech sector
- **French (fr)** 🇫🇷 - African & European markets
- **Arabic (ar)** 🇸🇦 - MENA region growth

### Tier 3 (Regional)
- **Hindi (hi)** 🇮🇳 - Indian subcontinent
- **Russian (ru)** 🇷🇺 - Eastern Europe/CIS
- **Italian (it)** 🇮🇹 - European market

---

## Testing Your Implementation

```bash
# Test 1: Validate language codes
cd plugins/wt/skills/technical-content-creation/scripts
python3 -c "
from config_loader import get_supported_languages, validate_language_code
print('Supported languages:')
for lang in get_supported_languages():
    print(f\"  {lang['code']}: {lang['name']} {lang['emoji']}\")
"

# Test 2: Generate translation prompt
python3 translate_content.py article_en.md --list

# Test 3: Create batch translation
python3 translate_content.py article_en.md --targets ko,es,de --output-prompts prompts.json

# Test 4: Verify filename format
ls -la 6-publish/article_*.md
```
