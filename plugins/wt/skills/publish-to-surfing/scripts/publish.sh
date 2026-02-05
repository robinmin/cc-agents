#!/usr/bin/env bash

# publish-to-surfing.sh
# Simple wrapper: copy article to Surfing content dir and trigger postsurfing CLI

set -euo pipefail

# Surfing project location
SURFING_PROJECT="${SURFING_PROJECT:-$HOME/projects/surfing}"
POSTSURFING_CLI="$SURFING_PROJECT/scripts/postsurfing/postsurfing.mjs"

# Defaults (can be overridden via env vars)
CONTENT_TYPE="${CONTENT_TYPE:-articles}"
LANGUAGE="${LANGUAGE:-en}"

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

Environment Variables:
    SURFING_PROJECT         Path to Surfing project (default: ~/projects/surfing)
    CONTENT_TYPE            Default content type
    LANGUAGE                Default language

Examples:
    # Publish article (default: articles/en)
    publish.sh 6-publish/article_en.md

    # Publish with custom type and language
    publish.sh article.md --type showcase --lang cn

    # Dry run to preview
    publish.sh article.md --dry-run

For content types and languages, see Surfing project documentation.
EOF
}

# Parse arguments
SOURCE_FILE=""
DRY_RUN=""
NO_COPY=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--type) CONTENT_TYPE="$2"; shift 2 ;;
        -l|--lang) LANGUAGE="$2"; shift 2 ;;
        -d|--dry-run) DRY_RUN="--dry-run"; shift ;;
        --no-copy) NO_COPY=1; shift ;;
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

# Determine target directory in Surfing
TARGET_DIR="$SURFING_PROJECT/contents/$CONTENT_TYPE/$LANGUAGE"

# Copy file to Surfing content directory
if [[ -z "$NO_COPY" ]]; then
    echo "Copying to Surfing content directory..."
    mkdir -p "$TARGET_DIR"
    cp "$SOURCE_FILE" "$TARGET_DIR/"
    SOURCE_BASENAME=$(basename "$SOURCE_FILE")
    TARGET_FILE="$TARGET_DIR/$SOURCE_BASENAME"
    echo "Copied to: $TARGET_FILE"
else
    # File already in place, determine path
    SOURCE_BASENAME=$(basename "$SOURCE_FILE")
    TARGET_FILE="$TARGET_DIR/$SOURCE_BASENAME"
fi

# Build postsurfing command
echo "Triggering postsurfing CLI..."

cd "$SURFING_PROJECT" || exit 1

if node "$POSTSURFING_CLI" "$TARGET_FILE" ${DRY_RUN:+--dry-run}; then
    echo "✓ Publish completed successfully"
    [[ -n "$DRY_RUN" ]] && echo "(dry run - no changes applied)"
else
    echo "✗ Publish failed"
    exit 1
fi
