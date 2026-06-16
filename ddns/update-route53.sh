#!/bin/bash
# Keeps an A record pointed at the machine's current public IP. Runs as a
# sidecar container (loop) or one-shot (RUN_ONCE=1, e.g. from DSM Task Scheduler).
set -uo pipefail

: "${HOSTED_ZONE_ID:?need HOSTED_ZONE_ID}"
: "${RECORD_NAME:?need RECORD_NAME}"
TTL="${TTL:-300}"
INTERVAL="${INTERVAL:-300}"
IP_SERVICE="${IP_SERVICE:-https://checkip.amazonaws.com}"

log() { echo "$(date -u +%FT%TZ) [ddns] $*"; }

update_once() {
  local ip cur batch
  ip="$(curl -fsS --max-time 10 "$IP_SERVICE" | tr -d '[:space:]')"
  if [[ -z "$ip" ]]; then
    log "WARN: could not determine public IP"
    return 1
  fi

  cur="$(aws route53 list-resource-record-sets \
        --hosted-zone-id "$HOSTED_ZONE_ID" \
        --query "ResourceRecordSets[?Name=='${RECORD_NAME}.'&&Type=='A'].ResourceRecords[0].Value | [0]" \
        --output text 2>/dev/null)"

  if [[ "$ip" == "$cur" ]]; then
    log "no change ($ip)"
    return 0
  fi

  log "IP changed: ${cur:-none} -> ${ip}; updating Route 53"
  batch="$(printf '{"Comment":"homehome ddns","Changes":[{"Action":"UPSERT","ResourceRecordSet":{"Name":"%s","Type":"A","TTL":%s,"ResourceRecords":[{"Value":"%s"}]}}]}' \
          "$RECORD_NAME" "$TTL" "$ip")"

  if aws route53 change-resource-record-sets \
       --hosted-zone-id "$HOSTED_ZONE_ID" --change-batch "$batch" >/dev/null 2>&1; then
    log "updated ${RECORD_NAME} -> ${ip}"
  else
    log "ERROR: Route 53 update failed for ${ip}"
    return 1
  fi
}

if [[ "${RUN_ONCE:-0}" == "1" ]]; then
  update_once
else
  log "started: ${RECORD_NAME} (every ${INTERVAL}s)"
  while true; do
    update_once || true
    sleep "$INTERVAL"
  done
fi
