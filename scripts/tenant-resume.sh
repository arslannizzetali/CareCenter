#!/usr/bin/env bash
set -euo pipefail

# tenant-suspend.sh ile durdurulmuş bir kurumu, veri kaybı olmadan geri açar.
#
# Kullanım: scripts/tenant-resume.sh <slug>

if [[ $# -lt 1 ]]; then
  echo "Kullanım: $0 <slug>" >&2
  exit 1
fi

SLUG="$1"

if ! docker ps -a --format '{{.Names}}' | grep -qx "${SLUG}-api"; then
  echo "HATA: ${SLUG}-api container'ı yok." >&2
  exit 1
fi

echo "==> [$SLUG] geri açılıyor"
docker start "${SLUG}-api" "${SLUG}-web"
echo "$SLUG tekrar erişilebilir."
