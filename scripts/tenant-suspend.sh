#!/usr/bin/env bash
set -euo pipefail

# Kill-switch: bir kurumun erişimini ANINDA ve GERİ ALINABİLİR şekilde keser.
# Veritabanı, dosyalar, secret'lar dokunulmadan durur — sadece api+web container'ları
# durdurulur. Sözleşme yenilenirse tenant-resume.sh ile aynen geri açılır.
#
# Kullanım: scripts/tenant-suspend.sh <slug>

if [[ $# -lt 1 ]]; then
  echo "Kullanım: $0 <slug>" >&2
  exit 1
fi

SLUG="$1"

if ! docker ps -a --format '{{.Names}}' | grep -qx "${SLUG}-api"; then
  echo "HATA: ${SLUG}-api container'ı yok. Kurum adını kontrol et (scripts/tenant-create.sh ile mi kuruldu?)." >&2
  exit 1
fi

echo "==> [$SLUG] askıya alınıyor"
docker stop "${SLUG}-api" "${SLUG}-web"
echo "$SLUG artık erişilemez durumda. Geri açmak için: scripts/tenant-resume.sh $SLUG"
