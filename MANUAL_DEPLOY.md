# Manual Deployment Guide (SSH Key Issues Workaround)

## If You're Getting SSH Permission Errors

### Step 1: Copy and Fix SSH Key Permissions

Open your terminal and run:

```bash
# Navigate to project
cd /Users/jastin/Desktop/Development/vivil/hrms-project

# Copy the key to project directory (where you have full access)
cp /Users/jastin/Downloads/hrms-ibill.pem ./hrms-ibill.pem

# Fix permissions
chmod 600 ./hrms-ibill.pem

# Verify permissions (should show -rw-------)
ls -l ./hrms-ibill.pem
```

### Step 2: Add to .gitignore (Security!)

```bash
# Make sure the key is not committed to git
echo "hrms-ibill.pem" >> .gitignore
git add .gitignore
git commit -m "Add SSH key to gitignore"
```

### Step 3: Push Your Code

```bash
git push origin Development-ibill
```

### Step 4: Connect to Server

```bash
ssh -i ./hrms-ibill.pem ubuntu@13.203.204.11
```

### Step 5: On Server - Deploy Backend

Once connected to the server, run:

```bash
# Navigate to project
cd /var/www/hrms-project

# Pull latest code
git checkout Development-ibill
git pull origin Development-ibill

# Deploy backend
cd backend

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << 'EOF'
DB_URL=mongodb+srv://hellovivilrajs_db_user:qIpgJcaeLtFjrM8g@hrms.hiriglb.mongodb.net/user_management?retryWrites=true&w=majority
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this
NODE_ENV=production
EOF
fi

# Install dependencies
npm install

# Start/Restart backend with PM2
if pm2 describe hrms-backend > /dev/null 2>&1; then
    echo "Restarting existing backend..."
    pm2 restart hrms-backend
else
    echo "Starting new backend..."
    pm2 start src/server.js --name hrms-backend
    pm2 save
    pm2 startup systemd -u ubuntu --hp /home/ubuntu
fi

# Check backend is running
pm2 list
pm2 logs hrms-backend --lines 20

# Verify port 5000 is listening
sudo netstat -tulpn | grep :5000
```

### Step 6: On Server - Update Admin User

Still on the server:

```bash
cd /var/www/hrms-project/backend

# Create update script
cat > update-admin.mjs << 'EOF'
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
  console.log('Connecting to MongoDB...');
  const dbUrl = process.env.DB_URL;
  await mongoose.connect(dbUrl);
  console.log('Connected to DB:', mongoose.connection.db.databaseName);
  
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
EOF

# Run the update
node update-admin.mjs
```

### Step 7: On Server - Deploy Frontend

```bash
cd /var/www/hrms-project/hr_and_asset_mgt

# Check/Create .env
cat > .env << 'EOF'
VITE_API_BASE=http://13.203.204.11:5000/api
EOF

# Install dependencies
npm install

# Build
npm run build

# Check build succeeded
if [ ! -d "dist" ]; then
    echo "❌ Build failed!"
    exit 1
fi

# Backup existing files
sudo cp -r /var/www/html /var/www/html.backup.$(date +%Y%m%d_%H%M%S)

# Deploy
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/

# Set permissions
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html

echo "✅ Frontend deployed"
```

### Step 8: On Server - Configure Nginx

```bash
# Check current nginx config
sudo cat /etc/nginx/sites-enabled/default

# If it doesn't have the /api/ proxy block, update it
sudo nano /etc/nginx/sites-enabled/default
```

Your nginx config should look like this:

```nginx
server {
    listen 80;
    server_name 13.203.204.11;

    root /var/www/html;
    index index.html;

    # Frontend
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API Proxy
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

After editing:

```bash
# Test nginx config
sudo nginx -t

# If test passes, reload
sudo systemctl reload nginx

echo "✅ Nginx configured"
```

### Step 9: Verify Everything

```bash
# Check backend
pm2 status
curl http://localhost:5000/api/auth/login
# Should return: Cannot POST /api/auth/login (not 404)

# Check frontend files
ls -la /var/www/html/

# Check nginx
sudo systemctl status nginx

# Exit server
exit
```

### Step 10: Test from Browser

1. Open http://13.203.204.11
2. Should see login page with "IBILL HRMS" branding
3. Open browser console (F12) → Network tab
4. Try login with:
   - Email: admin@hrms.com
   - Password: (your password)
5. Should see request to http://13.203.204.11:5000/api/auth/login
6. Should NOT get 404

---

## Quick Commands for Future Deployments

### Backend Only
```bash
ssh -i ./hrms-ibill.pem ubuntu@13.203.204.11 << 'ENDSSH'
cd /var/www/hrms-project
git pull origin Development-ibill
cd backend
npm install
pm2 restart hrms-backend
ENDSSH
```

### Frontend Only
```bash
ssh -i ./hrms-ibill.pem ubuntu@13.203.204.11 << 'ENDSSH'
cd /var/www/hrms-project
git pull origin Development-ibill
cd hr_and_asset_mgt
npm run build
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo systemctl reload nginx
ENDSSH
```

### Full Deployment
```bash
ssh -i ./hrms-ibill.pem ubuntu@13.203.204.11 << 'ENDSSH'
cd /var/www/hrms-project
git pull origin Development-ibill

# Backend
cd backend
npm install
pm2 restart hrms-backend

# Frontend
cd ../hr_and_asset_mgt
npm run build
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo systemctl reload nginx

pm2 list
ENDSSH
```

---

## Troubleshooting

### Issue: Backend not starting

```bash
cd /var/www/hrms-project/backend
pm2 logs hrms-backend --lines 100
```

Common causes:
- Missing .env file
- Wrong MongoDB connection string
- Port 5000 already in use

### Issue: Frontend not loading

```bash
# Check files exist
ls -la /var/www/html/

# Check nginx logs
sudo tail -50 /var/log/nginx/error.log
```

### Issue: Still getting 404 on /api/

```bash
# Check backend is running
pm2 list
sudo netstat -tulpn | grep :5000

# Check nginx config
sudo nginx -t
sudo cat /etc/nginx/sites-enabled/default
```

---

## Security Note

⚠️ **NEVER commit `hrms-ibill.pem` to git!**

The `.gitignore` file should contain:
```
hrms-ibill.pem
*.pem
.env
```
