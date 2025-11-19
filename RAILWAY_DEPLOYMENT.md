# Railway Deployment Guide

## Network Timeout Solutions

This document explains how to resolve the `ETIMEDOUT` errors when deploying on Railway.

### Root Cause
The timeout errors occur because:
1. Railway's networking environment has different latency characteristics
2. Parallel requests can overwhelm connection limits
3. Default fetch timeouts are too short for cloud environments

### Implemented Solutions

#### 1. Enhanced Retry Logic
- **Max retries**: Increased from 3 to 7 in Railway
- **Initial backoff**: Increased from 1s to 2s in Railway
- **Fetch timeout**: Increased from 30s to 45s in Railway
- **Exponential backoff**: Capped at 10s with jitter to prevent thundering herd

#### 2. Conservative Batch Processing
- **Batch size**: Reduced from 10 to 2 symbols in Railway
- **Delay between batches**: Increased from 2s to 8s in Railway
- **Sequential processing**: Changed from parallel to sequential for chart requests

#### 3. Connection Management
- **Connection type**: Uses "close" instead of "keep-alive" in Railway
- **Cache control**: Added no-cache headers to prevent CDN caching issues
- **Timeout handling**: Added AbortController for proper timeout cancellation

### Railway-Specific Configuration

The application automatically detects Railway environment via:
- `RAILWAY_ENVIRONMENT`
- `RAILWAY_SERVICE_NAME`

### Environment Variables

Set these in your Railway project settings:

```bash
# Network settings
RAILWAY_TIMEOUT_MS=45000
RAILWAY_MAX_RETRIES=7
RAILWAY_BATCH_SIZE=2
RAILWAY_DELAY_MS=8000

# Node.js optimization
NODE_OPTIONS=--max-old-space-size=512

# Application
PORT=8080
NODE_ENV=production
```

### Deployment Steps

1. **Create Railway Project**
   ```bash
   railway login
   railway init
   ```

2. **Set Environment Variables**
   - Copy variables from `.railway.env`
   - Set them in Railway dashboard

3. **Deploy**
   ```bash
   railway up
   ```

### Monitoring

The application now logs:
- Environment detection (Railway vs local)
- Batch processing configuration
- Enhanced error messages with timeout details
- Retry attempts with backoff timing

### Troubleshooting

If timeouts persist:

1. **Increase timeout further**:
   ```bash
   RAILWAY_TIMEOUT_MS=60000
   ```

2. **Reduce batch size**:
   ```bash
   RAILWAY_BATCH_SIZE=1
   ```

3. **Increase delay**:
   ```bash
   RAILWAY_DELAY_MS=12000
   ```

4. **Add health check**: Railway will automatically use `/api/health`

### Performance Impact

These changes increase reliability but slightly reduce processing speed:
- ~30% slower due to sequential processing
- More resilient to network issues
- Better error handling and recovery

The trade-off is worthwhile for production reliability on Railway.