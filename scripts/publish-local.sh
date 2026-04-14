#!/bin/bash
set -e
cd "$(dirname "$0")/.."

# Проверить что verdaccio запущен
if ! curl -sf http://localhost:4873/-/ping > /dev/null; then
  echo "❌ Verdaccio не запущен. Сначала: pnpm run verdaccio"
  exit 1
fi

# Auto-create user если ещё не создан (idempotent через API)
if ! npm whoami --registry http://localhost:4873 2>/dev/null > /dev/null; then
  echo "⏳ Создаю user idf:idf через API..."
  AUTH=$(curl -s -X PUT \
    -H "Content-Type: application/json" \
    -d '{"name":"idf","password":"idf","email":"dev@idf.local"}' \
    http://localhost:4873/-/user/org.couchdb.user:idf)
  TOKEN=$(echo "$AUTH" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
  if [ -z "$TOKEN" ]; then
    echo "❌ Не удалось создать user: $AUTH"
    exit 1
  fi
  npm config set //localhost:4873/:_authToken "$TOKEN"
  echo "✓ User создан, token прописан"
fi

# Build всё
pnpm -r build

# Publish каждый пакет
for pkg in packages/*; do
  if [ -f "$pkg/package.json" ]; then
    name=$(node -p "require('./$pkg/package.json').name")
    version=$(node -p "require('./$pkg/package.json').version")
    echo "📦 Publishing $name@$version"
    cd "$pkg"
    npm publish --registry http://localhost:4873 || echo "⚠ publish failed (возможно уже опубликован)"
    cd ../..
  fi
done

echo "✓ Готово"
