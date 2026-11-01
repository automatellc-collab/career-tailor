#!/usr/bin/env bash
# Usage: audit.sh <out_dir> <client_current_url> <our_demo_url>
# Runs Lighthouse (mobile) on both sites and writes current.json / redesign.json.
set -euo pipefail
OUT=$1; CUR=$2; NEW=$3; mkdir -p "$OUT"
CHROME=${CHROME_PATH:-/opt/pw-browsers/chromium}
[ -x "$CHROME" ] || CHROME=$(command -v chromium || command -v google-chrome || true)
for pair in "current|$CUR" "redesign|$NEW"; do
  name=${pair%%|*}; url=${pair#*|}
  CHROME_PATH=$CHROME npx -y lighthouse@12.2.1 "$url" --quiet --form-factor=mobile \
    --chrome-flags="--headless=new --no-sandbox" --output=json --output-path="$OUT/$name.json"
done
python3 "$(dirname "$0")/extract.py" "$OUT/current.json" "$OUT/redesign.json" | tee "$OUT/summary.json"
