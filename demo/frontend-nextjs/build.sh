#!/bin/bash

# Script untuk build Docker dengan BuildKit yang lebih cepat
# BuildKit menyediakan parallel build, better caching, dan build optimizations

set -e

echo "🚀 Building frontend dengan Docker BuildKit..."

# Enable BuildKit untuk build yang lebih cepat
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Opsi 1: Build dengan docker compose (recommended)
echo "📦 Building dengan Docker Compose..."
docker-compose build --parallel

# Atau uncomment ini untuk build dengan docker buildx (lebih cepat lagi)
# echo "📦 Building dengan Docker Buildx..."
# docker buildx build \
#   --cache-from=frontend-nextjs:latest \
#   --cache-to=type=inline \
#   --tag frontend-nextjs:latest \
#   --load \
#   .

echo "✅ Build selesai!"
echo "🎯 Jalankan: docker-compose up -d"
