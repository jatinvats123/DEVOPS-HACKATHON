#!/usr/bin/env bash
#
# Regenerate package-lock.json files on Linux.
#
# WHY THIS EXISTS
#
# npm resolves optional, platform-specific dependencies differently per host.
# A lockfile generated on Windows or macOS omits entries that a Linux install
# requires (rolldown's native bindings and their emnapi wasm fallbacks are the
# ones that bite here), and `npm ci` then fails inside the Docker build and in
# CI with "can only install packages when your package.json and
# package-lock.json are in sync".
#
# The lockfile has to target the platform that BUILDS and RUNS the code, which
# is Linux. So it is generated in the same base image the Dockerfile uses.
#
# Run this after any dependency change made on a non-Linux machine, then commit
# the result.
#
#   ./scripts/sync-lockfiles.sh            # both packages
#   ./scripts/sync-lockfiles.sh Backend    # one package
#
set -euo pipefail

IMAGE="node:20-bookworm-slim"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PACKAGES=("${@:-Backend Frontend}")
read -ra PACKAGES <<< "${PACKAGES[*]}"

command -v docker >/dev/null || {
  echo "docker is required — it is what provides the Linux resolution target" >&2
  exit 1
}

for pkg in "${PACKAGES[@]}"; do
  dir="$ROOT/$pkg"
  [ -f "$dir/package.json" ] || { echo "no package.json in $pkg" >&2; exit 1; }

  echo "==> $pkg"

  # Resolve in a scratch directory inside the container and copy only the
  # lockfile back out. Installing into a bind-mounted node_modules would leave
  # Linux-built native binaries in the host tree.
  docker run --rm \
    -v "$dir/package.json:/seed/package.json:ro" \
    "$IMAGE" \
    sh -c 'mkdir -p /work && cp /seed/package.json /work/ && cd /work \
           && npm install --package-lock-only=false --no-audit --no-fund >/dev/null 2>&1 \
           && cat package-lock.json' > "$dir/package-lock.json.tmp"

  # Only replace on success — a truncated lockfile is worse than a stale one.
  if node -e "JSON.parse(require('fs').readFileSync('$dir/package-lock.json.tmp','utf8'))" 2>/dev/null; then
    mv "$dir/package-lock.json.tmp" "$dir/package-lock.json"
    count=$(node -e "console.log(Object.keys(require('$dir/package-lock.json').packages).length)")
    echo "    ok — $count packages"
  else
    rm -f "$dir/package-lock.json.tmp"
    echo "    FAILED — lockfile left unchanged" >&2
    exit 1
  fi
done

echo
echo "Lockfiles regenerated. Verify with:"
echo "  docker build -f Backend/Dockerfile -t watchtower-backend:check ."
