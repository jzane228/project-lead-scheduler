# 🚀 Railway Deployment Guide

## Overview
This guide will help you deploy the Project Lead Scheduler to Railway with automatic deployments and full uptime.

## Prerequisites
- [Railway Account](https://railway.app/) (Free tier)
- [GitHub Account](https://github.com/)
- Your project code in a GitHub repository

## Step 1: Prepare Your Repository

### 1.1 Push Your Code to GitHub
```bash
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

### 1.2 Ensure These Files Are Present
- `railway.json` ✅
- `Procfile` ✅
- `.nixpacks` ✅
- `package.json` with proper scripts ✅
- `server/index.js` with health check endpoint ✅

## Step 2: Deploy to Railway

### 2.1 Create Railway Account
1. Go to [Railway.app](https://railway.app/)
2. Sign up with GitHub
3. Complete the onboarding process

### 2.2 Create New Project
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your repository
4. Click "Deploy"

### 2.3 Configure Environment Variables
Railway will automatically detect your app. Now set up environment variables:

**Required Variables:**
```
NODE_ENV=production
PORT=5001
JWT_SECRET=your-super-secure-jwt-secret-here
```

**Database Variables (Railway will provide these):**
```
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
```

**Optional Variables:**
```
CORS_ORIGIN=https://your-frontend-domain.com
OPENAI_API_KEY=your-openai-key
HUBSPOT_ACCESS_TOKEN=your-hubspot-token
SALESFORCE_ACCESS_TOKEN=your-salesforce-token
```

### 2.4 Add PostgreSQL Database
1. In your Railway project, click "New"
2. Select "Database" → "PostgreSQL"
3. Railway will automatically link it to your app
4. The database variables will be automatically injected

## Step 3: Configure Automatic Deployments

### 3.1 Enable GitHub Integration
1. In your Railway project, go to "Settings"
2. Under "GitHub", ensure your repo is connected
3. Enable "Deploy on Push" for automatic deployments

### 3.2 Configure Branch Deployments
- **Main Branch**: Automatic deployment to production
- **Development Branches**: Can be configured for staging

## Step 4: Monitor Your Deployment

### 4.1 Check Deployment Status
- Railway dashboard shows real-time deployment status
- View logs in real-time
- Monitor resource usage

### 4.2 Health Check
Your app will be available at:
- **Health Check**: `https://your-app.railway.app/api/health`
- **Main App**: `https://your-app.railway.app`

## Step 5: Update Frontend Configuration

### 5.1 Update API Base URL
In your frontend, update the API base URL to your Railway domain:

```javascript
// In your frontend config
const API_BASE_URL = 'https://your-app.railway.app/api';
```

### 5.2 Update CORS Settings
Ensure your Railway app's CORS settings allow your frontend domain.

## Step 6: Continuous Development Workflow

### 6.1 Development Process
1. Make changes locally
2. Test locally
3. Commit and push to GitHub
4. Railway automatically deploys
5. Test in production

### 6.2 Rollback (if needed)
1. Go to Railway dashboard
2. Click on your deployment
3. Select "Rollback" to previous version

## Troubleshooting

### Common Issues

**Build Failures:**
- Check Railway logs for error details
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility

**Database Connection Issues:**
- Verify database environment variables
- Check if PostgreSQL service is running
- Ensure database is accessible from your app

**Port Issues:**
- Railway automatically sets `PORT` environment variable
- Your app should use `process.env.PORT`

### Getting Help
- Check Railway logs in real-time
- Railway Discord community
- Railway documentation

## Cost Management

### Free Tier Limits
- **Monthly Usage**: $5 credit (usually sufficient for development)
- **Concurrent Deployments**: 1
- **Custom Domains**: Available
- **SSL**: Automatic

### Monitoring Usage
- Check usage in Railway dashboard
- Set up usage alerts
- Optimize resource usage

## Next Steps

1. **Deploy your app** following this guide
2. **Set up monitoring** and alerts
3. **Configure custom domain** (optional)
4. **Set up staging environment** (optional)
5. **Monitor performance** and optimize

## Support

- **Railway Docs**: [docs.railway.app](https://docs.railway.app/)
- **Railway Discord**: [discord.gg/railway](https://discord.gg/railway)
- **GitHub Issues**: For app-specific issues

---

🎉 **Congratulations!** Your app is now deployed with automatic deployments and full uptime!
