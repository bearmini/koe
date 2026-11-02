#!/bin/bash
# Install (or update) the Koe Recording Overlay GNOME Shell extension
# for the current user and mark it enabled.
set -euo pipefail

UUID="koe-overlay@shuhei0866.github.io"
SRC="$(cd "$(dirname "$0")" && pwd)/$UUID"
DEST="${XDG_DATA_HOME:-$HOME/.local/share}/gnome-shell/extensions/$UUID"

mkdir -p "$DEST"
cp "$SRC"/metadata.json "$SRC"/extension.js "$SRC"/stylesheet.css "$DEST"/
echo "Installed to $DEST"

# Add to enabled-extensions so it starts with the next Shell session.
current="$(gsettings get org.gnome.shell enabled-extensions)"
if [[ "$current" != *"'$UUID'"* ]]; then
    if [[ "$current" == "@as []" || "$current" == "[]" ]]; then
        new="['$UUID']"
    else
        new="${current%]}, '$UUID']"
    fi
    gsettings set org.gnome.shell enabled-extensions "$new"
fi

# Works immediately only if the running Shell already knows the extension.
if gnome-extensions enable "$UUID" 2>/dev/null; then
    echo "Enabled. If an older version was loaded, log out and back in to reload it."
else
    echo "Enabled for the next session. On Wayland, log out and back in to load it."
fi
