#!/bin/bash
set -eo pipefail
APP_ROOT=/home/acoffeer/repositories/acoffee
cd "$APP_ROOT"
EXPECTED="$(cat .next/DEPLOY_COMMIT)"
[[ "$EXPECTED" =~ ^[0-9a-f]{40}$ ]]
mkdir -p tmp
touch tmp/restart.txt
# LiteSpeed on this host did not honor restart.txt. Only signal this user's
# processes whose entire title identifies this exact application directory.
while read -r pid args; do
  if [ "$args" = "lsnode:$APP_ROOT/" ] || [ "$args" = "lsnode:$APP_ROOT" ]; then
    current="$(ps -p "$pid" -o args= 2>/dev/null || true)"
    if [ "$current" = "$args" ]; then kill -TERM "$pid"; fi
  fi
done < <(ps -u "$(id -u)" -o pid=,args=)
for attempt in {1..12}; do
  if curl --silent --show-error --fail --max-time 15 \
      --resolve acoffeeroasters.com:443:213.176.126.248 \
      -D tmp/deploy-health.headers -o /dev/null \
      "https://acoffeeroasters.com/login?deploy=$EXPECTED"; then
    if tr -d '\r' < tmp/deploy-health.headers | grep -iq "^x-acoffee-release: $EXPECTED$"; then
      echo "Verified running release $EXPECTED"
      exit 0
    fi
  fi
  sleep 2
done
echo 'The new running release could not be verified. Inspect the application logs.'
exit 1
