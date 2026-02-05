#!/usr/bin/env bash

# publish-to-surfing.sh
# Simple wrapper: copy article to Surfing content dir and trigger postsurfing CLI
# Handles Surfing-specific requirements: image paths, translations, topic-based filenames

set -eo pipefail  # Note: -u removed to allow unbound variables in optional operations

# Surfing project location
SURFING_PROJECT="${SURFING_PROJECT:-$HOME/projects/surfing}"
POSTSURFING_CLI="$SURFING_PROJECT/scripts/postsurfing/postsurfing.mjs"

# Defaults (can be overridden via env vars)
CONTENT_TYPE="${CONTENT_TYPE:-articles}"
LANGUAGE="${LANGUAGE:-en}"

# Language code mapping for translations property (cn -> zh, jp -> ja)
# Note: postsurfing CLI still uses cn/jp, but translations use zh/ja
get_translation_lang() {
    case "$1" in
        en) echo "en" ;;
        cn) echo "zh" ;;
        jp) echo "ja" ;;
        *)  echo "$1" ;;
    esac
}

usage() {
    cat << EOF
Usage: publish.sh <source-file> [OPTIONS]

Publish content to Surfing platform by copying to content directory and triggering postsurfing CLI.

Arguments:
    <source-file>       Path to article file to publish (from 5-adaptation/ or 6-publish/)

Options:
    -t, --type <type>       Content type: articles, showcase, documents, cheatsheets
    -l, --lang <lang>       Content language: en, cn, jp
    -d, --dry-run           Preview without publishing
    --no-copy              Skip file copy (if already in place)
    --no-build             Skip build validation in postsurfing CLI
    --no-commit            Skip git commit/push in postsurfing CLI
    --translations <langs>  Comma-separated list of available languages (e.g., en,zh)

Environment Variables:
    SURFING_PROJECT         Path to Surfing project (default: ~/projects/surfing)
    CONTENT_TYPE            Default content type
    LANGUAGE                Default language

Examples:
    # Publish article (default: articles/en)
    publish.sh 6-publish/article_en.md

    # Publish with custom type and language
    publish.sh article.md --type showcase --lang cn

    # Publish with translations specified
    publish.sh article.md --lang en --translations en,zh

    # Dry run to preview
    publish.sh article.md --dry-run

    # Publish without build validation (useful when build takes long)
    publish.sh article.md --no-build

    # Publish without git operations (commit manually later)
    publish.sh article.md --no-build --no-commit

For content types and languages, see Surfing project documentation.
EOF
}

# Parse arguments
SOURCE_FILE=""
DRY_RUN=""
NO_COPY=""
NO_BUILD=""
NO_COMMIT=""
TRANSLATIONS=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--type) CONTENT_TYPE="$2"; shift 2 ;;
        -l|--lang) LANGUAGE="$2"; shift 2 ;;
        -d|--dry-run) DRY_RUN="--dry-run"; shift ;;
        --no-copy) NO_COPY=1; shift ;;
        --no-build) NO_BUILD=1; shift ;;
        --no-commit) NO_COMMIT=1; shift ;;
        --translations) TRANSLATIONS="$2"; shift 2 ;;
        -h|--help) usage; exit 0 ;;
        -*)
            echo "Error: Unknown option $1" >&2
            usage
            exit 1
            ;;
        *)
            SOURCE_FILE="$1"
            shift
            ;;
    esac
done

# Validate source file
if [[ -z "$SOURCE_FILE" ]]; then
    echo "Error: Source file is required" >&2
    usage
    exit 1
fi

if [[ ! -f "$SOURCE_FILE" ]]; then
    echo "Error: Source file not found: $SOURCE_FILE" >&2
    exit 1
fi

# Check Surfing project
if [[ ! -d "$SURFING_PROJECT" ]]; then
    echo "Error: Surfing project not found: $SURFING_PROJECT" >&2
    echo "Set SURFING_PROJECT environment variable" >&2
    exit 1
fi

# Check postsurfing CLI
if [[ ! -f "$POSTSURFING_CLI" ]]; then
    echo "Error: postsurfing CLI not found: $POSTSURFING_CLI" >&2
    exit 1
fi

# For postsurfing CLI, use original language codes (cn, jp)
SURFING_LANG="$LANGUAGE"

# Function to extract field from YAML frontmatter
# Returns: Field value or empty string if field not found (always safe)
extract_field() {
    local file="$1"
    local field="$2"
    local result
    result=$(grep -E "^${field}:" "$file" 2>/dev/null | head -1 | sed "s/^${field}:[[:space:]]*//" | tr -d '"' | tr -d "'" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    echo "${result:-}"
}

# Function to extract and copy cover image
# Returns: Image reference to stdout, empty if no processing needed/possible
# Always exits with 0 for safe use with set -e
process_cover_image() {
    local source_file="$1"
    local target_dir="$2"

    # Extract cover_image or image field (handle missing fields gracefully)
    local cover_path
    cover_path=$(extract_field "$source_file" "cover_image" 2>/dev/null) || cover_path=""
    if [[ -z "$cover_path" ]]; then
        cover_path=$(extract_field "$source_file" "image" 2>/dev/null) || cover_path=""
    fi

    # Skip if no cover image found
    if [[ -z "$cover_path" ]]; then
        return 0
    fi

    # Skip if already using @assets/images/ format
    if [[ "$cover_path" == @assets/images/* ]]; then
        return 0
    fi

    # Skip if it's an absolute URL
    if [[ "$cover_path" =~ ^https?:// ]]; then
        return 0
    fi

    # Handle /images/ prefix - convert to @assets/images/ format
    if [[ "$cover_path" == /images/* ]]; then
        local filename
        filename=$(basename "$cover_path")
        echo "@assets/images/$filename"
        return 0
    fi

    # Handle relative paths like ../4-illustration/cover.webp
    if [[ "$cover_path" == ../* ]] || [[ "$cover_path" == ./* ]]; then
        local source_dir
        source_dir=$(dirname "$source_file")
        local full_path="$source_dir/$cover_path"

        # Validate source file exists before processing
        if [[ ! -f "$full_path" ]]; then
            >&2 echo "Warning: Cover image not found: $full_path"
            return 0
        fi

        local filename
        filename=$(basename "$full_path")
        local ext="${filename##*.}"
        local base_name="${filename%.*}"

        # Generate new filename based on article topic
        local topic
        topic=$(extract_field "$source_file" "topic" 2>/dev/null) || topic=""
        if [[ -z "$topic" ]]; then
            >&2 echo "Warning: No topic field found, using timestamp for image filename"
            topic="article-$(date +%s)"
        fi

        local safe_topic
        safe_topic=$(echo "$topic" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9\n' '-')
        local new_filename="${safe_topic}-cover.${ext}"

        # Copy to assets/images directory
        mkdir -p "$target_dir/assets/images"
        cp "$full_path" "$target_dir/assets/images/$new_filename"

        # Output message to stderr, image ref to stdout
        >&2 echo "Copied cover image: $full_path -> $target_dir/assets/images/$new_filename"
        echo "@assets/images/$new_filename"
        return 0
    fi

    # Unknown format, return as-is
    return 0
}

# Extract topic from frontmatter (use as filename)
TOPIC=$(extract_field "$SOURCE_FILE" "topic")
if [[ -z "$TOPIC" ]]; then
    echo "Warning: No 'topic' field in frontmatter, falling back to title-based slug"
    TITLE=$(extract_field "$SOURCE_FILE" "title")
    TOPIC=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9\n' '-' | sed 's/^-//;s/-$//')
fi

if [[ -z "$TOPIC" ]]; then
    echo "Error: Could not extract topic or title from frontmatter" >&2
    echo "Ensure your file has YAML frontmatter with a 'topic:' or 'title:' field" >&2
    exit 1
fi

echo "Article topic: $TOPIC"

# Determine target directory in Surfing
TARGET_DIR="$SURFING_PROJECT/contents/$CONTENT_TYPE/$SURFING_LANG"

# Process cover image and get new image reference
NEW_IMAGE_REF=$(process_cover_image "$SOURCE_FILE" "$SURFING_PROJECT")

# Copy file to Surfing content directory
if [[ -z "$NO_COPY" ]]; then
    echo "Copying to Surfing content directory..."
    mkdir -p "$TARGET_DIR"
    # Use topic as filename
    TARGET_FILE="$TARGET_DIR/$TOPIC.md"

    # Copy the file
    cp "$SOURCE_FILE" "$TARGET_FILE"

    # Update frontmatter in the copied file
    if [[ -n "$NEW_IMAGE_REF" ]]; then
        # Replace cover_image with image using @assets/images/ format
        sed -i '' "s|^cover_image:.*|image: $NEW_IMAGE_REF|" "$TARGET_FILE"
        # Also replace plain image field if it exists and uses old format
        sed -i '' "s|^image: ../.*|image: $NEW_IMAGE_REF|" "$TARGET_FILE"
        sed -i '' "s|^image: /images/.*|image: $NEW_IMAGE_REF|" "$TARGET_FILE"

        # Replace inline image references in article body (but NOT in frontmatter)
        # This handles markdown image syntax: ![alt](../4-illustration/cover.webp)
        # We need to be careful not to modify the description field in frontmatter
        awk -v new_ref="$NEW_IMAGE_REF" '
            BEGIN { in_frontmatter = 0 }
            /^---$/ { in_frontmatter = !in_frontmatter; print; next }
            !in_frontmatter {
                gsub(/]\(\.\.\/4-illustration\/cover\.webp\)/, "](" new_ref ")")
                gsub(/]\(\.\.\/4-illustration\/[^)]+\)/, "](" new_ref ")")
            }
            { print }
        ' "$TARGET_FILE" > "${TARGET_FILE}.tmp" && mv "${TARGET_FILE}.tmp" "$TARGET_FILE"

        echo "Updated image reference to: $NEW_IMAGE_REF"
    fi

    # Add translations field if specified
    if [[ -n "$TRANSLATIONS" ]]; then
        # Remove existing translations line if present
        sed -i '' '/^translations:/d' "$TARGET_FILE"
        # Add translations field after the language field using a temp file
        tmp_file="${TARGET_FILE}.tmp"
        awk -v trans="$TRANSLATIONS" '
            /^language:/ { print; print "translations: [" trans "]"; next }
            { print }
        ' "$TARGET_FILE" > "$tmp_file" && mv "$tmp_file" "$TARGET_FILE"
        echo "Added translations: [$TRANSLATIONS]"
    fi

    echo "Copied to: $TARGET_FILE"
else
    # File already in place, use topic as filename
    TARGET_FILE="$TARGET_DIR/$TOPIC.md"
fi

# Build postsurfing command
echo "Triggering postsurfing CLI..."

cd "$SURFING_PROJECT" || exit 1

# Build args: required --type, optional --lang, --dry-run, --no-build, --no-commit
POSTSURFING_ARGS=("--type" "$CONTENT_TYPE" "--lang" "$SURFING_LANG")
if [[ -n "$DRY_RUN" ]]; then
    POSTSURFING_ARGS+=("--dry-run")
fi
if [[ -n "$NO_BUILD" ]]; then
    POSTSURFING_ARGS+=("--no-build")
fi
if [[ -n "$NO_COMMIT" ]]; then
    POSTSURFING_ARGS+=("--no-commit")
fi

# Run postsurfing CLI
echo "Running postsurfing CLI..."
if node "$POSTSURFING_CLI" "$TARGET_FILE" "${POSTSURFING_ARGS[@]}"; then
    echo "✓ Publish completed successfully"
    [[ -n "$DRY_RUN" ]] && echo "(dry run - no changes applied)"
    [[ -n "$NO_BUILD" ]] && echo "Build validation skipped (--no-build)"
    [[ -n "$NO_COMMIT" ]] && echo "Git operations skipped (--no-commit)"
else
    echo "✗ Publish failed"
    echo "Tip: Use --no-build to skip build validation, or --no-commit to skip git operations"
    exit 1
fi
