# IBILL HRMS - Deployment Guide

## 🚀 Quick Start (From Your Mac)

### Option 1: Automated Deployment (Recommended)

```bash
cd /Users/jastin/Desktop/Development/vivil/hrms-project
./quick-deploy.sh
```

This will:
1. Push your code to Git
2. Upload deployment scripts to server
3. Run diagnostics
4. Ask for confirmation
5. Deploy backend and frontend

### Option 2: Manual Step-by-Step

```bash
# 1. Push code
cd /Users/jastin/Desktop/Development/vivil/hrms-project
git add .
git commit -m "Update deployment"
git push origin main

# 2. Upload scripts
scp -i /Users/jastin/Downloads/hrms-ibill.pem \
    deploy-frontend.sh deploy-backend.sh diagnose-404.sh \
    ubuntu@13.203.204.11:/home/ubuntu/

# 3. SSH to server
ssh -i /Users/jastin/Downloads/hrms-ibill.pem ubuntu@13.203.204.11

# 4. Run diagnosis
cd /home/ubuntu
chmod +x diagnose-404.sh
./diagnose-404.sh

# 5. Deploy backend
chmod +x deploy-backend.sh
./deploy-backend.sh

# 6. Deploy frontend  
chmod +x deploy-frontend.sh
./deploy-frontend.sh
```

---

## 🔧 What Was Fixed

### 1. ✅ Frontend API Configuration
- **Issue**: Frontend was pointing to `localhost:3005`
- **Fix**: Updated `.env` to `http://13.203.204.11:5000/api`
- **File**: `hr_and_asset_mgt/.env`

### 2. ✅ Phone Field Validation
- **Issue**: Admin user missing required `phone` field
- **Fix**: Created `update-admin.mjs` script to add phone
- **Script**: `backend/update-admin.mjs`

### 3. ✅ Branding Update
- **Issue**: App showed "KAYZAN GROUP" branding
- **Fix**: Updated to "IBILL HRMS" in Login and Sidebar
- **Files**: 
  - `hr_and_asset_mgt/src/pages/Authentication/Login.jsx`
  - `hr_and_asset_mgt/src/components/navigation/Sidebar.jsx`

---

## 📁 Deployment Scripts Created

| Script | Purpose |
|--------|---------|
| `quick-deploy.sh` | One-command deployment from your Mac |
| `deploy-backend.sh` | Deploy backend on server |
| `deploy-frontend.sh` | Deploy frontend on server |
| `diagnose-404.sh` | Diagnose 404 and connection issues |
| `nginx-config-example.conf` | Example nginx configuration |
| `SERVER_DEPLOYMENT_GUIDE.md` | Comprehensive server guide |

---

## 🩺 Troubleshooting

### If you still get 404 error:

```bash
# SSH to server
ssh -i /Users/jastin/Downloads/hrms-ibill.pem ubuntu@13.203.204.11

# Run diagnosis
cd /home/ubuntu
./diagnose-404.sh
```

The diagnosis will show you exactly what's wrong:
- ✅ Backend running or ❌ not running
- ✅ Nginx configured correctly or ❌ misconfigured
- ✅ Frontend deployed or ❌ missing files

### Common Issues & Quick Fixes

**Issue: Backend not running**
```bash
cd /var/www/hrms-project/backend
pm2 start src/server.js --name hrms-backend
pm2 save
```

**Issue: Nginx config missing API proxy**
```bash
sudo nano /etc/nginx/sites-enabled/default
# Add the location /api/ block from nginx-config-example.conf
sudo nginx -t && sudo systemctl reload nginx
```

**Issue: Frontend shows old branding**
```bash
cd /var/www/hrms-project/hr_and_asset_mgt
npm run build
sudo cp -r dist/* /var/www/html/
```

---

## 🌐 Access Information

**Application URL**: http://13.203.204.11

**Admin Credentials**:
- Email: `admin@hrms.com`
- Phone: `+971500000000`
- Password: (corresponding to your hash)

**Architecture**:
```
Browser → Nginx (Port 80) → React App (/var/www/html)
                          → Node.js API (localhost:5000) → MongoDB Atlas
```

---

## 📋 Your Original Commands (Updated)

You were using:
```bash
ssh -i /Users/jastin/Downloads/hrms-ibill.pem ubuntu@13.203.204.11
cd /var/www/hrms-project/hr_and_asset_mgt
npm run build
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo systemctl reload nginx
```

This only deployed frontend. You also need:
```bash
# Backend deployment
cd /var/www/hrms-project/backend
npm install
pm2 restart hrms-backend  # or pm2 start src/server.js --name hrms-backend
```

**Better approach**: Use `./quick-deploy.sh` which does everything!

---

## 📊 Monitoring

```bash
# Check backend status
pm2 list
pm2 logs hrms-backend

# Check nginx logs
sudo tail -f /var/log/nginx/error.log

# Monitor resources
pm2 monit
```

---

## 🆘 Need Help?

1. Run `./diagnose-404.sh` and review output
2. Check `pm2 logs hrms-backend` for backend errors
3. Check `/var/log/nginx/error.log` for nginx errors
4. Verify AWS Security Group allows port 80 (HTTP)

---

## 📝 Next Steps

After successful deployment:

1. ✅ Test login with admin credentials
2. ✅ Verify branding shows "IBILL HRMS"
3. ✅ Check browser console for errors (F12)
4. ✅ Test creating a new employee
5. ✅ Setup SSL certificate (optional but recommended)

### Setting up SSL (HTTPS)

```bash
# Install certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Get certificate (requires domain name)
sudo certbot --nginx -d yourdomain.com

# Auto-renewal is configured automatically
```

---

## 🔄 Future Deployments

For future updates, just run:
```bash
cd /Users/jastin/Desktop/Development/vivil/hrms-project
./quick-deploy.sh
```

That's it! 🎉
