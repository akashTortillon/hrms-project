# 🚀 Quick Start - Fix SSH Key and Deploy

## Step 1: Fix SSH Key Permissions (Run on Your Mac)

Open Terminal and run these commands **one by one**:

```bash
# Go to project directory
cd /Users/jastin/Desktop/Development/vivil/hrms-project

# Copy SSH key to project folder
cp /Users/jastin/Downloads/hrms-ibill.pem ./hrms-ibill.pem

# Fix permissions
chmod 600 ./hrms-ibill.pem

# Verify (should show: -rw-------)
ls -l ./hrms-ibill.pem
```

✅ You should see: `-rw-------  1 jastin  staff  1674 ... hrms-ibill.pem`

---

## Step 2: Push Code to Git

```bash
git add .
git commit -m "Update deployment configuration"
git push origin Development-ibill
```

---

## Step 3: Connect to Server

```bash
ssh -i ./hrms-ibill.pem ubuntu@13.203.204.11
```

✅ You should now be connected to the server

---

## Step 4: Pull Latest Code (On Server)

```bash
cd /var/www/hrms-project
git checkout Development-ibill
git pull origin Development-ibill
```

---

## Step 5: Deploy Backend (On Server)

```bash
cd /var/www/hrms-project/backend

# Check if PM2 is running the backend
pm2 list

# If hrms-backend exists, restart it
pm2 restart hrms-backend

# If it doesn't exist, start it
# pm2 start src/server.js --name hrms-backend
# pm2 save

# Check logs
pm2 logs hrms-backend --lines 20
```

✅ You should see backend running without errors

---

## Step 6: Update Admin User (On Server)

```bash
cd /var/www/hrms-project/backend

# Copy this entire block and paste it
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
    if (!existing.phone) existing.phone = '+971500000000';
    await existing.save();
    console.log('✅ Admin updated:', email, existing.phone);
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

✅ You should see "✅ Admin updated" or "✅ Admin created"

---

## Step 7: Deploy Frontend (On Server)

```bash
cd /var/www/hrms-project/hr_and_asset_mgt

# Make sure .env has correct API URL
echo "VITE_API_BASE=http://13.203.204.11:5000/api" > .env

# Build
npm run build

# Deploy
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo systemctl reload nginx
```

✅ You should see "Build completed" without errors

---

## Step 8: Test It!

1. Open browser: http://13.203.204.11
2. You should see login page with **"IBILL HRMS"** branding (not KAYZAN)
3. Login with:
   - Email: `admin@hrms.com`
   - Password: (your password)

### Check for 404 errors:

- Open browser console (Press F12)
- Go to Network tab
- Try to login
- Look for request to `/api/auth/login`
- Should get **401** (wrong password) or **200** (success)
- Should **NOT** get **404**

---

## ✅ Success Checklist

- [ ] SSH key works (no permission errors)
- [ ] Code pulled on server
- [ ] Backend running (pm2 list shows hrms-backend)
- [ ] Admin user updated (has phone field)
- [ ] Frontend built and deployed
- [ ] Login page shows "IBILL HRMS"
- [ ] No 404 errors in browser console
- [ ] Can login with admin credentials

---

## 🆘 If Something Goes Wrong

### Backend not running?
```bash
cd /var/www/hrms-project/backend
pm2 logs hrms-backend --lines 50
```

### Still getting 404?
```bash
# Check if backend is listening
sudo netstat -tulpn | grep :5000

# Check nginx config
sudo nginx -t
sudo cat /etc/nginx/sites-enabled/default | grep -A 10 "location /api"
```

### Frontend not updating?
```bash
# Clear browser cache (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
# Or check:
ls -la /var/www/html/
```

---

## 📞 Need More Help?

See detailed guides:
- **MANUAL_DEPLOY.md** - Complete step-by-step manual deployment
- **SERVER_DEPLOYMENT_GUIDE.md** - Troubleshooting and advanced topics
- **DEPLOYMENT_README.md** - Overview and quick reference
