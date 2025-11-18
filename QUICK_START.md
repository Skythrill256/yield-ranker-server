# Quick Start Guide

## 5-Minute Setup

### 1. Install Dependencies (Already Done!)

```powershell
cd yield-ranker-server
npm install
```

Status: ✅ Complete

### 2. Create .env File

Create a new file named `.env` in this directory with the following content:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
PORT=4000
```

Get your credentials:

- Supabase Dashboard → Settings → API
- Copy "Project URL"
- Copy "service_role" secret key (NOT anon key)

### 3. Run SQL Schema

1. Open `SUPABASE_ETF_TABLE.sql`
2. Copy entire contents
3. Go to Supabase Dashboard → SQL Editor
4. Paste and click "Run"

### 4. Start Server

```powershell
npm start
```

Expected output:

```
Server running on port 4000
```

### 5. Test Health Endpoint

```powershell
curl http://localhost:4000/api/health
```

Expected: `{"status":"ok"}`

### 6. Upload Your Excel

Through Admin Panel:

1. Open frontend: http://localhost:8081
2. Login as admin
3. Admin Panel → Upload Excel
4. Select your DTR.xlsx file
5. Click Upload

Or via curl:

```powershell
curl -X POST http://localhost:4000/api/admin/upload-dtr -F "file=@C:\path\to\DTR.xlsx"
```

### 7. Verify Data

```powershell
curl http://localhost:4000/api/etfs
```

Expected: JSON array with all your ETFs

## Done!

Your backend is ready. All endpoints are now active:

- `GET /api/etfs` - All ETFs
- `GET /api/etfs/:symbol` - Single ETF
- `POST /api/admin/upload-dtr` - Upload Excel
- `GET /api/yahoo-finance/returns?symbol=X` - Price & Total Returns
- `GET /api/yahoo-finance/dividends?symbol=X` - Dividend History
- `GET /api/yahoo-finance/etf?symbol=X` - Historical Chart Data

## What If Something Goes Wrong?

### Server won't start with "SUPABASE_URL is not set"

- Check `.env` file exists in `yield-ranker-server` folder
- Verify no typos in variable names
- Restart terminal and try again

### Upload fails with "Symbol column not found"

- Open Excel file
- Verify row 1 has "SYMBOL" header
- Ensure row 1 is headers, row 2+ is data

### Upload fails with "Failed to upsert data"

- Check you're using service_role key (not anon key)
- Verify SQL schema was run in Supabase
- Check Supabase dashboard for errors

### Data shows 0 ETFs after upload

- Check server terminal for error messages
- Verify Excel file has data starting in row 2
- Try uploading again
- Check Supabase dashboard → Table Editor → etfs

## All Set!

Your backend is now:

- ✅ Accepting Excel uploads
- ✅ Storing data in Supabase
- ✅ Serving ETF data via API
- ✅ Integrating with Yahoo Finance
- ✅ Ready for production

Next: Upload your Excel file and start using your app!
