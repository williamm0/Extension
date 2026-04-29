#!/bin/bash
# jx Tools force updater — run directly if the panel updater is blocked.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
EXT_DIR="$(dirname "$SCRIPT_DIR")"
INFO_FILE="$SCRIPT_DIR/update_info.json"
TAG=""
URL=""

read_json_key() {
    local key="$1"
    python3 -c "import json,sys; print(json.load(open('$INFO_FILE')).get('$key',''))" 2>/dev/null \
    || python -c "import json,sys; print(json.load(open('$INFO_FILE')).get('$key',''))" 2>/dev/null
}

if [ -f "$INFO_FILE" ]; then
    URL="$(read_json_key url)"
    TAG="$(read_json_key tag)"
fi

if [ -z "$URL" ]; then
    echo "Finding latest jx Tools release..."
    RELEASE_JSON="$(curl -L --fail -s -H 'User-Agent: jxtools-force-updater' https://api.github.com/repos/williamm0/Extension/releases/latest)"
    if [ -z "$RELEASE_JSON" ]; then
        echo "ERROR: Could not reach GitHub releases."
        exit 1
    fi
    URL="$(python3 - <<PY 2>/dev/null
import json
r=json.loads('''$RELEASE_JSON''')
print((r.get('assets') or [{}])[0].get('browser_download_url') or r.get('zipball_url') or '')
PY
)"
    TAG="$(python3 - <<PY 2>/dev/null
import json
r=json.loads('''$RELEASE_JSON''')
print(r.get('tag_name','latest'))
PY
)"
fi

if [ -z "$URL" ]; then
    echo "ERROR: No downloadable release asset or zipball was found."
    exit 1
fi

TMP_DIR="$(mktemp -d)"
ZIP_FILE="$TMP_DIR/jx_update.zip"
EXTRACT_DIR="$TMP_DIR/extracted"
BACKUP_DIR="$TMP_DIR/backup"
mkdir -p "$EXTRACT_DIR" "$BACKUP_DIR"

cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT

echo "Downloading $TAG with progress..."
curl -L --fail --progress-bar -o "$ZIP_FILE" "$URL"
if [ $? -ne 0 ] || [ ! -s "$ZIP_FILE" ]; then
    echo "ERROR: Download failed."
    exit 1
fi

echo "Extracting..."
unzip -o "$ZIP_FILE" -d "$EXTRACT_DIR" >/dev/null
if [ $? -ne 0 ]; then
    echo "ERROR: Could not unzip update."
    exit 1
fi

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
    echo "ERROR: Update archive does not contain CSXS/manifest.xml."
    exit 1
fi

echo "Backing up current extension..."
rsync -a --exclude 'update/update_info.json' "$EXT_DIR/" "$BACKUP_DIR/"
if [ $? -ne 0 ]; then
    echo "ERROR: Backup failed."
    exit 1
fi

echo "Installing into: $EXT_DIR"
rsync -a "$ROOT/" "$EXT_DIR/"
if [ $? -ne 0 ]; then
    echo "ERROR: Install failed; restoring backup."
    rsync -a "$BACKUP_DIR/" "$EXT_DIR/"
    exit 1
fi

chmod +x "$EXT_DIR/update/"*.command 2>/dev/null
rm -f "$INFO_FILE"

echo "Done: jx Tools $TAG installed. Restart After Effects."
exit 0
