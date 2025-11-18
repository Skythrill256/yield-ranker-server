# Production Deployment Guide

## Pre-Deployment Checklist

- [ ] All dependencies installed
- [ ] Supabase database configured
- [ ] .env file created and tested locally
- [ ] Excel upload tested successfully
- [ ] All API endpoints tested
- [ ] Code committed to Git repository

## Deployment Options

### Option 1: Railway (Recommended)

Railway offers simple deployment with automatic HTTPS and good free tier.

#### Step 1: Prepare Repository

```powershell
git init
git add .
git commit -m "Initial backend setup"
git remote add origin https://github.com/yourusername/yield-ranker-backend.git
git push -u origin main
```

#### Step 2: Deploy to Railway

1. Go to https://railway.app
2. Sign up or login
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Authorize Railway to access your repository
6. Select your repository
7. Railway will auto-detect Node.js and deploy

#### Step 3: Configure Environment Variables

In Railway dashboard:
1. Select your project
2. Go to "Variables" tab
3. Add these variables:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Your service role key
   - `PORT`: Leave empty (Railway sets automatically)

#### Step 4: Configure Root Directory

If your backend is in a subdirectory:
1. Go to "Settings" tab
2. Set "Root Directory" to `yield-ranker-server`
3. Redeploy

#### Step 5: Get Your Production URL

1. Go to "Settings" tab
2. Find "Domains" section
3. Railway provides: `your-app.up.railway.app`
4. Optional: Add custom domain

#### Step 6: Test Production

```powershell
curl https://your-app.up.railway.app/api/health
```

Expected: `{"status":"ok"}`

---

### Option 2: Render

Free tier with automatic HTTPS.

#### Step 1: Push to GitHub (same as Railway)

#### Step 2: Deploy to Render

1. Go to https://render.com
2. Sign up or login
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Configure:
   - Name: `yield-ranker-backend`
   - Environment: `Node`
   - Region: Choose closest to users
   - Branch: `main`
   - Root Directory: `yield-ranker-server`
   - Build Command: `npm install`
   - Start Command: `npm start`

#### Step 3: Add Environment Variables

In Render dashboard:
1. Go to "Environment" tab
2. Add:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Click "Save Changes"

#### Step 4: Deploy

Render will automatically build and deploy.

Your URL: `https://yield-ranker-backend.onrender.com`

---

### Option 3: Heroku

Established platform with good documentation.

#### Step 1: Install Heroku CLI

```powershell
winget install Heroku.HerokuCLI
```

#### Step 2: Login

```powershell
heroku login
```

#### Step 3: Create App

```powershell
cd yield-ranker-server
heroku create yield-ranker-backend
```

#### Step 4: Add Environment Variables

```powershell
heroku config:set SUPABASE_URL=https://your-project.supabase.co
heroku config:set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

#### Step 5: Deploy

```powershell
git push heroku main
```

Your URL: `https://yield-ranker-backend.herokuapp.com`

---

### Option 4: DigitalOcean App Platform

More control, competitive pricing.

1. Go to https://cloud.digitalocean.com
2. Create new App
3. Connect GitHub repository
4. Configure:
   - Environment: Node.js
   - Build Command: `npm install`
   - Run Command: `npm start`
5. Add environment variables
6. Deploy

---

## Post-Deployment Configuration

### Update Frontend

Update your frontend's `.env`:

```env
VITE_API_URL=https://your-backend-url.com
```

Or directly in code if not using env vars.

### Test Production Endpoints

```powershell
$BASE_URL = "https://your-app.up.railway.app"

curl "$BASE_URL/api/health"

curl "$BASE_URL/api/etfs"

curl "$BASE_URL/api/yahoo-finance/returns?symbol=AAPW"
```

### Upload Excel to Production

1. Open your production frontend
2. Login as admin
3. Navigate to Admin Panel
4. Upload your DTR.xlsx file
5. Verify data appears

### Monitor Deployment

Railway/Render/Heroku provide:
- Deployment logs
- Runtime logs
- Metrics (CPU, memory, requests)
- Auto-restart on crashes

---

## Environment Variables Reference

Required in production:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Optional:

```env
PORT=4000
NODE_ENV=production
```

PORT is usually set automatically by hosting platform.

---

## Security Best Practices

### 1. Protect Upload Endpoint

Add authentication middleware:

```javascript
const authenticateAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

app.post("/api/admin/upload-dtr", authenticateAdmin, upload.single("file"), async (req, res) => {
  ...
});
```

Add to .env:
```env
ADMIN_TOKEN=your_secure_random_token
```

### 2. Configure CORS

In production, restrict CORS:

```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://your-frontend.com',
  credentials: true
}));
```

### 3. Add Rate Limiting

Install:
```bash
npm install express-rate-limit
```

Use:
```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use('/api/', limiter);
```

### 4. Use HTTPS Only

Most platforms provide HTTPS automatically.
Force HTTPS:

```javascript
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https' && process.env.NODE_ENV === 'production') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});
```

### 5. Validate Input

Install:
```bash
npm install express-validator
```

Use:
```javascript
import { query, validationResult } from 'express-validator';

app.get("/api/yahoo-finance/returns",
  query('symbol').isString().isLength({ min: 1, max: 10 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    ...
  }
);
```

---

## Database Considerations

### Backup Strategy

Supabase provides automatic backups:
1. Go to Supabase Dashboard
2. Database → Backups
3. Enable daily backups
4. Download manual backup before major changes

### Connection Pooling

For high traffic, configure connection pooling in Supabase:
1. Use "Connection Pooling" URL instead of direct URL
2. Update SUPABASE_URL in production

### Indexes

Already created in `SUPABASE_ETF_TABLE.sql`:
- Index on `symbol` (primary lookups)
- Index on `issuer` (filtering)
- Index on `spreadsheet_updated_at` (sorting)

---

## Monitoring & Logging

### Add Logging

Install:
```bash
npm install winston
```

Configure:
```javascript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
  ],
});

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});
```

### Error Tracking

Consider:
- Sentry: https://sentry.io
- LogRocket: https://logrocket.com
- Datadog: https://www.datadoghq.com

### Uptime Monitoring

Free options:
- UptimeRobot: https://uptimerobot.com
- Pingdom: https://www.pingdom.com
- StatusCake: https://www.statuscake.com

Add endpoint to monitor:
```
https://your-app.up.railway.app/api/health
```

---

## Performance Optimization

### 1. Enable Compression

Install:
```bash
npm install compression
```

Use:
```javascript
import compression from 'compression';
app.use(compression());
```

### 2. Add Caching Headers

```javascript
app.use((req, res, next) => {
  if (req.path.startsWith('/api/etfs')) {
    res.set('Cache-Control', 'public, max-age=300');
  }
  next();
});
```

### 3. Database Query Optimization

Already optimized:
- Proper indexes created
- Single queries (no N+1 problems)
- Selective column fetching when needed

### 4. Yahoo Finance Caching

Already implemented:
- 6-hour cache for total returns
- 60-second cache for ETF list
- Map-based in-memory cache

For production, consider Redis:
```bash
npm install redis
```

---

## Troubleshooting Production Issues

### 502 Bad Gateway
- Check deployment logs
- Verify PORT environment variable not set (let platform set it)
- Ensure dependencies installed correctly

### Database Connection Errors
- Verify SUPABASE_URL is correct
- Check SUPABASE_SERVICE_ROLE_KEY is valid
- Ensure Supabase project is not paused

### Slow Response Times
- Check Yahoo Finance is responding
- Review logs for slow queries
- Consider adding Redis for caching
- Verify database indexes exist

### Upload Failures
- Check file size limits (increase if needed)
- Verify uploads directory exists (created automatically)
- Check disk space on server
- Review logs for specific errors

---

## Scaling Considerations

### Horizontal Scaling

Most platforms support auto-scaling:
- Railway: Automatic
- Render: Enable in settings
- Heroku: Add dynos

### Database Scaling

Supabase offers:
- Automatic connection pooling
- Read replicas (paid plans)
- Increased resources (paid plans)

### CDN for Static Assets

If serving static files, use CDN:
- Cloudflare
- AWS CloudFront
- Fastly

---

## Maintenance

### Regular Tasks

Weekly:
- Review logs for errors
- Check uptime monitoring
- Verify backups are running

Monthly:
- Update dependencies: `npm update`
- Review security advisories: `npm audit`
- Test all endpoints
- Verify Excel upload still works

Quarterly:
- Review performance metrics
- Optimize slow queries
- Update Node.js version if needed
- Review and update documentation

### Updating Production

1. Test changes locally
2. Commit to git
3. Push to GitHub
4. Platform auto-deploys (Railway/Render)
   or manually deploy (Heroku: `git push heroku main`)
5. Test production endpoints
6. Monitor logs for errors

---

## Rollback Strategy

### Railway/Render
1. Go to deployment history
2. Click "Redeploy" on previous version

### Heroku
```powershell
heroku releases
heroku rollback v123
```

### Manual Rollback
1. Git revert changes
2. Push to repository
3. Platform auto-deploys

---

## Cost Estimates

### Free Tiers

Railway:
- $5 credit/month
- ~500 hours
- Good for low traffic

Render:
- Free tier available
- Spins down after 15min inactivity
- Good for development

Heroku:
- Free tier discontinued
- Eco dynos: $5/month
- Good for production

Supabase:
- Free tier: 500MB database
- 2GB bandwidth/month
- Good for starting

### Paid Tiers (if needed)

Railway: ~$10-20/month
Render: ~$7/month
Heroku: ~$25/month
Supabase: ~$25/month (Pro plan)

Total estimated: $20-50/month for moderate traffic

---

## Summary

✅ Backend can be deployed to multiple platforms
✅ Environment variables keep secrets secure
✅ HTTPS provided automatically
✅ Monitoring and logging available
✅ Scaling options when needed
✅ Security best practices documented

Choose Railway for simplicity and good free tier.
Choose Render for reliability and free tier.
Choose Heroku for established platform and support.

Next: Deploy your backend and update frontend!

