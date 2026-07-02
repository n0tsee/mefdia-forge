#!/usr/bin/env bash
#
# Собирает распространяемый .dmg для macOS (Apple Silicon).
#
# Почему свой скрипт, а не `tauri build`: штатный create-dmg от Tauri оформляет
# окно DMG через Finder/AppleScript и падает без прав автоматизации. Здесь мы
# собираем .app силами Tauri, ad-hoc-подписываем его и пакуем в .dmg через
# hdiutil — надёжно и без GUI.
#
# Использование:  ./scripts/build-dmg.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

APP="src-tauri/target/release/bundle/macos/MediaForge.app"
OUT_DIR="dist-installer"
VERSION="$(node -p "require('./package.json').version")"
ARCH="aarch64"
DMG="$OUT_DIR/MediaForge_${VERSION}_${ARCH}.dmg"
STAGING="$(mktemp -d)"

echo "▸ Сборка .app через Tauri (без встроенного dmg-шага)…"
npm run tauri build -- --bundles app

echo "▸ Ad-hoc подпись бандла…"
codesign --force --deep --sign - "$APP"
codesign --verify --deep "$APP"

echo "▸ Упаковка в .dmg…"
mkdir -p "$OUT_DIR"
rm -f "$DMG"
cp -R "$APP" "$STAGING/"
ln -s /Applications "$STAGING/Applications"
hdiutil create \
  -volname "MediaForge" \
  -srcfolder "$STAGING" \
  -ov -format UDZO \
  "$DMG"

rm -rf "$STAGING"

echo ""
echo "✅ Готово: $DMG"
echo "   Размер: $(du -h "$DMG" | cut -f1)"
echo "   Инструкция для получателя: $OUT_DIR/УСТАНОВКА.md"
