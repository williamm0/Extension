#!/bin/bash
# jx Tools — macOS updater (headless, run via bash)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
EXT_DIR="$(dirname "$SCRIPT_DIR")"
INFO_FILE="$SCRIPT_DIR/update_info.json"

if [ ! -f "$INFO_FILE" ]; then
    echo "ERROR: update_info.json not found."
    exit 1
fi

parse_json() {
    local key="$1"
    python3 -c "import json; print(json.load(open('$INFO_FILE')).get('$key',''))" 2>/dev/null \
    || python  -c "import json; print(json.load(open('$INFO_FILE')).get('$key',''))" 2>/dev/null
}

DOWNLOAD_URL="$(parse_json url)"
VERSION="$(parse_json version)"

if [ -z "$DOWNLOAD_URL" ]; then
    echo "ERROR: could not read download URL."
    exit 1
fi

echo "Downloading $VERSION..."

WORK_ROOT="${HOME}/Library/Application Support/jx Tools/Updates"
mkdir -p "$WORK_ROOT"
TMP_DIR="$(mktemp -d "$WORK_ROOT/download_XXXXXX")"
ZIP_FILE="$TMP_DIR/jx_update.zip"

curl -L --fail --progress-bar -o "$ZIP_FILE" "$DOWNLOAD_URL"
CURL_STATUS=$?

if [ $CURL_STATUS -ne 0 ] || [ ! -f "$ZIP_FILE" ]; then
    echo "ERROR: download failed (curl exit $CURL_STATUS)."
    rm -rf "$TMP_DIR"
    exit 1
fi

echo "Extracting..."
EXTRACT_DIR="$TMP_DIR/extracted"
mkdir -p "$EXTRACT_DIR"
unzip -o "$ZIP_FILE" -d "$EXTRACT_DIR" > /dev/null 2>&1

ROOT=""
if [ -f "$EXTRACT_DIR/CSXS/manifest.xml" ]; then
    ROOT="$EXTRACT_DIR"
else
    for d in "$EXTRACT_DIR"/*/; do
        if [ -f "${d}CSXS/manifest.xml" ]; then
            ROOT="$d"
            break
        fi
    done
fi

if [ -z "$ROOT" ]; then
    echo "ERROR: could not locate CSXS/manifest.xml in archive."
    rm -rf "$TMP_DIR"
    exit 1
fi

echo "Installing..."
cp -r "$ROOT/." "$EXT_DIR/"
INSTALL_STATUS=$?

rm -rf "$TMP_DIR"
rm -f "$INFO_FILE"

if [ $INSTALL_STATUS -ne 0 ]; then
    echo "ERROR: file copy failed (exit $INSTALL_STATUS)."
    exit 1
fi

chmod +x "$EXT_DIR/update/update.command" 2>/dev/null

echo "Done: jx Tools $VERSION installed. Restart After Effects to apply."
exit 0
