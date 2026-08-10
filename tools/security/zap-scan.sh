#!/usr/bin/env bash
# Simple OWASP ZAP baseline scan wrapper using Docker
# Usage: ./tools/security/zap-scan.sh [target_url]

TARGET=${1:-http://localhost:3000}
OUT_DIR="reports"
OUT_FILE="$OUT_DIR/zap-report.html"

mkdir -p "$OUT_DIR"

if command -v docker >/dev/null 2>&1; then
  echo "Running OWASP ZAP baseline scan against $TARGET"
  docker run --rm -v $(pwd)/$OUT_DIR:/zap/wrk/:rw -t owasp/zap2docker-stable zap-baseline.py -t "$TARGET" -r zap-report.html || true
  echo "Report saved to $OUT_FILE"
else
  echo "Docker not found. Please run ZAP manually or install Docker." >&2
  exit 2
fi
