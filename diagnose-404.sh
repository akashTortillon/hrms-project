#!/bin/bash

echo "=========================================="
echo "IBILL HRMS - 404 Error Diagnosis"
echo "=========================================="

echo ""
echo "1️⃣  CHECKING BACKEND STATUS"
echo "=========================================="

# Check if backend is running
echo ""
echo "📡 Checking if backend is listening on port 5000..."
if sudo netstat -tulpn | grep :5000; then
    echo "✅ Backend is running on port 5000"
else
    echo "❌ Backend is NOT running on port 5000"
    echo ""
    echo "Checking for Node processes..."
    ps aux | grep node | grep -v grep
fi

# Check PM2 processes
echo ""
echo "📊 PM2 process list:"
if command -v pm2 &> /dev/null; then
    pm2 list
else
    echo "⚠️  PM2 not installed"
fi

echo ""
echo "2️⃣  CHECKING NGINX CONFIGURATION"
echo "=========================================="

# Check nginx is running
echo ""
echo "🔍 Nginx status:"
sudo systemctl status nginx --no-pager | head -10

# Find nginx config files
echo ""
echo "📁 Nginx configuration files:"
if [ -f /etc/nginx/sites-enabled/default ]; then
    echo "Found: /etc/nginx/sites-enabled/default"
fi
if [ -f /etc/nginx/sites-available/hrms ]; then
    echo "Found: /etc/nginx/sites-available/hrms"
fi

# Show nginx config
echo ""
echo "📄 Current nginx configuration:"
echo "----------------------------------------"
if [ -f /etc/nginx/sites-enabled/default ]; then
    sudo cat /etc/nginx/sites-enabled/default
elif [ -f /etc/nginx/sites-enabled/hrms ]; then
    sudo cat /etc/nginx/sites-enabled/hrms
else
    echo "No configuration found in sites-enabled"
fi
echo "----------------------------------------"

echo ""
echo "3️⃣  CHECKING NGINX LOGS"
echo "=========================================="

echo ""
echo "🔴 Recent nginx error logs:"
echo "----------------------------------------"
sudo tail -20 /var/log/nginx/error.log
echo "----------------------------------------"

echo ""
echo "🔵 Recent nginx access logs:"
echo "----------------------------------------"
sudo tail -20 /var/log/nginx/access.log
echo "----------------------------------------"

echo ""
echo "4️⃣  CHECKING BACKEND LOGS"
echo "=========================================="

if command -v pm2 &> /dev/null; then
    echo ""
    echo "📋 Recent backend logs (PM2):"
    echo "----------------------------------------"
    pm2 logs hrms-backend --lines 50 --nostream
    echo "----------------------------------------"
else
    echo "⚠️  PM2 not available - cannot show backend logs"
fi

echo ""
echo "5️⃣  TESTING CONNECTIONS"
echo "=========================================="

# Test backend directly
echo ""
echo "🧪 Testing backend directly (localhost:5000)..."
if curl -s http://localhost:5000/api/auth/login > /dev/null 2>&1; then
    echo "✅ Backend responds on localhost:5000"
else
    echo "❌ Backend does not respond on localhost:5000"
fi

# Test external connection
echo ""
echo "🧪 Testing external connection (13.203.204.11:5000)..."
if curl -s http://13.203.204.11:5000/api/auth/login > /dev/null 2>&1; then
    echo "✅ Backend accessible externally"
else
    echo "❌ Backend not accessible externally"
    echo "   Check AWS Security Group allows port 5000"
fi

echo ""
echo "6️⃣  CHECKING FRONTEND FILES"
echo "=========================================="

echo ""
echo "📁 Frontend files in /var/www/html:"
ls -lah /var/www/html | head -20

echo ""
echo "🔍 Checking if index.html exists:"
if [ -f /var/www/html/index.html ]; then
    echo "✅ index.html found"
else
    echo "❌ index.html NOT found - frontend not deployed!"
fi

echo ""
echo "=========================================="
echo "📊 DIAGNOSIS COMPLETE"
echo "=========================================="

echo ""
echo "🔧 COMMON FIXES:"
echo ""
echo "If backend is not running:"
echo "  cd /var/www/hrms-project/backend"
echo "  pm2 start src/server.js --name hrms-backend"
echo ""
echo "If nginx config is wrong:"
echo "  sudo nano /etc/nginx/sites-enabled/default"
echo "  # Add API proxy configuration (see below)"
echo "  sudo nginx -t && sudo systemctl reload nginx"
echo ""
echo "If frontend not deployed:"
echo "  cd /var/www/hrms-project/hr_and_asset_mgt"
echo "  npm run build"
echo "  sudo cp -r dist/* /var/www/html/"
echo ""
