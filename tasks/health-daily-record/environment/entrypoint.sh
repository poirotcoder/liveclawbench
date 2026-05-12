#!/bin/sh
# Start mock-health in background from /workspace so health.db is created there.
# ENTRYPOINT survives when harbor overrides CMD to run the agent command.
set -e

cd /workspace
/opt/mock/bin/mock-health --port 5003 > /tmp/mock-health.log 2>&1 &

# Block until the service answers /health, so the agent and verifier never race
# against an empty database. Up to 30s.
i=0
while [ "$i" -lt 60 ]; do
    if curl -sf http://localhost:5003/health 2>/dev/null | grep -q '"ok":true'; then
        echo "mock-health ready"
        break
    fi
    i=$((i + 1))
    sleep 0.5
done

exec "$@"
