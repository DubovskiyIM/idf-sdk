#!/bin/bash
set -e
cd "$(dirname "$0")/.."
docker run -it --rm --name idf-verdaccio \
  -p 4873:4873 \
  -v "$(pwd)/verdaccio-config:/verdaccio/conf" \
  -v "$(pwd)/verdaccio-config/storage:/verdaccio/storage" \
  verdaccio/verdaccio
