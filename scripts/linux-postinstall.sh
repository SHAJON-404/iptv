#!/bin/bash
# Post-install script for IPTV Player (.deb / .rpm)

set -e

# Update desktop database for the .desktop file
if command -v update-desktop-database &>/dev/null; then
  update-desktop-database -q /usr/share/applications 2>/dev/null || true
fi

# Update icon cache
if command -v gtk-update-icon-cache &>/dev/null; then
  gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor 2>/dev/null || true
fi
