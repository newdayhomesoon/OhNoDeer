#!/bin/bash

# Oh No Deer Admin Dashboard Deployment Script
# This script deploys the admin dashboard to Firebase Hosting

echo "🚀 Deploying Oh No Deer Admin Dashboard..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in to Firebase
if ! firebase projects:list &> /dev/null; then
    echo "❌ Not logged in to Firebase. Please login first:"
    echo "firebase login"
    exit 1
fi

# Deploy to Firebase Hosting
echo "📤 Deploying to Firebase Hosting..."
firebase deploy --only hosting

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo "🌐 Your admin dashboard is now live at:"
    firebase hosting:channel:deploy --expires 7d 2>/dev/null || echo "Please check Firebase console for the hosting URL"
else
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
fi

echo ""
echo "📋 Next steps:"
echo "1. Update the Firebase config in admin-dashboard.html with your actual Firebase project credentials"
echo "2. Set up Firestore security rules to allow admin access to the collections"
echo "3. Share the admin dashboard URL with authorized personnel only"
