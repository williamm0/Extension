#!/bin/bash

# ---------------------------------------------------------
# jx Tools - macOS Smart Installer
# ---------------------------------------------------------

BUNDLE_ID="com.jx.tools"
CEP_DIR="$HOME/Library/Application Support/Adobe/CEP/extensions"
DEST="$CEP_DIR/$BUNDLE_ID"
API_URL="https://api.github.com/repos/williamm0/Extension/releases/latest"
TMP_DIR="/tmp/jx_mac_install_$(date +%s)"

echo ""
echo "  ------------------------------------------"
echo "  jx Tools - macOS GitHub Installer"
echo "  ------------------------------------------"
echo ""

# 1. ENABLE ADOBE DEBUG MODE
echo "  Unlocking Adobe permissions..."
for v in 9 10 11 12 13 14; do
    defaults write com.adobe.CSXS.$v PlayerDebugMode 1 2>/dev/null
done
killall -u `whoami` cfprefsd 2>/dev/null

# 2. GET DOWNLOAD URL FROM GITHUB
echo "  Connecting to GitHub..."
ASSET_URL=$(curl -sL $API_URL | grep "browser_download_url" | grep -i "\.zip" | cut -d '"' -f 4 | head -n 1)

# Fallback to source code zip if no release asset is attached
if [ -z "$ASSET_URL" ]; then
    ASSET_URL=$(curl -sL $API_URL | grep "zipball_url" | cut -d '"' -f 4 | head -n 1)
fi

if [ -z "$ASSET_URL" ]; then
    echo "  ERROR: No ZIP found in the latest GitHub release."
    exit 1
fi

# 3. DOWNLOAD & EXTRACT
echo "  Downloading latest release..."
mkdir -p "$TMP_DIR"
curl -L -s "$ASSET_URL" -o "$TMP_DIR/release.zip"

echo "  Unpacking files..."
unzip -q "$TMP_DIR/release.zip" -d "$TMP_DIR/extracted"

# 4. SMART FOLDER DETECTION (Finds where CSXS actually is)
CSXS_DIR=$(find "$TMP_DIR/extracted" -type d -name "CSXS" | head -n 1)

if [ -z "$CSXS_DIR" ]; then
    echo "  ERROR: Could not find a valid extension (CSXS folder) inside the ZIP."
    rm -rf "$TMP_DIR"
    exit 1
fi

# Get the parent folder of CSXS
SRC_PATH=$(dirname "$CSXS_DIR")

# 5. NUKE AND INSTALL
echo "  Installing to Adobe folder..."
mkdir -p "$CEP_DIR"
rm -rf "$DEST"  # Wipe the old version completely (fixes Leaf/Permission errors)
cp -R "$SRC_PATH/" "$DEST"

# 6. CLEANUP
# Remove installer scripts so they don't sit in the Adobe folder
rm -f "$DEST/install.bat" "$DEST/install.command" 2>/dev/null

# Strip Apple's "Quarantine" flag so the files are allowed to run
xattr -rd com.apple.quarantine "$DEST" 2>/dev/null

rm -rf "$TMP_DIR"

echo ""
echo "  SUCCESS! jx Tools is installed."
echo "  Restart After Effects and check Window > Extensions."
echo ""

# Keep the terminal window open so the user can read the success message
read -p "Press [Enter] to exit..."