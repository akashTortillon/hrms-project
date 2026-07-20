#!/bin/bash
set -e

echo "=========================================="
echo "IBILL HRMS - Backend Deployment Script"
echo "=========================================="

# Navigate to backend directory
cd /var/www/hrms-project/backend

echo "✓ Current directory: $(pwd)"

# Pull latest code
echo ""
echo "📥 Pulling latest code from repository..."
cd /var/www/hrms-project
git pull origin main

# Return to backend directory
cd backend

# Check if .env exists
echo ""
echo "🔍 Checking environment configuration..."
if [ -f .env ]; then
    echo "✓ .env file exists"
    echo "DB_URL: $(grep DB_URL .env | cut -d'=' -f1)=*****"
    echo "PORT: $(grep PORT .env || echo 'PORT=5000 (default)')"
else
    echo "❌ .env file not found!"
    echo "Please create .env file with required variables"
    exit 1
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Check if PM2 is installed
echo ""
echo "🔍 Checking PM2..."
if ! command -v pm2 &> /dev/null; then
    echo "⚠️  PM2 not found. Installing globally..."
    sudo npm install -g pm2
    echo "✓ PM2 installed"
else
    echo "✓ PM2 is installed"
fi

# Check if process is already running
echo ""
echo "🔍 Checking existing backend process..."
if pm2 describe hrms-backend &> /dev/null; then
    echo "✓ Found existing process 'hrms-backend'"
    echo "🔄 Restarting backend..."
    pm2 restart hrms-backend
else
    echo "⚠️  No existing process found"
    echo "🚀 Starting backend..."
    pm2 start src/server.js --name hrms-backend
fi

# Save PM2 configuration
echo ""
echo "💾 Saving PM2 configuration..."
pm2 save

# Setup PM2 startup script (if not already configured)
echo ""
echo "⚙️  Configuring PM2 startup..."
pm2 startup systemd -u ubuntu --hp /home/ubuntu

echo ""
echo "📊 Backend status:"
pm2 describe hrms-backend

echo ""
echo "🔍 Verifying backend is listening on port 5000..."
sleep 2
if sudo netstat -tulpn | grep :5000 &> /dev/null; then
    echo "✓ Backend is listening on port 5000"
else
    echo "⚠️  Backend might not be listening on port 5000"
    echo "   Check logs with: pm2 logs hrms-backend"
fi

echo ""
echo "=========================================="
echo "✅ Backend deployment complete!"
echo "=========================================="
echo ""
echo "📝 Useful commands:"
echo "  pm2 list                    - List all processes"
echo "  pm2 logs hrms-backend       - View logs"
echo "  pm2 restart hrms-backend    - Restart backend"
echo "  pm2 stop hrms-backend       - Stop backend"
echo "  pm2 monit                   - Monitor processes"
echo ""
