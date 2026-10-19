#!/bin/bash
set -e

# 1. Собираем веб-часть (web/dist)
cd "$(dirname "$0")/web"
npm run build

# 2. Собираем Android APK (offline flavor, debug)
cd "../android"
./gradlew assembleOfflineDebug

# 3. Копируем в папку apk2/ с меткой времени
OUT="app/build/outputs/apk/offline/debug/app-offline-debug.apk"
NAME="provodnik-test-$(date +%Y%m%d-%H%M).apk"
mkdir -p "../apk2"
cp "$OUT" "../apk2/$NAME"

echo ""
echo "✅ Готово: apk2/$NAME"
echo "Размер: $(du -h "../apk2/$NAME" | cut -f1)"
