#!/bin/bash

# 🚀 Quick Railway Deployment Script
# This script helps you deploy to Railway quickly

echo "🚀 Project Lead Scheduler - Railway Deployment"
echo "=============================================="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
else
    echo "✅ Railway CLI found"
fi

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git repository not initialized. Initializing..."
    git init
    git add .
    git commit -m "Initial commit for Railway deployment"
fi

# Check if Railway project is linked
if [ ! -f ".railway" ]; then
    echo "🔗 Linking to Railway project..."
    railway login
    railway link
else
    echo "✅ Already linked to Railway project"
fi

# Deploy
echo "🚀 Deploying to Railway..."
railway up

echo "✅ Deployment complete!"
echo "🌐 Your app should be available at: https://your-app.railway.app"
echo "📊 Check status at: https://railway.app/dashboard"
