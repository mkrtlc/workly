#!/bin/bash
# Build Workly extension zip for Chrome Web Store upload

VERSION=$(grep '"version"' manifest.json | sed 's/.*"\([0-9.]*\)".*/\1/')
OUTFILE="workly_v${VERSION}.zip"

rm -f "$OUTFILE"

zip -r "$OUTFILE" . \
  -x ".git/*" \
  -x ".github/*" \
  -x "screenshots/*" \
  -x "workly_v*" \
  -x "*.md" \
  -x ".gitignore" \
  -x ".DS_Store" \
  -x "**/.DS_Store" \
  -x "package.json" \
  -x "package-lock.json" \
  -x "create-icons.html" \
  -x "icons/logo.png" \
  -x "log.txt" \
  -x "build.sh"

echo ""
echo "Built $OUTFILE ($(du -h "$OUTFILE" | cut -f1))"
