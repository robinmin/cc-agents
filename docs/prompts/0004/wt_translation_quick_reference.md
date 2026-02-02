# Multi-Language Translation Quick Reference

## Summary

The wt plugin's technical-content-creation skill now supports **20+ languages** for content translation, expanded from the original 3 (English, Chinese, Japanese).

---

## Supported Languages

### 🔥 High Priority (Global Reach)

| Code | Language | Emoji | Filename |
|------|----------|-------|----------|
| `es` | Spanish | 🇪🇸 | `article_es.md` |
| `zh` → `cn` | Chinese (Simplified) | 🇨🇳 | `article_cn.md` |
| `hi` | Hindi | 🇮🇳 | `article_hi.md` |
| `ar` | Arabic | 🇸🇦 | `article_ar.md` |
| `pt` | Portuguese | 🇵🇹 | `article_pt.md` |
| `ko` | Korean | 🇰🇷 | `article_ko.md` |

### ⭐ Medium Priority (European Markets)

| Code | Language | Emoji | Filename |
|------|----------|-------|----------|
| `fr` | French | 🇫🇷 | `article_fr.md` |
| `de` | German | 🇩🇪 | `article_de.md` |
| `ru` | Russian | 🇷🇺 | `article_ru.md` |
| `ja` → `jp` | Japanese | 🇯🇵 | `article_jp.md` |
| `it` | Italian | 🇮🇹 | `article_it.md` |

### 💚 Available (Regional Expansion)

| Code | Language | Emoji | Filename |
|------|----------|-------|----------|
| `tr` | Turkish | 🇹🇷 | `article_tr.md` |
| `vi` | Vietnamese | 🇻🇳 | `article_vi.md` |
| `th` | Thai | 🇹🇭 | `article_th.md` |
| `id` | Indonesian | 🇮🇩 | `article_id.md` |
| `nl` | Dutch | 🇳🇱 | `article_nl.md` |
| `pl` | Polish | 🇵🇱 | `article_pl.md` |

---

## Usage Examples

### Basic Translation

```bash
# Translate article to Korean
/wt:translate 6-publish/article_en.md ko

# Translate to multiple languages
/wt:translate 6-publish/article_en.md es,de,fr

# With specific style
/wt:translate 6-publish/article_en.md ko --style blog
```

### Style Options

| Style | Description | Use Case |
|-------|-------------|----------|
| `technical` | Precise terminology, formal | Documentation, tutorials (default) |
| `blog` | Engaging, conversational | Blog posts, articles |
| `news` | Journalistic, objective | News, announcements |
| `social` | Casual, platform-native | Social media, threads |
| `academic` | Formal, citation-rich | Research papers |

### Python Script (Batch Translation)

```bash
cd plugins/wt/skills/technical-content-creation/scripts

# List all supported languages
python3 -c "from config_loader import get_supported_languages; print('\n'.join([f\"{l['code']}: {l['name']}\" for l in get_supported_languages()]))"

# Get translation recommendations
python3 -c "from config_loader import get_translation_targets; targets = get_translation_targets('en'); print('\n'.join([f\"{t['code']}: {t['name']} ({t['priority']})\" for t in targets[:10]]))"
```

---

## Filename Convention

Translated articles use language suffixes:

```
6-publish/
├── article_en.md   # English (source)
├── article_cn.md   # Chinese (Simplified)
├── article_jp.md   # Japanese
├── article_ko.md   # Korean
├── article_es.md   # Spanish
├── article_de.md   # German
├── article_fr.md   # French
├── article_ar.md   # Arabic
└── ...
```

---

## Files Modified

1. **`plugins/wt/skills/technical-content-creation/scripts/config_loader.py`**
   - Extended `LANGUAGE_CODES` dict with 17 new languages
   - Added `LANGUAGE_FAMILIES` for regional variants
   - Added helper functions:
     - `get_supported_languages()` - List all languages
     - `get_language_variants()` - Get regional variants
     - `get_translation_targets()` - Get recommended targets
     - `validate_language_code()` - Validate language codes

2. **`plugins/wt/commands/translate.md`**
   - Updated argument-hint with all supported languages
   - Added style option support
   - Organized languages by priority tiers

---

## Language Aliases

The system supports common aliases:

| Alias | Maps To | Example |
|-------|--------|---------|
| `zh` | `cn` | Chinese (Simplified) |
| `ja` | `jp` | Japanese |

Example: `/wt:translate article_en.md zh` → `article_cn.md`

---

## Regional Variants (Language Families)

For languages with regional differences, the system supports variants:

### Chinese Family
- `cn` → Chinese (Simplified) 🇨🇳
- `tw` → Chinese (Traditional) 🇹🇼
- `hk` → Chinese (Hong Kong) 🇭🇰

### Portuguese Family
- `pt` → Portuguese (Portugal) 🇵🇹
- `br` → Portuguese (Brazil) 🇧🇷

### English Family
- `en` → English (US) 🇺🇸
- `en-gb` → English (UK) 🇬🇧

---

## Testing

Verify the installation:

```bash
# Test language support
cd plugins/wt/skills/technical-content-creation/scripts
python3 -c "
from config_loader import get_supported_languages, validate_language_code

langs = get_supported_languages()
print(f'Supported languages: {len(langs)}')
for lang in langs[:5]:
    print(f\"  {lang['code']}: {lang['name']} {lang['emoji']}\")
"

# Test validation
python3 -c "
from config_loader import validate_language_code
print(validate_language_code('ko'))
print(validate_language_code('es'))
print(validate_language_code('xx'))
"
```

---

## Next Steps

### For Adding More Languages

1. Add entry to `LANGUAGE_CODES` in `config_loader.py`
2. Update `/wt:translate` command documentation
3. Test with: `/wt:translate article_en.md {new_lang_code}`

### For Custom Translation Prompts

Edit `/wt/commands/translate.md` to add language-specific translation guidelines, terminology preferences, or style conventions.

---

## Implementation Date

**2026-02-02**

Extended from 3 languages (EN, ZH, JA) to 20+ languages covering major global markets and tech communities.
