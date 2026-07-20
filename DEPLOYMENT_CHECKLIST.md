# HRMS Deployment Checklist & Fixes

## Issues Fixed

### 1. ✅ 404 Error on `/auth/login`
**Root Cause**: Frontend .env pointing to wrong API URL
- **Was**: `http://localhost:3005/api`
- **Now**: `http://13.203.204.11:5000/api`

### 2. ✅ Phone Field Validation Error
**Root Cause**: Existing admin user missing required `phone` field
- **Solution**: Updated `update-admin.mjs` to add phone if missing

### 3. ✅ Branding Update (KAYZAN → IBILL HRMS)
**Files Updated**:
- Login page (`Login.jsx`)
- Sidebar (`Sidebar.jsx`)

---

## Deployment Steps for EC2 Server

### Step 1: Update Admin User (Fix Phone Issue)

SSH into your EC2 server and run:

```bash
cd /home/ec2-user/hrms-project/backend

# Create the update script
cat > update-admin.mjs << 'EOF'
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
  console.log('Connecting to MongoDB...');

  const dbUrl = process.env.DB_URL;
  
  const correctedUrl = dbUrl.replace(
    /mongodb\+srv:\/\/([^/]+)\/([^?]+)/,
    'mongodb+srv://$1/user_management'
  );

  console.log('Using DB URL (masked):', correctedUrl.replace(/:([^@]+)@/, ':****@'));

  await mongoose.connect(correctedUrl);
  console.log('Connected to DB:', mongoose.connection.db.databaseName);

  const User = (await import('./src/models/userModel.js')).default;

  const email = 'admin@hrms.com';
  const hashedPassword = '$2b$10$yZfjAdpBwiGlGzNiT9E6xekZFjmRAZd.wu.lQk3Z5xTaDAyvKCuEm';

  const existing = await User.findOne({ email });

  if (existing) {
    existing.password = hashedPassword;
    existing.role = 'Admin';
    
    // Ensure phone field exists (required by User model)
    if (!existing.phone) {
      existing.phone = '+971500000000';
      console.log('   Added missing phone: ' + existing.phone);
    }
    
    await existing.save();
    console.log('✅ Admin user updated successfully');
    console.log('   Email: ' + email);
    console.log('   Phone: ' + existing.phone);
    console.log('   Role: ' + existing.role);
  } else {
    let phone = '+971500000000';
    let suffix = 0;
    while (await User.findOne({ phone })) {
      suffix++;
      phone = '+97150000' + String(suffix).padStart(4, '0');
    }

    const newUser = await User.create({
      name: 'Admin',
      email,
      phone,
      password: hashedPassword,
      role: 'Admin',
    });
    console.log('✅ Admin user created successfully');
    console.log('   Email: ' + email);
    console.log('   Phone: ' + phone);
    console.log('   Role: ' + newUser.role);
  }

  const verifyUser = await User.findOne({ email }).select('name email phone role');
  console.log('\n🔍 Verification:');
  console.log(JSON.stringify(verifyUser, null, 2));

  await mongoose.connection.close();
  console.log('\n✅ Database connection closed');
  process.exit(0);
};

run().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
EOF

# Run the update script
node update-admin.mjs
```

### Step 2: Pull Latest Code

```bash
cd /home/ec2-user/hrms-project
git pull origin main
```

### Step 3: Update Frontend Environment

Update the frontend .env file:

```bash
cd /home/ec2-user/hrms-project/hr_and_asset_mgt

# Backup existing .env
cp .env .env.backup

# Update API URL
cat > .env << 'EOF'
VITE_API_BASE=http://13.203.204.11:5000/api
EOF
```

### Step 4: Rebuild and Deploy Frontend

```bash
cd /home/ec2-user/hrms-project/hr_and_asset_mgt

# Install dependencies (if needed)
npm install

# Build the frontend
npm run build

# The dist/ folder is now ready to be served by nginx
```

### Step 5: Restart Backend (if needed)

```bash
# If using PM2
pm2 restart hrms-backend

# OR if using systemd
sudo systemctl restart hrms-backend

# Check backend logs
pm2 logs hrms-backend
# OR
sudo journalctl -u hrms-backend -f
```

### Step 6: Verify Nginx Configuration

Check your nginx config serves the frontend correctly:

```bash
sudo nano /etc/nginx/sites-available/hrms

# Should have something like:
server {
    listen 80;
    server_name 13.203.204.11;

    # Serve frontend
    location / {
        root /home/ec2-user/hrms-project/hr_and_asset_mgt/dist;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Test and reload nginx
sudo nginx -t
sudo systemctl reload nginx
```

---

## Testing

### 1. Test Admin Login
- **URL**: `http://13.203.204.11/login`
- **Email**: `admin@hrms.com`
- **Password**: (the password corresponding to your hash)

### 2. Check Branding
- Login page should show "IBILL HRMS" instead of "KAYZAN GROUP"
- Sidebar after login should show "IBILL HRMS"

### 3. Verify API Connection
- Open browser console (F12)
- Login should make request to: `http://13.203.204.11:5000/api/auth/login`
- Should get 200 OK response (not 404)

---

## Common Issues & Solutions

### Issue: Still getting 404
**Solution**: Clear browser cache and hard refresh (Ctrl+Shift+R / Cmd+Shift+R)

### Issue: CORS errors
**Solution**: Verify backend CORS settings in `backend/src/app.js` allow your domain

### Issue: Old branding still visible
**Solution**: 
1. Make sure you ran `npm run build` after pulling latest code
2. Clear browser cache
3. Check that nginx is serving from the correct `dist/` folder

### Issue: Can't connect to MongoDB
**Solution**: Check `.env` file in backend has correct `DB_URL`

```bash
cd /home/ec2-user/hrms-project/backend
cat .env | grep DB_URL
```

---

## Admin Login Credentials

- **Email**: `admin@hrms.com`
- **Phone**: `+971500000000`
- **Password**: (corresponding to hash `$2b$10$yZfjAdpBwiGlGzNiT9E6xekZFjmRAZd.wu.lQk3Z5xTaDAyvKCuEm`)

---

## Quick Reference Commands

```bash
# Check backend is running
pm2 status

# View backend logs
pm2 logs hrms-backend --lines 50

# Restart backend
pm2 restart hrms-backend

# Check nginx status
sudo systemctl status nginx

# Test nginx config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# Check what's listening on port 5000
sudo netstat -tulpn | grep 5000
```
