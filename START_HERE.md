# 📍 START HERE - IBILL HRMS Deployment

## ⚠️ SSH Key Permission Error? READ THIS!

You got this error because macOS protects files in the Downloads folder. Here's the fix:

### 🔧 Quick Fix (2 minutes)

Run these commands in Terminal:

```bash
cd /Users/jastin/Desktop/Development/vivil/hrms-project
cp /Users/jastin/Downloads/hrms-ibill.pem ./hrms-ibill.pem
chmod 600 ./hrms-ibill.pem
```

Done! Now you can use `./hrms-ibill.pem` instead of the Downloads folder.

---

## 📚 Which Guide Should I Follow?

### 🟢 New to this? → **QUICK_START.md**
- Simple step-by-step instructions
- Copy-paste commands
- Takes ~10 minutes
- **START HERE if unsure!**

### 🟡 Want to understand everything? → **MANUAL_DEPLOY.md**
- Detailed explanations
- All commands with context
- Troubleshooting for each step

### 🔴 Something broken? → **SERVER_DEPLOYMENT_GUIDE.md**
- Complete troubleshooting guide
- Common issues and fixes
- Advanced debugging

### 📘 Quick reference? → **DEPLOYMENT_README.md**
- Overview of all changes
- Quick command reference
- Future deployment shortcuts

---

## 🎯 Your Deployment Path

```
1. Fix SSH Key ✓
   ↓
2. Follow QUICK_START.md
   ↓
3. Test at http://13.203.204.11
   ↓
4. ✅ Done!
```

---

## 🚀 What's Been Fixed

✅ Frontend API URL (was pointing to localhost)
✅ Admin user phone field (was missing)
✅ Branding changed from "KAYZAN GROUP" to "IBILL HRMS"
✅ Deployment scripts created
✅ SSH key issues documented

---

## 📋 Login After Deployment

- **URL**: http://13.203.204.11
- **Email**: admin@hrms.com
- **Phone**: +971500000000
- **Password**: (corresponding to your hash)

---

## 🆘 Emergency Help

If you're stuck:

1. Read **QUICK_START.md** first
2. If that doesn't work, check **MANUAL_DEPLOY.md**
3. Still stuck? Look at **SERVER_DEPLOYMENT_GUIDE.md**

The guides are designed to be read in this order!

---

## 🎬 Next Step

**Open QUICK_START.md and follow the steps!**

```bash
# Or just run these 3 commands to fix the key:
cd /Users/jastin/Desktop/Development/vivil/hrms-project
cp /Users/jastin/Downloads/hrms-ibill.pem ./hrms-ibill.pem
chmod 600 ./hrms-ibill.pem

# Then continue with QUICK_START.md
```
