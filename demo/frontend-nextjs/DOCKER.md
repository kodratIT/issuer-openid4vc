# Docker Setup - Frontend Next.js

## 🚀 Cara Build yang Lebih Cepat

### Masalah Build Lambat
Jika build Docker sangat lama (terutama `apk add libc6-compat`), ada beberapa solusi:

### Solusi 1: Gunakan Docker BuildKit (Recommended)

```bash
# Enable BuildKit
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Build dengan compose
docker-compose build
```

Atau gunakan script yang sudah disediakan:
```bash
./build.sh
```

### Solusi 2: Gunakan Dockerfile Optimized

Ganti Dockerfile dengan Dockerfile.optimized yang menggunakan `node:20-slim` (lebih cepat dari alpine):

```bash
# Backup Dockerfile lama
mv Dockerfile Dockerfile.alpine

# Gunakan Dockerfile optimized
mv Dockerfile.optimized Dockerfile

# Build
docker-compose build
```

### Solusi 3: Gunakan BuildKit dengan Cache

```bash
# Build dengan cache yang lebih baik
DOCKER_BUILDKIT=1 docker-compose build --build-arg BUILDKIT_INLINE_CACHE=1
```

## 📋 Perintah Docker Compose

```bash
# Build image
docker-compose build

# Build tanpa cache (jika ada masalah)
docker-compose build --no-cache

# Jalankan container
docker-compose up -d

# Lihat logs
docker-compose logs -f

# Stop container
docker-compose down

# Stop dan hapus volumes
docker-compose down -v
```

## 🔧 Konfigurasi

- **Port**: Aplikasi berjalan di port **3007** (host) → **3000** (container)
- **Access**: http://localhost:3007
- **Environment**: Baca dari file `.env`

## 🐛 Troubleshooting

### Build Sangat Lambat
1. Gunakan BuildKit (solusi di atas)
2. Pastikan koneksi internet stabil
3. Gunakan Docker mirror/registry lokal jika di Indonesia
4. Pertimbangkan menggunakan `node:20-slim` bukan `node:20-alpine`

### apk add timeout
Jika terjadi timeout saat `apk add --no-cache libc6-compat`:
- Gunakan Dockerfile.optimized yang pakai node-slim
- Atau tambahkan Alpine mirror Indonesia di Dockerfile:
  ```dockerfile
  RUN sed -i 's/dl-cdn.alpinelinux.org/mirror.id.repo.almalinux.org/g' /etc/apk/repositories
  RUN apk add --no-cache libc6-compat
  ```

### Container tidak start
```bash
# Check logs
docker-compose logs

# Check container status
docker ps -a
```

## 📊 Perbandingan Build Time

| Method | Estimated Time |
|--------|---------------|
| Alpine tanpa BuildKit | 4-5 menit |
| Alpine dengan BuildKit | 2-3 menit |
| Slim dengan BuildKit | 1-2 menit |
| Dengan cache | 30-60 detik |

## 🎯 Next Steps

Untuk production deployment:
1. Gunakan Docker registry (Docker Hub, GHCR, dll)
2. Setup CI/CD untuk auto-build
3. Gunakan multi-arch builds jika deploy ke ARM
4. Implement health checks
5. Setup monitoring dan logging
