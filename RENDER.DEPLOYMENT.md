# Deploy TSR Planner to Render

This guide will help you deploy the TSR Planner application to Render.com.

## 🚀 Quick Deploy (Recommended)

### Option 1: One-Click Deploy with Database

1. **Fork this repository** to your GitHub account
2. **Click the Deploy to Render button** below:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/your-username/TeamTrackMinutes)

3. **Configure Environment Variables** in the Render dashboard:
   - `VITE_FIREBASE_API_KEY`: Your Firebase API key
   - `VITE_FIREBASE_PROJECT_ID`: Your Firebase project ID  
   - `VITE_FIREBASE_APP_ID`: Your Firebase app ID

4. **Deploy!** Render will automatically:
   - Create a PostgreSQL database
   - Build and deploy your application
   - Run database migrations

### Option 2: Manual Deploy

#### Step 1: Prepare Your Repository

1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "Prepare for Render deployment"
   git push origin main
   ```

2. **Verify files are present**:
   - `render.yaml` ✅
   - `package.json` with correct scripts ✅
   - `dist/` folder (will be built by Render) ✅

#### Step 2: Create Render Services

1. **Go to [Render Dashboard](https://dashboard.render.com)**
2. **Click "New +" → "Web Service"**
3. **Connect your GitHub repository**
4. **Configure the service**:

   **Basic Settings:**
   - **Name**: `tsr-planner`
   - **Environment**: `Node`
   - **Branch**: `main`
   - **Root Directory**: Leave empty
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm start`

   **Advanced Settings:**
   - **Node Version**: `20`
   - **Health Check Path**: `/api/users`

#### Step 3: Create Database

1. **Click "New +" → "PostgreSQL"**
2. **Configure database**:
   - **Name**: `tsr-planner-db`
   - **Plan**: `Starter` (Free tier)
   - **Database Name**: `tsrplanner`
   - **User**: `tsrplanner`

3. **Copy the connection string** for later use

#### Step 4: Configure Environment Variables

In your web service settings, add these environment variables:

```env
NODE_ENV=production
PORT=10000
DATABASE_URL=postgresql://username:password@hostname:port/database
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
```

#### Step 5: Deploy

1. **Click "Create Web Service"**
2. **Wait for build to complete** (5-10 minutes)
3. **Check logs** for any errors
4. **Visit your app** at `https://your-app-name.onrender.com`

## 🔧 Firebase Configuration

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project"
3. Enter project name: `tsr-planner`
4. Enable Google Analytics (optional)

### 2. Enable Authentication

1. In Firebase Console, go to **Authentication**
2. Click **Get Started**
3. Go to **Sign-in method** tab
4. Enable **Google** provider
5. Add your Render domain to **Authorized domains**:
   - `your-app-name.onrender.com`
   - `localhost` (for development)

### 3. Get Configuration

1. Go to **Project Settings** (gear icon)
2. Scroll down to **Your apps**
3. Click **Web app** icon (`</>`)
4. Register app with name: `tsr-planner-web`
5. Copy the configuration values:
   - `apiKey`
   - `projectId` 
   - `appId`

### 4. Update Render Environment Variables

In your Render dashboard, set:
- `VITE_FIREBASE_API_KEY` = your `apiKey`
- `VITE_FIREBASE_PROJECT_ID` = your `projectId`
- `VITE_FIREBASE_APP_ID` = your `appId`

## 🗄️ Database Setup

### Automatic Setup (Recommended)

If you used `render.yaml`, the database will be created automatically and migrations will run during deployment.

### Manual Setup

If you need to run migrations manually:

1. **Connect to your database** using a PostgreSQL client
2. **Run the schema creation**:
   ```sql
   -- The schema will be created automatically by Drizzle
   -- No manual SQL needed
   ```

3. **Verify tables exist**:
   ```sql
   \dt
   ```

## 🔍 Troubleshooting

### Common Issues

#### 1. Build Failures

**Error**: `Build failed: npm ci`
**Solution**: 
- Check Node.js version (should be 20+)
- Verify `package.json` has correct scripts
- Check for missing dependencies

#### 2. Database Connection Issues

**Error**: `Database connection failed`
**Solution**:
- Verify `DATABASE_URL` is correct
- Check database is running
- Ensure SSL is enabled (`sslmode=require`)

#### 3. Firebase Authentication Issues

**Error**: `Firebase API key not valid`
**Solution**:
- Verify all Firebase environment variables are set
- Check Firebase project is active
- Ensure domain is authorized in Firebase console

#### 4. App Not Loading

**Error**: `Cannot GET /`
**Solution**:
- Check build completed successfully
- Verify static files are being served
- Check server logs for errors

### Debug Commands

```bash
# Check build logs
# Go to Render dashboard → Your service → Logs

# Check environment variables
# Go to Render dashboard → Your service → Environment

# Restart service
# Go to Render dashboard → Your service → Manual Deploy
```

## 📊 Monitoring

### Health Checks

- **Endpoint**: `https://your-app.onrender.com/api/users`
- **Expected Response**: `200 OK` with user data
- **Check Frequency**: Every 30 seconds

### Logs

- **Access**: Render dashboard → Your service → Logs
- **Log Levels**: Info, Warning, Error
- **Retention**: 7 days (free tier)

### Performance

- **Uptime**: 99.9% (paid plans)
- **Response Time**: <2s average
- **Memory Usage**: ~100MB
- **CPU Usage**: <10%

## 💰 Pricing

### Free Tier
- **Web Service**: 750 hours/month
- **Database**: 1GB storage
- **Bandwidth**: 100GB/month
- **Sleep**: After 15 minutes of inactivity

### Paid Plans
- **Starter**: $7/month
- **Standard**: $25/month
- **Pro**: $85/month

## 🔄 Updates

### Automatic Deployments

1. **Push to main branch**
2. **Render automatically builds and deploys**
3. **Database migrations run automatically**

### Manual Deployments

1. **Go to Render dashboard**
2. **Click "Manual Deploy"**
3. **Select branch and commit**
4. **Click "Deploy latest commit"**

## 🎉 Success!

Once deployed, your TSR Planner will be available at:
`https://your-app-name.onrender.com`

### Next Steps

1. **Test all functionality**:
   - User authentication
   - Team creation
   - Task management
   - Meeting minutes

2. **Configure custom domain** (optional):
   - Go to Render dashboard
   - Add custom domain
   - Update DNS records

3. **Set up monitoring**:
   - Enable uptime monitoring
   - Set up error alerts
   - Monitor performance metrics

---

**Happy Deploying! 🚀**
