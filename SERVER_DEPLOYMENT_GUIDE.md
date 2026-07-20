# IBILL HRMS - Server Deployment Guide

## Quick Fix for 404 Error

### Step 1: Upload Scripts to Server

From your local machine:

```bash
# Upload deployment scripts to server
scp -i /Users/jastin/Downloads/hrms-ibill.pem \
    deploy-frontend.sh deploy-backend.sh diagnose-404.sh nginx-config-example.conf \
    ubuntu@13.203.204.11:/home/ubuntu/
```

### Step 2: SSH into Server

```bash
ssh -i /Users/jastin/Downloads/hrms-ibill.pem ubuntu@13.203.204.11
```

### Step 3: Run Diagnosis

```bash
cd /home/ubuntu
chmod +x diagnose-404.sh
./diagnose-404.sh
```

**Read the diagnosis output carefully** - it will tell you exactly what's wrong.

---

## Common Issues & Fixes

### Issue 1: Backend Not Running (Most Common)

**Symptoms**: 
- Diagnosis shows "Backend is NOT running on port 5000"
- `pm2 list` shows no processes or hrms-backend is stopped

**Fix**:
```bash
cd /var/www/hrms-project/backend

# Check if .env exists
ls -la .env

# If .env doesn't exist, create it
nano .env
# Add these lines:
# DB_URL=mongodb+srv://hellovivilrajs_db_user:qIpgJcaeLtFjrM8g@hrms.hiriglb.mongodb.net/user_management?retryWrites=true&w=majority
# PORT=5000
# JWT_SECRET=your-jwt-secret-here
# JWT_REFRESH_SECRET=your-refresh-secret-here
# NODE_ENV=production

# Install dependencies
npm install

# Start backend with PM2
pm2 start src/server.js --name hrms-backend

# Save PM2 config
pm2 save

# Setup PM2 to restart on reboot
pm2 startup systemd -u ubuntu --hp /home/ubuntu

# Verify it's running
pm2 list
pm2 logs hrms-backend --lines 20
```

### Issue 2: Nginx Not Configured Correctly

**Symptoms**:
- Backend runs but still getting 404
- Nginx config doesn't have `/api/` proxy

**Fix**:
```bash
# Backup current config
sudo cp /etc/nginx/sites-enabled/default /etc/nginx/sites-enabled/default.backup

# Edit nginx config
sudo nano /etc/nginx/sites-enabled/default

# Use the configuration from nginx-config-example.conf
# Key part is the /api/ location block:
#
# location /api/ {
#     proxy_pass http://localhost:5000;
#     proxy_http_version 1.1;
#     proxy_set_header Host $host;
#     proxy_set_header X-Real-IP $remote_addr;
#     proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
# }

# Test nginx config
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx

# Check nginx logs
sudo tail -f /var/log/nginx/error.log
```

### Issue 3: Frontend .env Points to Wrong URL

**Symptoms**:
- Browser console shows requests to wrong URL
- Network tab shows localhost or wrong IP

**Fix**:
```bash
cd /var/www/hrms-project/hr_and_asset_mgt

# Check current .env
cat .env

# Should be:
# VITE_API_BASE=http://13.203.204.11:5000/api

# If wrong, update it
echo "VITE_API_BASE=http://13.203.204.11:5000/api" > .env

# Rebuild frontend
npm run build

# Deploy
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo systemctl reload nginx
```

### Issue 4: AWS Security Group Blocking Port 5000

**Symptoms**:
- Backend runs on server
- `curl localhost:5000` works on server
- Cannot access from outside

**Fix**:
- Go to AWS Console → EC2 → Security Groups
- Find security group for your instance
- Add inbound rule: Custom TCP, Port 5000, Source: 0.0.0.0/0
- **Note**: This is usually not needed if nginx proxies correctly

---

## Automated Deployment

### Deploy Everything (Fresh Deployment)

```bash
ssh -i /Users/jastin/Downloads/hrms-ibill.pem ubuntu@13.203.204.11

# Make scripts executable
chmod +x deploy-backend.sh deploy-frontend.sh

# Deploy backend
./deploy-backend.sh

# Deploy frontend
./deploy-frontend.sh
```

### Deploy Only Frontend (Quick Updates)

```bash
ssh -i /Users/jastin/Downloads/hrms-ibill.pem ubuntu@13.203.204.11

cd /var/www/hrms-project/hr_and_asset_mgt

# Pull latest
cd /var/www/hrms-project && git pull && cd hr_and_asset_mgt

# Build and deploy
npm run build
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo systemctl reload nginx
```

### Deploy Only Backend (After Code Changes)

```bash
ssh -i /Users/jastin/Downloads/hrms-ibill.pem ubuntu@13.203.204.11

cd /var/www/hrms-project

# Pull latest
git pull

# Restart backend
cd backend
npm install  # if package.json changed
pm2 restart hrms-backend

# Check logs
pm2 logs hrms-backend
```

---

## Update Admin User (Add Phone Field)

```bash
ssh -i /Users/jastin/Downloads/hrms-ibill.pem ubuntu@13.203.204.11

cd /var/www/hrms-project/backend

# Create update script
cat > update-admin.mjs << 'EOF'
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
  const dbUrl = process.env.DB_URL;
  await mongoose.connect(dbUrl);
  
  const User = (await import('./src/models/userModel.js')).default;
  
  const email = 'admin@hrms.com';
  const hashedPassword = '$2b$10$yZfjAdpBwiGlGzNiT9E6xekZFjmRAZd.wu.lQk3Z5xTaDAyvKCuEm';
  
  const existing = await User.findOne({ email });
  
  if (existing) {
    existing.password = hashedPassword;
    existing.role = 'Admin';
    
    if (!existing.phone) {
      existing.phone = '+971500000000';
      console.log('Added phone: ' + existing.phone);
    }
    
    await existing.save();
    console.log('✅ Admin updated');
    console.log('Email:', email);
    console.log('Phone:', existing.phone);
  } else {
    await User.create({
      name: 'Admin',
      email,
      phone: '+971500000000',
      password: hashedPassword,
      role: 'Admin',
    });
    console.log('✅ Admin created');
  }
  
  process.exit(0);
};

run().catch(console.error);
EOF

# Run it
node update-admin.mjs
```

---

## Testing & Verification

### 1. Test Backend Directly

```bash
# From server
curl http://localhost:5000/api/auth/login

# Should return method not allowed (POST required), not 404
```

### 2. Test Through Nginx

```bash
# From server
curl http://13.203.204.11/api/auth/login

# Should also return method not allowed, not 404
```

### 3. Test Login from Browser

1. Open `http://13.203.204.11`
2. Should see login page with "IBILL HRMS" branding
3. Open browser console (F12) → Network tab
4. Try to login with `admin@hrms.com`
5. Should see POST to `http://13.203.204.11:5000/api/auth/login`
6. Should get 401 (invalid credentials) or 200 (success), NOT 404

---

## Monitoring & Logs

```bash
# Backend logs
pm2 logs hrms-backend

# Backend status
pm2 status

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# System resource usage
pm2 monit
```

---

## Useful PM2 Commands

```bash
pm2 list                    # List all processes
pm2 describe hrms-backend   # Detailed info about process
pm2 logs hrms-backend       # Stream logs
pm2 logs hrms-backend --lines 100  # Last 100 lines
pm2 restart hrms-backend    # Restart
pm2 stop hrms-backend       # Stop
pm2 delete hrms-backend     # Delete process
pm2 monit                   # Monitor CPU/Memory
pm2 save                    # Save current process list
```

---

## Emergency Rollback

If something goes wrong:

```bash
# Rollback frontend
sudo rm -rf /var/www/html/*
sudo cp -r /var/www/html.backup/* /var/www/html/
sudo systemctl reload nginx

# Rollback backend
cd /var/www/hrms-project
git reset --hard HEAD~1
cd backend
pm2 restart hrms-backend
```

---

## Architecture Overview

```
Browser (Client)
    ↓
http://13.203.204.11
    ↓
Nginx (Port 80)
    ├── / → Serves React app from /var/www/html
    └── /api/ → Proxies to localhost:5000
             ↓
        Node.js Backend (Port 5000)
             ↓
        MongoDB Atlas
```

---

## Contact & Support

If issues persist after following this guide:

1. Run `./diagnose-404.sh` and share the output
2. Check `pm2 logs hrms-backend` for backend errors
3. Check `/var/log/nginx/error.log` for nginx errors
4. Verify AWS Security Group allows incoming traffic on port 80
