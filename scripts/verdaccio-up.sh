#!/bin/bash
set -e
cd "$(dirname "$0")/.."
# Local verdaccio через npm (без Docker)
exec node_modules/.bin/verdaccio --config verdaccio-config/config.yaml
