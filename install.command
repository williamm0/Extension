#!/bin/bash
# jx Tools - After Effects CEP Extension Installer

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUNDLE_ID="com.jx.tools"
CEP_DIR="$HOME/Library/Application Support/Adobe/CEP/extensions"
DEST="$CEP_DIR/$BUNDLE_ID"

echo ""
echo "  jx Tools Installer"
echo "  ─────────────────────────────────"
echo ""

# Enable unsigned extension debug mode for all common CEP versions
echo "  Enabling CEP debug mode..."
for v in 9 10 11 12 13; do
    defaults write com.adobe.CSXS.$v PlayerDebugMode 1 2>/dev/null
done

# Make sure the CEP extensions folder exists
mkdir -p "$CEP_DIR"

# Remove previous install
if [ -L "$DEST" ] || [ -d "$DEST" ]; then
    rm -rf "$DEST"
fi

# Symlink the extension folder
ln -sf "$SCRIPT_DIR" "$DEST"

if [ $? -eq 0 ]; then
    echo "  Installed at:"
    echo "  $DEST"
    echo ""
    echo "  Restart After Effects, then open:"
    echo "  Window > Extensions > jx Tools"
    echo ""
    osascript -e 'display notification "Restart After Effects, then open Window > Extensions > jx Tools." with title "jx Tools installed"' 2>/dev/null
else
    echo "  ERROR: Could not create symlink."
    echo "  Try running: sudo bash \"$SCRIPT_DIR/install.command\""
fi

echo ""
