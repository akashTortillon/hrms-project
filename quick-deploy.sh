#!/bin/bash
# Quick deployment script - Run this on your LOCAL machine

set -e

echo "=========================================="
echo "IBILL HRMS - Quick Deployment"
echo "=========================================="

KEY_PATH="${SSH_KEY_PATH:-/Users/jastin/Desktop/Development/vivil/hrms-project/hrms-ibill.pem}"
SERVER="ubuntu@13.203.204.11"

# Check if key exists
if [ ! -f "$KEY_PATH" ]; then
    echo "❌ SSH key not found at: $KEY_PATH"
    echo ""
    echo "Please set the SSH_KEY_PATH environment variable or copy your key to:"
    echo "   /Users/jastin/Desktop/Development/vivil/hrms-project/hrms-ibill.pem"
    echo ""
    echo "Example:"
    echo "   cp /Users/jastin/Downloads/hrms-ibill.pem ./hrms-ibill.pem"
    echo "   chmod 600 ./hrms-ibill.pem"
    echo ""
    echo "Or use:"
    echo "   SSH_KEY_PATH=/path/to/your/key.pem ./quick-deploy.sh"
    exit 1
fi

echo ""
echo "Step 1: Pushing local changes to Git..."
git add .
git commit -m "Deploy: Update frontend config and branding" || echo "Nothing to commit"
git push origin main

echo ""
echo "Step 2: Uploading deployment scripts to server..."
scp -i "$KEY_PATH" \
    deploy-frontend.sh \
    deploy-backend.sh \
    diagnose-404.sh \
    nginx-config-example.conf \
    "$SERVER:/home/ubuntu/"

echo ""
echo "Step 3: Connecting to server and deploying..."
ssh -i "$KEY_PATH" "$SERVER" << 'ENDSSH'
    cd /home/ubuntu
    chmod +x deploy-backend.sh deploy-frontend.sh diagnose-404.sh
    
    echo ""
    echo "=========================================="
    echo "Running Diagnosis First..."
    echo "=========================================="
    ./diagnose-404.sh
    
    echo ""
    read -p "Do you want to proceed with deployment? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "=========================================="
        echo "Deploying Backend..."
        echo "=========================================="
        ./deploy-backend.sh
        
        echo ""
        echo "=========================================="
        echo "Deploying Frontend..."
        echo "=========================================="
        ./deploy-frontend.sh
        
        echo ""
        echo "=========================================="
        echo "✅ Deployment Complete!"
        echo "=========================================="
        echo ""
        echo "🌐 Access your application at:"
        echo "   http://13.203.204.11"
        echo ""
        echo "👤 Admin Login:"
        echo "   Email: admin@hrms.com"
        echo "   Phone: +971500000000"
        echo ""
    else
        echo "Deployment cancelled"
    fi
ENDSSH

echo ""
echo "=========================================="
echo "Deployment script finished!"
echo "=========================================="
