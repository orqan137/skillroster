#!/bin/sh
set -eu

git config --global --add safe.directory "$SKILLSPACE_REGISTRY"
exec pnpm --filter @skillspace/web start -- --hostname "$HOSTNAME" --port "$PORT"
