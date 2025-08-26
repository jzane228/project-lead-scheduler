# 🎨 Frontend Deployment Guide

## Overview
This guide covers deploying the React frontend to free hosting platforms with automatic deployments.

## 🚀 **Vercel (Recommended for Frontend)**

### Pros
- **Free Tier**: Unlimited deployments
- **Automatic Deployments**: From GitHub
- **Custom Domains**: Free SSL included
- **Edge Network**: Global CDN
- **React Optimized**: Built for React apps

### Setup
1. Go to [vercel.com](https://vercel.com/)
2. Sign up with GitHub
3. Import your repository
4. Vercel auto-detects React app
5. Deploy!

### Configuration
```json
// vercel.json (optional - Vercel auto-detects most settings)
{
  "buildCommand": "npm run build",
  "outputDirectory": "build",
  "installCommand": "npm install",
  "framework": "create-react-app"
}
```

---

## 🌐 **Netlify (Alternative)**

### Pros
- **Free Tier**: 100GB bandwidth/month
- **Automatic Deployments**: From GitHub
- **Custom Domains**: Free SSL included
- **Form Handling**: Built-in form processing

### Setup
1. Go to [netlify.com](https://netlify.com/)
2. Sign up with GitHub
3. Import your repository
4. Configure build settings

### Configuration
```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "build"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

## 🔧 **Frontend Configuration Updates**

### 1. Update API Base URL
After deploying your backend, update the frontend API configuration:

```javascript
// src/contexts/AuthContext.js
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://your-backend.railway.app/api';

// .env.local
REACT_APP_API_URL=https://your-backend.railway.app/api
```

### 2. Environment Variables
Create environment files for different deployments:

```bash
# .env.development
REACT_APP_API_URL=http://localhost:5001/api

# .env.production
REACT_APP_API_URL=https://your-backend.railway.app/api
```

### 3. CORS Configuration
Ensure your backend allows your frontend domain:

```javascript
// Backend CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://your-frontend.vercel.app',
    'https://your-frontend.netlify.app'
  ],
  credentials: true
}));
```

---

## 🚀 **Quick Deployment Commands**

### Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

### Netlify
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy

# Deploy to production
netlify deploy --prod
```

---

## 📱 **Mobile Optimization**

### PWA Configuration
```json
// public/manifest.json
{
  "name": "Project Lead Scheduler",
  "short_name": "PLS",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#000000",
  "background_color": "#ffffff"
}
```

### Service Worker
```javascript
// src/serviceWorker.js
// Register service worker for offline functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}
```

---

## 🔄 **Continuous Deployment Workflow**

### Development Process
1. **Local Development**
   - Make changes locally
   - Test with local backend
   - Commit changes

2. **Backend Deployment**
   - Push to GitHub
   - Railway auto-deploys backend
   - Test backend endpoints

3. **Frontend Deployment**
   - Push to GitHub
   - Vercel/Netlify auto-deploys frontend
   - Test full application

4. **Production Testing**
   - Verify all features work
   - Check performance
   - Monitor errors

---

## 🎯 **Recommended Setup**

### For Development
- **Backend**: Railway (instant deployments)
- **Frontend**: Vercel (React optimized)
- **Database**: Railway PostgreSQL

### For Production
- **Backend**: Railway Pro ($20/month)
- **Frontend**: Vercel Pro ($20/month)
- **Database**: Railway PostgreSQL Pro
- **Monitoring**: Railway + Vercel analytics

---

## 🚨 **Important Notes**

### Environment Variables
- Never commit sensitive data
- Use `.env.local` for local development
- Set production variables in hosting platform

### Build Optimization
- Enable production builds
- Optimize bundle size
- Enable code splitting

### Performance
- Use React.lazy() for code splitting
- Optimize images
- Enable compression

---

## 📚 **Additional Resources**

- **Vercel**: [vercel.com](https://vercel.com/)
- **Netlify**: [netlify.com](https://netlify.com/)
- **React Deployment**: [reactjs.org/docs/deployment.html](https://reactjs.org/docs/deployment.html)
- **PWA Guide**: [web.dev/progressive-web-apps/](https://web.dev/progressive-web-apps/)

---

🎉 **Your frontend is now ready for deployment with automatic updates!**
