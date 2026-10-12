#!/bin/bash
set -e

# 1. Собираем веб-часть (web/dist)
cd "$(dirname "$0")/web"
npm run build

# 2. Собираем Android APK (debug, подписанный debug-ключом — для теста на устройстве)
cd "../android"
./gradlew assembleDebug

# 3. Копируем в папку apk/ с меткой времени
OUT="app/build/outputs/apk/debug/app-debug.apk"
NAME="provodnik-debug-$(date +%Y%m%d-%H%M).apk"
cp "$OUT" "../apk/$NAME"

echo ""
echo "✅ Готово: apk/$NAME"
echo "Размер: $(du -h "../apk/$NAME" | cut -f1)"
