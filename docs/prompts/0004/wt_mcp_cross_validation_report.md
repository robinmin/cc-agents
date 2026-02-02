# MCP Tools Cross-Validation Report

**Date**: 2026-02-02
**Scope**: wt plugin MCP tool usage validation against official documentation

## Summary

Cross-validated all MCP tool usage in the wt plugin against official documentation. Found **3 critical issues** requiring fixes.

---

## MCP Tools Validated

| Tool | Purpose | Status |
|------|---------|--------|
| `mcp__huggingface__gr1_z_image_turbo_generate` | Image generation | 🔴 Critical Issues Found |
| `mcp__huggingface__paper_search` | Academic paper search | ✅ Validated |
| `mcp__ref__search_documentation` | Documentation search | ✅ Validated |
| `mcp__ref__ref_read_url` | URL content fetch | ✅ Validated |

---

## Critical Issue #1: Z-Image Turbo Resolution Enum Mismatch

### Actual MCP Schema (from `/gradio_api/mcp/schema`)

The Z-Image-Turbo MCP server only supports **9 resolutions**:

```json
"enum": [
  "1024x1024 ( 1:1 )",
  "1344x576 ( 21:9 )",
  "1280x720 ( 16:9 )",
  "1248x832 ( 3:2 )",
  "1152x864 ( 4:3 )",
  "576x1344 ( 9:21 )",
  "720x1280 ( 9:16 )",
  "832x1248 ( 2:3 )",
  "864x1152 ( 3:4 )"
]
```

### Our Code (image_generator.py line 352-386)

Our `RESOLUTION_MAP` has **33 resolutions**, including many that will fail validation:

**Invalid resolutions (will cause MCP error):**
```python
# NOT in actual MCP schema:
(1152, 896): "1152x896 ( 9:7 )",      # ❌ INVALID
(896, 1152): "896x1152 ( 7:9 )",      # ❌ INVALID
(1280, 1280): "1280x1280 ( 1:1 )",    # ❌ INVALID
(1440, 1120): "1440x1120 ( 9:7 )",   # ❌ INVALID
(1120, 1440): "1120x1440 ( 7:9 )",   # ❌ INVALID
(1472, 1104): "1472x1104 ( 4:3 )",   # ❌ INVALID
# ... and 20+ more invalid entries
```

**Valid resolutions (only 9 match):**
```python
(1024, 1024): "1024x1024 ( 1:1 )",   # ✅ VALID
(1344, 576): "1344x576 ( 21:9 )",    # ✅ VALID
(1280, 720): "1280x720 ( 16:9 )",    # ✅ VALID
(1248, 832): "1248x832 ( 3:2 )",    # ✅ VALID
(1152, 864): "1152x864 ( 4:3 )",    # ✅ VALID
(576, 1344): "576x1344 ( 9:21 )",    # ✅ VALID
(720, 1280): "720x1280 ( 9:16 )",    # ✅ VALID
(832, 1248): "832x1248 ( 2:3 )",     # ✅ VALID
(864, 1152): "864x1152 ( 3:4 )",    # ✅ VALID
```

### Impact

- Any image generation request that maps to an invalid resolution will fail with MCP validation error
- Cover images using 2.35:1 aspect ratio (1920x817) will fail
- Many custom resolution requests will fail

### Fix Required

Update `image_generator.py` line 352-386 to use only the 9 valid resolutions.

---

## Critical Issue #2: Steps Parameter Range

### Actual MCP Schema

```json
"steps": {
  "type": "number",
  "default": 8
}
```

**No minimum/maximum specified in schema!**

### Our Code (line 470)

```python
"steps": max(1, min(request.steps, 20)),  # Z-Image Turbo: 1-20 steps
```

We're limiting steps to 1-20, but this limit is not in the actual schema.

### Impact

- Our artificial limit may be too restrictive
- Users might want more steps for higher quality
- The 1-20 range might be outdated or from a different model version

### Fix Required

Verify the actual steps range from Z-Image Turbo documentation and update accordingly.

---

## Critical Issue #3: Documentation vs Schema Mismatch

### Problem

The Z-Image-Turbo Space README describes "30+ resolution options" but the actual MCP schema only exposes 9.

### Possible Causes

1. **Version mismatch**: The README is outdated or from a different version
2. **MCP limitation**: Gradio MCP server only exposes a subset of available resolutions
3. **Different endpoints**: The Gradio UI might support more resolutions than the MCP tool

### Verification Needed

Check if there's a newer version of the MCP server or if we're using an outdated schema.

---

## Other MCP Tools (Validated ✅)

### mcp__huggingface__paper_search

**Usage**: `wt:super-researcher` agent for academic paper search

**Status**: ✅ Documentation matches usage

**Schema**: Standard search with `query`, `limit`, `concise_only` parameters

### mcp__ref__search_documentation

**Usage**: Multiple agents/skills for documentation lookup

**Status**: ✅ Correct usage pattern

### mcp__ref__ref_read_url

**Usage**: Reading documentation URLs

**Status**: ✅ Correct usage pattern

---

## Recommended Actions

### 1. Immediate Fix (Critical)

**File**: `plugins/wt/skills/image-generate/scripts/image_generator.py`

**Line 352-386**: Replace `RESOLUTION_MAP` with only the 9 valid resolutions:

```python
RESOLUTION_MAP = {
    # Only resolutions supported by the actual MCP schema
    (1024, 1024): "1024x1024 ( 1:1 )",
    (1344, 576): "1344x576 ( 21:9 )",
    (1280, 720): "1280x720 ( 16:9 )",
    (1248, 832): "1248x832 ( 3:2 )",
    (1152, 864): "1152x864 ( 4:3 )",
    (576, 1344): "576x1344 ( 9:21 )",
    (720, 1280): "720x1280 ( 9:16 )",
    (832, 1248): "832x1248 ( 2:3 )",
    (864, 1152): "864x1152 ( 3:4 )",
}
```

### 2. Update Closest Resolution Logic

The `_find_closest_resolution()` method needs updating since it tries to find the closest match from the full map. With only 9 resolutions, we need to ensure proper fallback behavior.

### 3. Verify Steps Range

Contact HuggingFace or check Z-Image Turbo documentation to confirm the actual steps range.

### 4. Add Schema Validation

Add automated testing to validate MCP tool schemas against our code:

```python
# Test idea: Fetch MCP schema and compare with RESOLUTION_MAP
import requests

def validate_resolution_map():
    schema = requests.get("https://victor-Z-Image-Turbo-MCP.hf.space/gradio_api/mcp/schema").json()
    valid_resolutions = schema[0]["inputSchema"]["properties"]["resolution"]["enum"]

    for res in NanoBananaBackend.RESOLUTION_MAP.values():
        assert res in valid_resolutions, f"Invalid resolution: {res}"
```

---

## References

- Z-Image-Turbo MCP Schema: https://victor-Z-Image-Turbo-MCP.hf.space/gradio_api/mcp/schema
- HuggingFace MCP Server Documentation: https://huggingface.co/spaces/victor/Z-Image-Turbo-MCP
- Gradio MCP Server Guide: https://huggingface.co/blog/gradio-mcp

---

**Status**: 🟡 Awaiting fixes for 3 critical issues

**Next Review**: After fixes are applied, re-validate with actual MCP tool calls
