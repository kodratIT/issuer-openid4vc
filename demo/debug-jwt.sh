#!/bin/bash

# Ambil JWT dari endpoint
JWT=$(docker exec demo-issuer-1 curl -s http://localhost:3001/tenant/ccf7a0dd-d518-4e6f-8403-f83630f05e24/oid4vp/request/9f36a1d2-97f4-43fd-8dbe-132556ee761c 2>/dev/null)

echo "=== JWT TOKEN ==="
echo "$JWT" | head -c 200
echo "..."
echo ""

# Decode header (bagian pertama sebelum titik pertama)
HEADER=$(echo "$JWT" | cut -d'.' -f1)
echo "=== JWT HEADER (decoded) ==="
echo "$HEADER" | base64 -d 2>/dev/null | jq . 2>/dev/null || echo "$HEADER" | base64 -d 2>/dev/null
echo ""

# Decode payload (bagian kedua)
PAYLOAD=$(echo "$JWT" | cut -d'.' -f2)
echo "=== JWT PAYLOAD (decoded) ==="
echo "$PAYLOAD" | base64 -d 2>/dev/null | jq . 2>/dev/null || echo "$PAYLOAD" | base64 -d 2>/dev/null
