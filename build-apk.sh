#!/bin/bash
set -e

# 1. Собираем веб-часть (web/dist)
cd "$(dirname "$0")/web"
npm run build

# 2. Собираем Android APK (prod flavor, debug)
cd "../android"
./gradlew assembleProdDebug

# 3. Копируем в папку apk/ с меткой времени
OUT="app/build/outputs/apk/prod/debug/app-prod-debug.apk"
NAME="provodnik-debug-$(date +%Y%m%d-%H%M).apk"
cp "$OUT" "../apk/$NAME"

echo ""
echo "✅ Готово: apk/$NAME"
echo "Размер: $(du -h "../apk/$NAME" | cut -f1)"
