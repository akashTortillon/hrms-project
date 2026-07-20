#!/bin/bash
set -e

echo "=========================================="
echo "IBILL HRMS - Frontend Deployment Script"
echo "=========================================="

# Navigate to frontend directory
cd /var/www/hrms-project/hr_and_asset_mgt

echo "✓ Current directory: $(pwd)"

# Pull latest code
echo ""
echo "📥 Pulling latest code from repository..."
cd /var/www/hrms-project
git pull origin main

# Return to frontend directory
cd hr_and_asset_mgt

# Check if .env exists and has correct API URL
echo ""
echo "🔍 Checking environment configuration..."
if [ -f .env ]; then
    echo "✓ .env file exists"
    cat .env
else
    echo "⚠️  .env file not found! Creating one..."
    echo "VITE_API_BASE=http://13.203.204.11:5000/api" > .env
    echo "✓ Created .env with API URL"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Build frontend
echo ""
echo "🔨 Building frontend..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "❌ Build failed! dist/ folder not found"
    exit 1
fi

echo "✓ Build successful"

# Backup existing files
echo ""
echo "💾 Backing up existing files..."
if [ -d "/var/www/html.backup" ]; then
    sudo rm -rf /var/www/html.backup
fi
sudo cp -r /var/www/html /var/www/html.backup
echo "✓ Backup created at /var/www/html.backup"

# Deploy built files
echo ""
echo "🚀 Deploying to /var/www/html..."
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
echo "✓ Files copied to /var/www/html"

# Set proper permissions
echo ""
echo "🔒 Setting permissions..."
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html
echo "✓ Permissions set"

# Test nginx configuration
echo ""
echo "🧪 Testing nginx configuration..."
sudo nginx -t

# Reload nginx
echo ""
echo "🔄 Reloading nginx..."
sudo systemctl reload nginx
echo "✓ Nginx reloaded"

echo ""
echo "=========================================="
echo "✅ Frontend deployment complete!"
echo "=========================================="
echo ""
echo "📝 Next steps:"
echo "  1. Open http://13.203.204.11 in your browser"
echo "  2. Check browser console (F12) for any errors"
echo "  3. Verify branding shows 'IBILL HRMS'"
echo ""
