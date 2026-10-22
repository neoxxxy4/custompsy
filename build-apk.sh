#!/bin/bash
set -e
cd "$(dirname "$0")"

# 1. Автобамп versionCode
GRADLE=android/app/build.gradle
CURRENT=$(grep -oE 'versionCode [0-9]+' "$GRADLE" | awk '{print $2}')
NEXT=$((CURRENT + 1))
sed -i '' "s/versionCode $CURRENT/versionCode $NEXT/" "$GRADLE"
echo "versionCode: $CURRENT -> $NEXT"

# 2. Собираем веб-часть (web/dist)
cd web
npm run build

# 3. Собираем Android APK (prod flavor, debug)
cd ../android
./gradlew assembleProdDebug

OUT="app/build/outputs/apk/prod/debug/app-prod-debug.apk"
NAME="provodnik-debug-$(date +%Y%m%d-%H%M).apk"
cp "$OUT" "../apk/$NAME"

# 4. Публикуем на сервер для автообновления
SSH_OPTS="-i $HOME/.ssh/custompsy_deploy -o StrictHostKeyChecking=no"
ssh $SSH_OPTS root@79.174.83.171 'mkdir -p /opt/custompsy/apk-live'
scp $SSH_OPTS "$OUT" root@79.174.83.171:/opt/custompsy/apk-live/latest.apk
ssh $SSH_OPTS root@79.174.83.171 "printf '{\"versionCode\": %s, \"url\": \"https://neoxxxy-4.ru/app/latest.apk\"}\n' $NEXT > /opt/custompsy/apk-live/version.json"

echo ""
echo "✅ Готово: apk/$NAME (versionCode $NEXT, опубликовано для автообновления)"
echo "Размер: $(du -h "../apk/$NAME" | cut -f1)"
