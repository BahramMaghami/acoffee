#!/bin/bash
# Run through .cpanel.yml; no executable-bit change is needed.
set -eo pipefail

APP_ROOT="/home/acoffeer/repositories/acoffee"
ACTIVATE="/home/acoffeer/nodevenv/repositories/acoffee/24/bin/activate"

if [ ! -f "$ACTIVATE" ]; then
  echo "Create the Node.js 24 app first. Check the activation path against the command shown in cPanel."
  exit 1
fi
# CloudLinux supplies Node/npm and keeps node_modules in its virtual environment.
source "$ACTIVATE"
cd "$APP_ROOT"
export NODE_ENV=production

node -e 'if (Number(process.versions.node.split(".")[0]) !== 24) { console.error("This deployment expects Node.js 24"); process.exit(1) }'

# Prevent two deployments from installing/building in the same directory.
mkdir -p tmp
exec 9>tmp/deploy.lock
flock -n 9 || { echo "Another deployment is running."; exit 1; }

# cPanel application variables are not necessarily inherited by Git deployment.
# Next loads .env.production/.env itself; never source secrets as shell code.
if [ ! -f .env.production ] && [ ! -f .env ]; then
  echo "Create a private .env.production in the application root before deploying (see docs/cpanel-deployment.md)."
  exit 1
fi

# npm ci can remove CloudLinux's node_modules symlink. Install using the lockfile
# without rewriting it, retaining build-time dependencies (Prisma/TypeScript).
npm install --include=dev --package-lock=true --no-save --no-audit --no-fund

# Webpack supports CloudLinux's external node_modules symlink without Turbopack
# workspace-root restrictions. The normal Vercel build remains unchanged.
npm run build -- --webpack
test -s .next/BUILD_ID

# Passenger restarts on the next request, only after a successful build.
touch tmp/restart.txt
echo "Build complete; Passenger restart requested. No database migration was run."
