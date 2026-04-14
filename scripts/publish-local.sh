#!/bin/bash
set -e
cd "$(dirname "$0")/.."

# Проверить что verdaccio запущен
if ! curl -sf http://localhost:4873/-/ping > /dev/null; then
  echo "❌ Verdaccio не запущен. Сначала: pnpm run verdaccio"
  exit 1
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
    npm publish --registry http://localhost:4873
    cd ../..
  fi
done

echo "✓ Все пакеты опубликованы"
