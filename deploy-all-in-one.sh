#!/bin/bash
# All-in-One Deployment Script
# Copy this entire script and paste it in your terminal

set -e

echo "=========================================="
echo "IBILL HRMS - All-in-One Deployment"
echo "=========================================="
echo ""
echo "This will:"
echo "  1. Connect to your server"
echo "  2. Pull latest code"
echo "  3. Deploy backend"
echo "  4. Update admin user"
echo "  5. Deploy frontend"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."

# SSH to server and run all commands
ssh -i /Users/jastin/Downloads/hrms-ibill.pem ubuntu@13.203.204.11 << 'ENDSSH'
set -e

echo ""
echo "=========================================="
echo "Step 1: Pulling Latest Code"
echo "=========================================="
cd /var/www/hrms-project
git checkout Development-ibill
git pull origin Development-ibill
echo "✅ Code updated"

echo ""
echo "=========================================="
echo "Step 2: Deploying Backend"
echo "=========================================="
cd /var/www/hrms-project/backend

# Check if .env exists, create if not
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << 'EOF'
DB_URL=mongodb+srv://hellovivilrajs_db_user:qIpgJcaeLtFjrM8g@hrms.hiriglb.mongodb.net/user_management?retryWrites=true&w=majority
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
NODE_ENV=production
EOF
    echo "✅ .env created"
fi

# Install dependencies
npm install

# Start/Restart with PM2
if pm2 describe hrms-backend > /dev/null 2>&1; then
    echo "Restarting backend..."
    pm2 restart hrms-backend
else
    echo "Starting backend..."
    pm2 start src/server.js --name hrms-backend
    pm2 save
    pm2 startup systemd -u ubuntu --hp /home/ubuntu || true
fi

echo "✅ Backend deployed"

# Wait for backend to start
sleep 2

# Check backend status
echo ""
echo "Backend status:"
pm2 list | grep hrms-backend || echo "Warning: Backend might not be running"

echo ""
echo "=========================================="
echo "Step 3: Updating Admin User"
echo "=========================================="
cd /var/www/hrms-project/backend

cat > update-admin.mjs << 'EOFADMIN'
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
  console.log('Connecting to MongoDB...');
  const dbUrl = process.env.DB_URL;
  await mongoose.connect(dbUrl);
  console.log('Connected to:', mongoose.connection.db.databaseName);
  
  const User = (await import('./src/models/userModel.js')).default;
  const email = 'admin@hrms.com';
  const hashedPassword = '$2b$10$yZfjAdpBwiGlGzNiT9E6xekZFjmRAZd.wu.lQk3Z5xTaDAyvKCuEm';
  
  const existing = await User.findOne({ email });
  
  if (existing) {
    existing.password = hashedPassword;
    existing.role = 'Admin';
    if (!existing.phone) {
      existing.phone = '+971500000000';
      console.log('✓ Added phone:', existing.phone);
    }
    await existing.save();
    console.log('✅ Admin updated successfully');
    console.log('   Email:', email);
    console.log('   Phone:', existing.phone);
    console.log('   Role:', existing.role);
  } else {
    await User.create({
      name: 'Admin',
      email,
      phone: '+971500000000',
      password: hashedPassword,
      role: 'Admin',
    });
    console.log('✅ Admin created successfully');
  }
  
  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
EOFADMIN

node update-admin.mjs

echo ""
echo "=========================================="
echo "Step 4: Deploying Frontend"
echo "=========================================="
cd /var/www/hrms-project/hr_and_asset_mgt

# Create/Update .env
echo "VITE_API_BASE=http://13.203.204.11:5000/api" > .env
echo "✓ Frontend .env configured"

# Install dependencies
npm install

# Build
echo "Building frontend..."
npm run build

if [ ! -d "dist" ]; then
    echo "❌ Build failed! dist/ folder not found"
    exit 1
fi

echo "✓ Build successful"

# Backup and deploy
if [ -d "/var/www/html" ] && [ "$(ls -A /var/www/html)" ]; then
    sudo cp -r /var/www/html "/var/www/html.backup.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
fi

sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html

echo "✅ Frontend deployed"

echo ""
echo "=========================================="
echo "Step 5: Configuring Nginx"
echo "=========================================="

# Check if nginx has API proxy
if ! sudo grep -q "location /api/" /etc/nginx/sites-enabled/default; then
    echo "⚠️  Nginx might need API proxy configuration"
    echo "Checking nginx config..."
fi

# Test nginx
if sudo nginx -t > /dev/null 2>&1; then
    echo "✓ Nginx config is valid"
    sudo systemctl reload nginx
    echo "✅ Nginx reloaded"
else
    echo "⚠️  Nginx config has issues - manual check needed"
    sudo nginx -t
fi

echo ""
echo "=========================================="
echo "🎉 Deployment Complete!"
echo "=========================================="
echo ""
echo "Backend Status:"
pm2 list
echo ""
echo "Verification:"
echo "  • Backend running: $(sudo netstat -tulpn | grep :5000 > /dev/null && echo '✅ YES' || echo '❌ NO')"
echo "  • Frontend files: $([ -f /var/www/html/index.html ] && echo '✅ YES' || echo '❌ NO')"
echo "  • Nginx status: $(sudo systemctl is-active nginx)"
echo ""
echo "🌐 Access your application:"
echo "   http://13.203.204.11"
echo ""
echo "👤 Admin Login:"
echo "   Email: admin@hrms.com"
echo "   Phone: +971500000000"
echo ""
echo "📋 Check logs:"
echo "   Backend: pm2 logs hrms-backend"
echo "   Nginx: sudo tail -f /var/log/nginx/error.log"
echo ""

ENDSSH

echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "Next Steps:"
echo "  1. Open http://13.203.204.11 in your browser"
echo "  2. Should see 'IBILL HRMS' branding"
echo "  3. Login with admin@hrms.com"
echo ""
