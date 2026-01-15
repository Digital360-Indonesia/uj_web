#!/bin/bash

# Deploy script parametrik untuk multi-user setup
# Dijalankan oleh syanampro, tapi PM2 jalan sebagai user yang didefine di .deployrc

set -e  # Exit on error

# Load configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/.deployrc" ]; then
    source "$SCRIPT_DIR/.deployrc"
else
    echo "❌ Error: .deployrc not found!"
    exit 1
fi

echo "🚀 Starting deployment..."
echo "👤 Deploy user: $DEPLOY_USER"
echo "📦 PM2 app: $PM2_APP_NAME"
echo "🌿 Branch: $DEPLOY_BRANCH"

# Pindah ke directory project
cd "$SCRIPT_DIR" || exit 1

echo "📥 Pulling latest code from GitHub (as $DEPLOY_USER)..."
sudo -u "$DEPLOY_USER" git pull origin "$DEPLOY_BRANCH"

echo "📦 Installing dependencies (as $DEPLOY_USER)..."
sudo -u "$DEPLOY_USER" npm install

echo "🔨 Building Astro site (as $DEPLOY_USER)..."
sudo -u "$DEPLOY_USER" npm run build

echo "📁 Build complete - files ready in dist/ directory"
echo "📍 Repository location: $(pwd)"
