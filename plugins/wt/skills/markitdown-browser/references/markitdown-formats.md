# MarkItDown Formats Reference

Complete reference for MarkItDown document conversion formats and usage.

## Installation

```bash
# Using uv (recommended)
uv tool install 'markitdown[all]'

# Using pip
pip install markitdown[all]

# Verify installation
markitdown --version
markitdown --list-plugins
```

## Basic Usage

```bash
# Convert to stdout
markitdown document.pdf

# Save to file
markitdown document.pdf -o output.md

# Pipe from stdin
cat document.html | markitdown > output.md

# Read from URL (requires saving first)
curl -s https://example.com -o page.html
markitdown page.html -o content.md
```

## Supported Formats

List all available plugins:

```bash
markitdown --list-plugins
```

### Document Formats

| Format | Extensions | Notes |
|--------|------------|-------|
| **PDF** | `.pdf` | Extracts text, preserves structure, handles tables |
| **Word** | `.docx` | Preserves headings, lists, formatting |
| **PowerPoint** | `.pptx`, `.ppt` | Extracts slide content, speaker notes |
| **Excel** | `.xlsx`, `.xls` | Extracts data as markdown tables |
| **HTML** | `.html`, `.htm` | Converts semantic HTML to markdown |
| **Text** | `.txt`, `.md` | Pass-through with normalization |

### Web Content

```bash
# Static web pages
curl -s https://example.com | markitdown > content.md

# Save first, then convert (recommended)
curl -s https://example.com -o page.html
markitdown page.html -o content.md
```

**Note:** For JavaScript-rendered content, use agent-browser to save HTML first.

### Image Formats (OCR)

MarkItDown can extract text from images using OCR:

```bash
markitdown screenshot.png -o text.md
markitdown scan.jpg -o extracted.md
```

Supported: `.png`, `.jpg`, `.jpeg`, `.gif`, `.bmp`, `.webp`

### Audio Formats (Transcription)

```bash
markitdown recording.mp3 -o transcript.md
markitdown podcast.wav -o show.md
```

Supported: `.mp3`, `.wav`, `.m4a`, `.aac`, `.ogg`, `.flac`

**Note:** Requires transcription plugin installation.

### Video Formats (YouTube)

```bash
markitdown video.mp4 -o transcript.md
```

For YouTube videos, MarkItDown can extract captions/transcript.

### Email Formats

```bash
markitdown message.msg -o email.md
markitdown email.eml -o readable.md
```

Supported: `.msg` (Outlook), `.eml` (standard email format)

## Command Options

```bash
markitdown [INPUT] [OPTIONS]

Options:
  -o, --output FILE    Output file path
  --plugin PLUGIN      Force specific plugin
  -v, --verbose        Verbose output
  --list-plugins       List available conversion plugins
  --help               Show help message
```

## Usage Patterns

### PDF Conversion

```bash
# Single file
markitdown report.pdf -o report.md

# Batch conversion (shell loop)
for file in *.pdf; do
  markitdown "$file" -o "${file%.pdf}.md"
done

# View in pager
markitdown document.pdf | less
```

### Word Document Conversion

```bash
# Convert DOCX to markdown
markitdown proposal.docx -o proposal.md

# Preserves: headings, bold/italic, lists, tables, links
```

### PowerPoint Conversion

```bash
# Extract slide content
markitdown presentation.pptx -o slides.md

# Output format:
# ## Slide 1: Title
# Content here...
#
# ## Slide 2: Another Title
# More content...
```

### Excel Conversion

```bash
# Convert spreadsheet to markdown tables
markitdown data.xlsx -o tables.md

# Each sheet becomes a markdown table
```

### Web Page Conversion

```bash
# Static pages (fastest)
curl -s https://example.com | markitdown > content.md

# Save HTML first (recommended for complex pages)
curl -s https://example.com -o page.html
markitdown page.html -o content.md

# For JS-rendered pages, use agent-browser first
agent-browser open https://spa.example.com
agent-browser wait --load networkidle
# Save page source, then convert with markitdown
```

## Token Efficiency Benefits

MarkItDown provides significant token savings compared to raw formats:

| Input Format | Token Reduction | Why |
|--------------|-----------------|-----|
| HTML (web pages) | ~50% | Removes tags, scripts, styles |
| PDF | ~40% | Extracts text, removes binary data |
| DOCX | ~30% | Removes formatting codes |
| PPTX | ~60% | Removes layout metadata |

**Result:** Clean, structured markdown that LLMs process more efficiently.

## Error Handling

### Unsupported Format

```bash
# Check if format is supported
markitdown --list-plugins

# Try explicit plugin
markitdown document.docx --plugin docx > output.md
```

### Conversion Failures

```bash
# Verbose mode for debugging
markitdown document.pdf -v -o output.md

# Check file integrity
file document.pdf
```

### Large Files

```bash
# MarkItDown handles large files, but may be slow
# Consider splitting if conversion hangs:

# Split PDF pages (using pdftk)
pdftk large.pdf burst output page_%02d.pdf

# Convert individually
for page in page_*.pdf; do
  markitdown "$page" -o "${page%.pdf}.md"
done
```

## Integration Examples

### With agent-browser

```bash
# Navigate and save page source
agent-browser open https://example.com
agent-browser wait --load networkidle
# (save page source via browser methods)
markitdown page.html -o content.md
```

### With curl

```bash
# Quick web conversion
curl -s https://example.com | markitdown > content.md

# With headers (for authenticated content)
curl -s -H "Authorization: Bearer TOKEN" https://api.example.com/data | markitdown > content.md
```

### Batch Processing

```bash
# Convert all PDFs in directory
find . -name "*.pdf" -exec sh -c 'markitdown "$1" -o "${1%.pdf}.md"' _ {} \;

# Convert all Office documents
for ext in pdf docx pptx xlsx; do
  for file in *.$ext; do
    [ -f "$file" ] && markitdown "$file" -o "${file%.$ext}.md"
  done
done
```

## Output Quality Tips

1. **Use `-o` flag** - Direct file output is more reliable than shell redirection
2. **Check source quality** - Garbage in, garbage out (corrupt PDFs produce poor output)
3. **Verify OCR results** - Image transcription may require manual correction
4. **Clean HTML first** - For web pages, consider removing nav/footers before conversion
5. **Preserve structure** - MarkItDown maintains headings, lists, tables when possible
