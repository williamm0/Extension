#!/bin/bash

# Configuration
BUNDLE_ID="com.jx.tools"
CEP_DIR="$HOME/Library/Application Support/Adobe/CEP/extensions"
DEST="$CEP_DIR/$BUNDLE_ID"
API_URL="https://api.github.com/repos/williamm0/Extension/releases/latest"
TMP_DIR="/tmp/jx_install_$(date +%s)"

echo "  ------------------------------------------"
echo "  jx Tools - GitHub Latest Release Installer"
echo "  ------------------------------------------"

# 1. Enable Debug Mode
echo "  Setting Adobe Debug Mode..."
for v in 9 10 11 12 13 14; do
    defaults write com.adobe.CSXS.$v PlayerDebugMode 1 2>/dev/null
done
killall -u `whoami` cfprefsd 2>/dev/null

# 2. Get Download Link from GitHub API
echo "  Checking for latest files on GitHub..."
# Using -L to follow redirects (GitHub uses S3 for downloads)
ASSET_URL=$(curl -sL $API_URL | grep "browser_download_url" | grep ".zip" | cut -d '"' -f 4 | head -n 1)

if [ -z "$ASSET_URL" ]; then
    echo "  ERROR: No ZIP found on GitHub. Check your Release Assets."
    exit 1
fi

# 3. Download
mkdir -p "$TMP_DIR"
echo "  Downloading..."
curl -L "$ASSET_URL" -o "$TMP_DIR/release.zip"

# 4. Unzip and Install
echo "  Unpacking..."
unzip -q "$TMP_DIR/release.zip" -d "$TMP_DIR/extracted"

# Find the folder inside (GitHub zips usually have a nested folder)
SRC_DIR="$TMP_DIR/extracted"
for d in "$TMP_DIR/extracted"/*; do
    if [ -d "$d" ]; then SRC_DIR="$d"; break; fi
done

echo "  Installing to Adobe directory..."
mkdir -p "$CEP_DIR"
rm -rf "$DEST"
cp -R "$SRC_DIR/" "$DEST"

# 5. Cleanup and Permissions Fix
xattr -rd com.apple.quarantine "$DEST" 2>/dev/null
rm -rf "$TMP_DIR"

echo "  SUCCESS! Restart After Effects and check Window > Extensions."
echo ""
read -p "Press Enter to close..."