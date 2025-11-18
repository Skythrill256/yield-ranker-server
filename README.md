# Yield Ranker Backend

Complete backend server for the Yield Ranker ETF application with Excel upload, Supabase integration, and Yahoo Finance API.

## Quick Setup

### Step 1: Install Dependencies

```powershell
cd yield-ranker-server
npm install
```

Dependencies installed:
- express - Web server
- cors - Cross-origin requests
- multer - File uploads
- xlsx - Excel parsing
- @supabase/supabase-js - Database
- dotenv - Environment variables

### Step 2: Create .env File

Create `yield-ranker-server/.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
PORT=4000
```

Get credentials from Supabase:
1. Go to your Supabase project
2. Settings → API
3. Copy "Project URL" → SUPABASE_URL
4. Copy "service_role" key → SUPABASE_SERVICE_ROLE_KEY

### Step 3: Run SQL in Supabase

Open `SUPABASE_ETF_TABLE.sql` and run in Supabase SQL Editor.

This creates the `etfs` table with all columns from your spreadsheet.

### Step 4: Start Backend

```powershell
cd yield-ranker-server
npm start
```

You should see:
```
Server running on port 4000
```

## Testing Backend

### Test 1: Health Check
```powershell
curl http://localhost:4000/api/health
```

Should return: `{"status":"ok"}`

### Test 2: Check ETFs Endpoint
```powershell
curl http://localhost:4000/api/etfs
```

Should return: `{"data":[],"count":0}` (empty until you upload)

### Test 3: Upload Excel

Use your admin panel or test with curl:

```powershell
curl -X POST http://localhost:4000/api/admin/upload-dtr -F "file=@path/to/DTR.xlsx"
```

Should return: `{"message":"Successfully processed 108 ETFs","count":108}`

### Test 4: Verify Data
```powershell
curl http://localhost:4000/api/etfs
```

Should return: All ETFs with data

### Test 5: Yahoo Finance Returns
```powershell
curl "http://localhost:4000/api/yahoo-finance/returns?symbol=AAPW"
```

Should return: Price returns and total returns

## API Endpoints

### Admin Endpoints

**Upload Excel File**
```
POST /api/admin/upload-dtr
Content-Type: multipart/form-data
Body: file (Excel file)

Response:
{
  "message": "Successfully processed 108 ETFs",
  "count": 108
}
```

### ETF Data Endpoints

**Get All ETFs**
```
GET /api/etfs

Response:
{
  "data": [ /* array of all ETFs */ ],
  "count": 108
}
```

**Get Single ETF**
```
GET /api/etfs/:symbol

Response:
{
  "data": { /* single ETF object */ }
}
```

### Yahoo Finance Endpoints

**Get Price & Total Returns**
```
GET /api/yahoo-finance/returns?symbol=AAPW

Response:
{
  "symbol": "AAPW",
  "currentPrice": 42.61,
  "priceChange": 0.11,
  "priceReturn1Wk": 1.27,
  "priceReturn1Mo": 10.51,
  "priceReturn3Mo": 18.27,
  "priceReturn6Mo": 31.06,
  "priceReturn12Mo": null,
  "priceReturn3Yr": null,
  "totalReturn1Wk": 1.27,
  "totalReturn1Mo": 10.51,
  "totalReturn3Mo": 18.27,
  "totalReturn6Mo": 31.06,
  "totalReturn12Mo": null,
  "totalReturn3Yr": null
}
```

**Get Dividend History**
```
GET /api/yahoo-finance/dividends?symbol=AAPW

Response:
{
  "symbol": "AAPW",
  "dividends": [
    { "date": "2024-11-15", "amount": 0.23638 },
    { "date": "2024-11-08", "amount": 0.23638 },
    ...
  ]
}
```

**Get Historical Chart Data**
```
GET /api/yahoo-finance/etf?symbol=AAPW&timeframe=1Y

Response:
{
  "symbol": "AAPW",
  "data": [
    {
      "timestamp": 1699920000,
      "close": 42.61,
      "high": 43.12,
      "low": 42.30,
      "open": 42.50,
      "volume": 123456
    },
    ...
  ]
}
```

## Excel Structure

Your spreadsheet columns mapped to database:

| Excel Column | Database Column | Type | Notes |
|--------------|----------------|------|-------|
| SYMBOL | symbol | TEXT | Required, unique |
| Issuer | issuer | TEXT | ROUNDHILL, YIELDMAX, etc. |
| DESC | description | TEXT | AAPL, AMD, BITCOIN, etc. |
| Pay Day | pay_day | TEXT | TU, FRI, Monthly, etc. |
| IPO PRICE | ipo_price | NUMERIC | Initial offering price |
| Price | price | NUMERIC | Current price |
| Price Cha[nge] | price_change | NUMERIC | Price change |
| Dividend | dividend | NUMERIC | Latest dividend |
| # Pmts | payments_per_year | INTEGER | 52 for weekly, 12 monthly |
| Annual Div | annual_div | NUMERIC | Total annual dividend |
| Forward Y[ield] | forward_yield | NUMERIC | Yield percentage |
| Dividend Vo[latility] | dividend_volatility_index | NUMERIC | Standard deviation |
| Weighted [Rank] | weighted_rank | NUMERIC | Custom ranking |
| 3 YR Annlz[ed] | three_year_annualized | NUMERIC | 3-year return |
| 12 Month | total_return_12m | NUMERIC | 12-month total return |
| 6 Month | total_return_6m | NUMERIC | 6-month total return |
| 3 Month | total_return_3m | NUMERIC | 3-month total return |
| 1 Month | total_return_1m | NUMERIC | 1-month total return |
| 1 Week | total_return_1w | NUMERIC | 1-week total return |

## Data Flow

### When You Upload Excel:

1. Admin uploads DTR.xlsx
2. Backend parses Sheet1
3. Extracts all columns
4. Upserts to Supabase `etfs` table
5. Saves `spreadsheet_updated_at` timestamp
6. Returns success + count

### When User Views Homepage:

1. Frontend fetches /api/etfs
2. Gets spreadsheet data (price, dividend, total returns)
3. For each ETF, calls Yahoo Finance API to fill gaps
4. Displays merged data in table

### When User Clicks Symbol:

1. Shows spreadsheet-based performance chart
2. If user clicks "Live Price Chart" tab:
3. Calls /api/yahoo-finance/etf?symbol=AAPW
4. Gets historical prices for line chart
5. Renders interactive chart

### When User Clicks Dividend:

1. Calls /api/yahoo-finance/dividends?symbol=AAPW
2. Gets 5 years of dividend history
3. Sorts newest → oldest
4. Shows in modal/table

## What Gets Filled by Yahoo Finance

### Always from Yahoo Finance:
1. Price Returns (1W, 1M, 3M, 6M, 12M, 3Y) - NOT in spreadsheet
2. Dividend History (5 years) - Timeline of all payments

### Conditionally from Yahoo Finance:
3. Total Returns - If your spreadsheet has N/A
4. Current Price - If more recent than spreadsheet

## Troubleshooting

### "SUPABASE_URL is not set"
- Check `yield-ranker-server/.env` file exists
- Verify SUPABASE_URL is set correctly
- Restart server after changing .env

### "Symbol column not found"
- Check Excel file has "SYMBOL" in row 1
- Make sure row 1 is headers, row 2+ is data
- Try opening Excel and verifying column names

### "Failed to upsert data"
- Check Supabase connection
- Verify service role key (not anon key)
- Check SQL table was created correctly

### "Yahoo Finance timeout"
- Normal during market hours (high load)
- Backend retries automatically
- Shows cached data if available

### "Only processed 50 instead of 108"
- Check for empty rows in Excel
- Ensure SYMBOL column has values in all rows
- Remove any completely blank rows

## Production Deployment

### Railway (Recommended):

1. Push to GitHub

```powershell
git add .
git commit -m "Add backend"
git push
```

2. Deploy to Railway
- Go to railway.app
- New Project → Deploy from GitHub
- Select your repo
- Root directory: `yield-ranker-server`
- Add environment variables (same as .env)

3. Update Frontend

```env
VITE_API_URL=https://your-backend.railway.app
```

### Environment Variables for Production:
- SUPABASE_URL - Your Supabase project URL
- SUPABASE_SERVICE_ROLE_KEY - Service role key
- PORT - Will be set by Railway automatically

## Summary

✅ Backend parses YOUR Excel exactly  
✅ All symbols saved to database  
✅ Yahoo Finance fills gaps (Price Returns, Dividend History)  
✅ Your spreadsheet data is PRIMARY source  
✅ Real-time API supplements when needed  
✅ Admin can re-upload anytime to update  

Next: Upload your Excel file in Admin Panel!

