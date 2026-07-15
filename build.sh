#!/usr/bin/env bash
#
# Security Ops — release builder
# Copyright (C) 2024-2026 Cristian Cezar Moises <ethicalhacker@riseup.net>
# SPDX-License-Identifier: GPL-3.0-or-later
#
# Builds reproducible, store-ready packages for Chrome, Edge and Firefox
# from the single source tree in src/.
#
#   ./build.sh            build all targets into dist/
#   ./build.sh clean      remove dist/
#
# Outputs:
#   dist/chrome/   dist/edge/   dist/firefox/      (unpacked, loadable dirs)
#   dist/securityops-<version>-<target>.zip        (store upload artifacts)
#   dist/SHA256SUMS                                (verify with: sha256sum -c)

set -euo pipefail
cd "$(dirname "$0")"

SRC=src
DIST=dist
VERSION=$(python3 -c "import json; print(json.load(open('$SRC/manifest.json'))['version'])")

if [[ "${1:-}" == "clean" ]]; then
  rm -rf "$DIST"
  echo "cleaned $DIST/"
  exit 0
fi

rm -rf "$DIST"
mkdir -p "$DIST"

copy_tree() { # $1 = target dir
  mkdir -p "$1"
  cp -r "$SRC"/. "$1"/
  cp LICENSE "$1"/LICENSE
  # Drop Chrome's generated DNR ruleset cache if it leaked into src/ from an
  # unpacked load; the browser regenerates it and it must not ship in the zip.
  rm -rf "$1/_metadata"
}

# ---- Chromium targets (Chrome / Edge): manifest used as-is ----
for target in chrome edge; do
  copy_tree "$DIST/$target"
done

# ---- Firefox: derive manifest (event page + gecko settings) ----
copy_tree "$DIST/firefox"
python3 - "$DIST/firefox/manifest.json" <<'PY'
import json, sys
path = sys.argv[1]
m = json.load(open(path))
# Firefox uses event-page background scripts, not a service worker
m["background"] = {"scripts": [m["background"]["service_worker"]]}
m.pop("minimum_chrome_version", None)
m["developer"] = {"name": "Cristian Cezar Moisés", "url": "https://securityops.co"}
m["browser_specific_settings"] = {
    "gecko": {
        "id": "securityops@securityops.co",
        "strict_min_version": "142.0",
        "data_collection_permissions": {"required": ["none"]},
    }
}
json.dump(m, open(path, "w"), indent=2, ensure_ascii=False)
print("firefox manifest derived")
PY

# ---- Zip artifacts (deterministic order, no extra metadata) ----
for target in chrome edge firefox; do
  out="securityops-${VERSION}-${target}.zip"
  (cd "$DIST/$target" && find . -type f | sort | zip -X -q "../$out" -@)
  echo "built $DIST/$out"
done

# ---- Checksums ----
(cd "$DIST" && sha256sum securityops-"$VERSION"-*.zip > SHA256SUMS)
echo
cat "$DIST/SHA256SUMS"
echo
echo "Security Ops v$VERSION build complete."
