#!/bin/bash
set -eo pipefail
cd /home/acoffeer/repositories/acoffee
EXPECTED_SHA="${1:-}"
[[ "$EXPECTED_SHA" =~ ^[0-9a-f]{40}$ ]] || { echo 'Invalid commit ID.'; exit 1; }
mkdir -p tmp
exec 8>tmp/github-deploy.lock
flock -n 8 || { echo 'Another GitHub deployment is running.'; exit 1; }
exec 9>tmp/deploy.lock
flock -n 9 || { echo 'Another deployment is running.'; exit 1; }
test "$(git branch --show-current)" = main
test -z "$(git status --porcelain)" || { echo 'Host working tree is dirty; review changes before deploying.'; exit 1; }
GIT_TERMINAL_PROMPT=0 git fetch origin main
if [ "$(git rev-parse origin/main)" != "$EXPECTED_SHA" ]; then
  echo 'This workflow was superseded by a newer main commit; skipping.'
  exit 0
fi
if ! git diff --quiet HEAD "$EXPECTED_SHA" -- prisma/schema.prisma prisma/migrations; then
  echo 'Database schema changed. Review and apply migrations separately before manual deployment.'
  exit 1
fi
git merge --ff-only "$EXPECTED_SHA"
# Keep the lock across fetch, merge, install, build and restart.
ACOFFEE_DEPLOY_LOCK_HELD=1 bash scripts/deploy-cpanel.sh
