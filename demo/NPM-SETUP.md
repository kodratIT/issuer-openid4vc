# Nginx Proxy Manager Setup Guide

## 📋 Prerequisites

1. **Nginx Proxy Manager sudah running**
   - Bisa diakses di `http://your-server-ip:81`
   - Default credentials: admin@example.com / changeme

2. **Domain sudah pointing ke server**
   - `issuer-v2.devlab.biz.id` → Server IP
   - `issuer-api-v2.devlab.biz.id` → Server IP

3. **Docker network configuration**
   - NPM dan aplikasi OID4VC harus bisa communicate

## 🌐 Network Configuration

### Option 1: Menggunakan Docker Network yang Sama (Recommended)

Jika NPM dan OID4VC di server yang sama, sambungkan ke network NPM:

```bash
# Cek network NPM (biasanya bernama npm_default atau nginxproxymanager_default)
docker network ls

# Update docker-compose.yaml untuk join network NPM
# Tambahkan di bagian bawah file:
networks:
  default:
    external: true
    name: npm_default  # Sesuaikan dengan nama network NPM anda
```

### Option 2: Menggunakan Host IP

Jika menggunakan setup terpisah atau lebih sederhana:

```bash
# Di NPM, gunakan IP host sebagai Forward Hostname/IP
# Contoh: 172.17.0.1 (Docker host IP di Linux)
#         host.docker.internal (Mac/Windows)
```

## 🔧 Setup di Nginx Proxy Manager

### A. Proxy Host #1 - Admin UI (Port 3003)

#### Details Tab:
```
Domain Names: issuer-v2.devlab.biz.id
Scheme: http
Forward Hostname/IP: demo-app-nextjs   (jika same network)
                  atau 172.17.0.1      (jika menggunakan host IP)
Forward Port: 3003

☑ Cache Assets
☑ Block Common Exploits
☑ Websockets Support
```

#### SSL Tab:
```
SSL Certificate: Request a new SSL Certificate with Let's Encrypt
Email: your-email@example.com

☑ Force SSL
☑ HTTP/2 Support  
☑ HSTS Enabled
☑ HSTS Subdomains
```

#### Advanced Tab (Optional):
```nginx
# Untuk Next.js dengan better caching
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header X-Content-Type-Options "nosniff" always;

# Client max body size untuk upload
client_max_body_size 10M;
```

---

### B. Proxy Host #2 - OID4VCI API (Port 8082)

#### Details Tab:
```
Domain Names: issuer-api-v2.devlab.biz.id
Scheme: http
Forward Hostname/IP: issuer              (jika same network)
                  atau 172.17.0.1        (jika menggunakan host IP)
Forward Port: 8082

☑ Block Common Exploits
☑ Websockets Support
```

#### SSL Tab:
```
SSL Certificate: Request a new SSL Certificate with Let's Encrypt
Email: your-email@example.com

☑ Force SSL
☑ HTTP/2 Support
```

#### Advanced Tab (IMPORTANT):
```nginx
# Increase timeout untuk credential issuance yang mungkin lama
proxy_read_timeout 300;
proxy_connect_timeout 300;
proxy_send_timeout 300;

# Preserve original headers (important untuk OID4VCI)
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;

# Increase buffer size
proxy_buffer_size 128k;
proxy_buffers 4 256k;
proxy_busy_buffers_size 256k;

# Client max body size
client_max_body_size 50M;
```

---

## 🐳 Docker Compose Network Setup

### Update docker-compose.yaml

Tambahkan network configuration di bagian bawah file:

```yaml
# Tambahkan di akhir docker-compose.yaml
networks:
  default:
    name: npm_default
    external: true
```

Atau jika ingin lebih explicit, update semua services:

```yaml
services:
  issuer:
    # ... existing config ...
    networks:
      - npm_network
  
  demo-app-nextjs:
    # ... existing config ...
    networks:
      - npm_network

networks:
  npm_network:
    external: true
    name: npm_default  # Sesuaikan dengan network NPM Anda
```

### Cara Cek Network NPM:

```bash
# List all networks
docker network ls

# Inspect NPM container untuk cek network
docker inspect <npm-container-id> | grep -A 10 "Networks"

# Atau cek langsung
docker network inspect npm_default
```

## ✅ Testing

### 1. Test Admin UI
```bash
curl -I https://issuer-v2.devlab.biz.id
# Should return 200 OK
```

### 2. Test OID4VCI Metadata
```bash
curl https://issuer-api-v2.devlab.biz.id/.well-known/openid-credential-issuer
# Should return JSON metadata
```

### 3. Test dari Wallet
- Scan QR code dari admin UI
- Wallet harus bisa mengakses credential issuer metadata
- Harus bisa complete credential issuance flow

## 🔍 Troubleshooting

### NPM tidak bisa connect ke container

**Problem:** `502 Bad Gateway`

**Solution:**
```bash
# 1. Pastikan container running
docker ps | grep -E "issuer|demo-app-nextjs"

# 2. Cek network
docker network inspect npm_default

# 3. Test connectivity dari NPM container
docker exec <npm-container> ping demo-app-nextjs
docker exec <npm-container> curl http://demo-app-nextjs:3003

# 4. Jika gagal, gunakan host IP
# Di NPM Forward Hostname: 172.17.0.1 atau host.docker.internal
```

### SSL Certificate gagal

**Problem:** Let's Encrypt validation failed

**Solution:**
1. Pastikan domain sudah pointing dengan benar:
   ```bash
   nslookup issuer-v2.devlab.biz.id
   ```
2. Pastikan port 80 dan 443 terbuka
3. Coba generate certificate manual di NPM UI
4. Cek NPM logs: `docker logs <npm-container>`

### Timeout saat credential issuance

**Problem:** `504 Gateway Timeout`

**Solution:**
- Pastikan sudah tambahkan timeout config di NPM Advanced tab
- Increase timeout values jika masih timeout
- Cek logs container issuer untuk error

### CORS Issues

**Problem:** Browser menolak request dari UI ke API

**Solution:**
Tambahkan di NPM Advanced tab untuk API (port 8082):
```nginx
add_header Access-Control-Allow-Origin "https://issuer-v2.devlab.biz.id" always;
add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;

if ($request_method = OPTIONS) {
    return 204;
}
```

## 📊 Port Mapping Reference

| Service              | Internal Port | NPM Required | Purpose                  |
|---------------------|---------------|--------------|--------------------------|
| demo-app-nextjs     | 3003          | ✅ YES       | Admin UI (Public)        |
| issuer (OID4VCI)    | 8082          | ✅ YES       | Wallet API (Public)      |
| issuer (Admin API)  | 3001          | ⚠️ Optional  | Internal Admin           |
| issuer (DIDComm)    | 3000          | ❌ NO        | Internal messaging       |
| demo-app (legacy)   | 3005          | ⚠️ Optional  | Legacy UI                |
| webhook-listener    | 8080          | ❌ NO        | Internal webhooks        |

## 🚀 Quick Start Checklist

- [ ] NPM running dan accessible
- [ ] Domain DNS pointing ke server
- [ ] Docker containers running: `docker-compose up -d`
- [ ] Network configured (same network atau host IP)
- [ ] NPM Proxy Host #1 created (Admin UI - port 3003)
- [ ] NPM Proxy Host #2 created (API - port 8082)
- [ ] SSL certificates generated
- [ ] .env file updated dengan domain URLs
- [ ] Test admin UI access: https://issuer-v2.devlab.biz.id
- [ ] Test API metadata: https://issuer-api-v2.devlab.biz.id/.well-known/openid-credential-issuer
- [ ] Test credential issuance dengan wallet

## 📞 Support

Jika masih ada masalah:
1. Cek NPM logs: `docker logs <npm-container-name>`
2. Cek OID4VC logs: `docker-compose logs -f`
3. Test connectivity: `docker exec <npm-container> curl http://issuer:8082`
