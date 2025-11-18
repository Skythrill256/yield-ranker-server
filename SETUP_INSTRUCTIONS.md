# Backend Setup Instructions

## Prerequisites

- Node.js 18+ installed
- Supabase account
- Your DTR Excel spreadsheet

## Step-by-Step Setup

### 1. Install Dependencies

Already completed! Dependencies installed:
- express
- cors
- multer
- xlsx
- @supabase/supabase-js
- dotenv

### 2. Configure Supabase

#### A. Create Supabase Table

1. Go to your Supabase project: https://supabase.com/dashboard
2. Navigate to: SQL Editor
3. Open the file `SUPABASE_ETF_TABLE.sql` in this directory
4. Copy the entire SQL content
5. Paste into Supabase SQL Editor
6. Click "Run" to create the table

This creates:
- `etfs` table with all columns from your spreadsheet
- Indexes for performance
- Auto-update trigger for `updated_at` column

#### B. Get Supabase Credentials

1. In your Supabase project, go to: Settings → API
2. Find these values:
   - Project URL (looks like: https://xxxxx.supabase.co)
   - service_role key (under "Project API keys" - NOT the anon key)

### 3. Create Environment File

Create a file named `.env` in the `yield-ranker-server` directory with:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
PORT=4000
```

Replace:
- `your-project.supabase.co` with your actual Project URL
- `your_service_role_key_here` with your actual service_role key

WARNING: Use the service_role key, NOT the anon key! The service_role key has full database access.

### 4. Start the Server

```powershell
npm start
```

You should see:
```
Server running on port 4000
```

If you see an error about SUPABASE_URL not being set, make sure your .env file is in the correct location.

## Testing Your Setup

### Test 1: Health Check

```powershell
curl http://localhost:4000/api/health
```

Expected: `{"status":"ok"}`

### Test 2: Check Empty Database

```powershell
curl http://localhost:4000/api/etfs
```

Expected: `{"data":[],"count":0}` (empty until you upload)

### Test 3: Upload Excel File

Option A - Using Admin Panel:
1. Open your frontend at http://localhost:8081
2. Login as admin
3. Navigate to Admin Panel → ETF Data Management
4. Click "Upload Excel" and select your DTR.xlsx file
5. Should see: "Success! Processed X ETFs"

Option B - Using curl:
```powershell
curl -X POST http://localhost:4000/api/admin/upload-dtr -F "file=@C:\path\to\your\DTR.xlsx"
```

Replace `C:\path\to\your\DTR.xlsx` with the actual path to your Excel file.

Expected response:
```json
{
  "message": "Successfully processed 108 ETFs",
  "count": 108
}
```

### Test 4: Verify Data in Database

```powershell
curl http://localhost:4000/api/etfs
```

Expected: JSON array with all your ETFs

### Test 5: Get Single ETF

```powershell
curl http://localhost:4000/api/etfs/AAPW
```

Expected: JSON object with AAPW data

### Test 6: Yahoo Finance Returns

```powershell
curl "http://localhost:4000/api/yahoo-finance/returns?symbol=AAPW"
```

Expected: Price and total returns for AAPW

### Test 7: Dividend History

```powershell
curl "http://localhost:4000/api/yahoo-finance/dividends?symbol=AAPW"
```

Expected: Array of dividend payments

## Common Issues

### Issue: "SUPABASE_URL is not set"

Solution:
- Ensure .env file exists in `yield-ranker-server` directory
- Check that .env has no typos (SUPABASE_URL, not SUPABASE-URL)
- Restart the server after creating/editing .env

### Issue: "Failed to upsert data to database"

Solutions:
- Verify you're using the service_role key, not anon key
- Check that you ran the SUPABASE_ETF_TABLE.sql in Supabase
- Verify your Supabase URL is correct
- Check Supabase dashboard for any errors

### Issue: "Symbol column not found"

Solutions:
- Open your Excel file and verify row 1 contains "SYMBOL" header
- Ensure there are no extra sheets selected
- Check that row 1 is headers, row 2+ is data
- Remove any filters from Excel before uploading

### Issue: "Only processed 50 instead of 108"

Solutions:
- Check for empty rows in your Excel file
- Ensure every row has a SYMBOL value
- Remove any completely blank rows
- Verify there are no merged cells in the SYMBOL column

### Issue: "Yahoo Finance timeout"

This is normal:
- Yahoo Finance can be slow during market hours
- The backend has built-in retry logic
- Data is cached to reduce repeated calls
- Try again after a few minutes

## Excel Column Mapping

Your spreadsheet columns are automatically mapped:

| Excel Header | Database Column | Type |
|--------------|----------------|------|
| SYMBOL | symbol | TEXT |
| Issuer | issuer | TEXT |
| DESC | description | TEXT |
| Pay Day | pay_day | TEXT |
| IPO PRICE | ipo_price | NUMERIC |
| Price | price | NUMERIC |
| Price Cha* | price_change | NUMERIC |
| Dividend | dividend | NUMERIC |
| # Pmts | payments_per_year | INTEGER |
| Annual Div | annual_div | NUMERIC |
| Forward Y* | forward_yield | NUMERIC |
| Dividend Vo* | dividend_volatility_index | NUMERIC |
| Weighted* | weighted_rank | NUMERIC |
| 3 YR Annlz* | three_year_annualized | NUMERIC |
| 12 Month | total_return_12m | NUMERIC |
| 6 Month | total_return_6m | NUMERIC |
| 3 Month | total_return_3m | NUMERIC |
| 1 Month | total_return_1m | NUMERIC |
| 1 Week | total_return_1w | NUMERIC |

Note: Columns with * support partial matches (e.g., "Price Cha", "Price Change" both work)

## What Happens After Upload

1. Excel file is uploaded and temporarily saved
2. Backend reads the first sheet
3. Parses all columns based on mapping above
4. Converts numeric values (handles "N/A", empty cells, percentages)
5. Upserts data to Supabase (updates existing, inserts new)
6. Sets `spreadsheet_updated_at` timestamp
7. Deletes temporary upload file
8. Returns count of processed ETFs

## Data Priority

Your spreadsheet data is the PRIMARY source:
- Price, dividend, total returns come from YOUR Excel
- Yahoo Finance fills GAPS:
  - Price Returns (not in spreadsheet)
  - 5-year dividend history (you only have latest)
  - Chart data for historical visualization
  - Current price updates (during market hours)

## Re-uploading Data

You can re-upload Excel anytime to update data:
1. Update your Excel spreadsheet
2. Upload through Admin Panel
3. Existing ETFs are UPDATED (not duplicated)
4. New ETFs are ADDED
5. Removed ETFs stay in database (manual deletion if needed)

## Production Deployment

When ready to deploy:

1. Push code to GitHub
2. Deploy to Railway/Heroku/Render
3. Add environment variables in platform dashboard
4. Update frontend to use production API URL
5. Upload Excel through production admin panel

## Next Steps

1. ✅ Dependencies installed
2. ✅ Supabase table created
3. ✅ .env file configured
4. ✅ Server running
5. ⏳ Upload your Excel file
6. ⏳ Verify data in frontend

Once your Excel is uploaded, your backend is fully operational!

## Support

If you encounter issues:
1. Check the Terminal for error messages
2. Verify all environment variables in .env
3. Test each endpoint individually using curl
4. Check Supabase dashboard for connection issues
5. Ensure Excel file format matches specifications

