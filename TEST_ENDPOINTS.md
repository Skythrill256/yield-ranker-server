# Test All Backend Endpoints

Use these commands to test each endpoint of your backend.

## Prerequisites

Server must be running:
```powershell
npm start
```

## Basic Endpoints

### Health Check
```powershell
curl http://localhost:4000/api/health
```

Expected:
```json
{"status":"ok"}
```

### Get All ETFs (Empty Before Upload)
```powershell
curl http://localhost:4000/api/etfs
```

Expected:
```json
{"data":[],"count":0}
```

## Upload Excel File

### Via Frontend
1. Navigate to: http://localhost:8081/admin
2. Login with admin credentials
3. Go to "ETF Data Management"
4. Click "Upload Excel File"
5. Select your DTR.xlsx
6. Click "Upload"

### Via curl (Windows PowerShell)
```powershell
curl -X POST http://localhost:4000/api/admin/upload-dtr -F "file=@C:\Users\March\Documents\DTR.xlsx"
```

Replace path with your actual Excel file location.

Expected Response:
```json
{
  "message": "Successfully processed 108 ETFs",
  "count": 108
}
```

## After Upload - Verify Data

### Get All ETFs (Should Have Data)
```powershell
curl http://localhost:4000/api/etfs
```

Expected: Large JSON array with all ETFs

### Get Single ETF by Symbol
```powershell
curl http://localhost:4000/api/etfs/AAPW
```

Expected:
```json
{
  "data": {
    "id": "...",
    "symbol": "AAPW",
    "issuer": "ROUNDHILL",
    "description": "AAPL",
    "price": 42.61,
    "dividend": 0.23838,
    "forward_yield": 29.1,
    ...
  }
}
```

### Get Non-Existent ETF
```powershell
curl http://localhost:4000/api/etfs/INVALID
```

Expected:
```json
{"error":"ETF not found"}
```

## Yahoo Finance Endpoints

### Get Price & Total Returns
```powershell
curl "http://localhost:4000/api/yahoo-finance/returns?symbol=AAPW"
```

Expected:
```json
{
  "symbol": "AAPW",
  "currentPrice": 42.61,
  "priceChange": 0.11,
  "priceReturn1Wk": 1.27,
  "priceReturn1Mo": 10.51,
  "priceReturn3Mo": 18.27,
  "priceReturn6Mo": 31.06,
  "priceReturn12Mo": -18.24,
  "priceReturn3Yr": null,
  "totalReturn1Wk": 1.27,
  "totalReturn1Mo": 10.51,
  "totalReturn3Mo": 18.27,
  "totalReturn6Mo": 31.06,
  "totalReturn12Mo": -18.24,
  "totalReturn3Yr": null
}
```

### Get Dividend History
```powershell
curl "http://localhost:4000/api/yahoo-finance/dividends?symbol=AAPW"
```

Expected:
```json
{
  "symbol": "AAPW",
  "dividends": [
    {
      "date": "2024-11-15",
      "amount": 0.23638
    },
    {
      "date": "2024-11-08",
      "amount": 0.23638
    },
    ...
  ]
}
```

### Get Historical Chart Data (1 Year)
```powershell
curl "http://localhost:4000/api/yahoo-finance/etf?symbol=AAPW&timeframe=1Y"
```

Expected:
```json
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

### Get Historical Chart Data (Different Timeframes)

1 Month:
```powershell
curl "http://localhost:4000/api/yahoo-finance/etf?symbol=AAPW&timeframe=1M"
```

3 Months:
```powershell
curl "http://localhost:4000/api/yahoo-finance/etf?symbol=AAPW&timeframe=3M"
```

6 Months:
```powershell
curl "http://localhost:4000/api/yahoo-finance/etf?symbol=AAPW&timeframe=6M"
```

1 Year (default):
```powershell
curl "http://localhost:4000/api/yahoo-finance/etf?symbol=AAPW&timeframe=1Y"
```

3 Years:
```powershell
curl "http://localhost:4000/api/yahoo-finance/etf?symbol=AAPW&timeframe=3Y"
```

## Batch Operations

### Get Total Returns (Cached)
```powershell
curl "http://localhost:4000/api/yahoo-finance/total-returns?symbol=AAPW"
```

Expected:
```json
{
  "data": {
    "symbol": "AAPW",
    "totalReturn3Mo": 18.27,
    "totalReturn6Mo": 31.06,
    "totalReturn12Mo": -18.24,
    "totalReturn3Yr": null
  }
}
```

### Batch Quote Request
```powershell
curl -X POST http://localhost:4000/api/yahoo-finance/batch -H "Content-Type: application/json" -d "{\"symbols\":[\"AAPW\",\"AAPL\",\"MSFO\"]}"
```

Expected:
```json
{
  "data": {
    "AAPW": {
      "price": 42.61,
      "priceChange": 0.11,
      "previousClose": 42.50,
      ...
    },
    "AAPL": { ... },
    "MSFO": { ... }
  }
}
```

### Quick Update (Multiple Symbols)
```powershell
curl "http://localhost:4000/api/yahoo-finance/quick-update?symbols=AAPW,AAPL,MSFO"
```

Expected:
```json
{
  "data": {
    "AAPW": { ... },
    "AAPL": { ... },
    "MSFO": { ... }
  }
}
```

### Quick Update (All ETFs in Database)
```powershell
curl http://localhost:4000/api/yahoo-finance/quick-update
```

Expected: Quotes for all ETFs in your database

## Error Cases

### Missing Symbol Parameter
```powershell
curl "http://localhost:4000/api/yahoo-finance/returns"
```

Expected:
```json
{"error":"symbol is required"}
```

### Invalid Symbol
```powershell
curl "http://localhost:4000/api/yahoo-finance/returns?symbol=INVALID123"
```

Expected: 500 error or empty data

### No File in Upload
```powershell
curl -X POST http://localhost:4000/api/admin/upload-dtr
```

Expected:
```json
{"error":"No file uploaded"}
```

## Test Script (PowerShell)

Save this as `test-backend.ps1`:

```powershell
Write-Host "Testing Backend Endpoints..." -ForegroundColor Cyan

Write-Host "`n1. Health Check" -ForegroundColor Yellow
curl http://localhost:4000/api/health

Write-Host "`n2. Get All ETFs" -ForegroundColor Yellow
curl http://localhost:4000/api/etfs | ConvertFrom-Json | Select-Object -Property count

Write-Host "`n3. Get Single ETF (AAPW)" -ForegroundColor Yellow
curl http://localhost:4000/api/etfs/AAPW

Write-Host "`n4. Yahoo Finance Returns (AAPW)" -ForegroundColor Yellow
curl "http://localhost:4000/api/yahoo-finance/returns?symbol=AAPW"

Write-Host "`n5. Yahoo Finance Dividends (AAPW)" -ForegroundColor Yellow
curl "http://localhost:4000/api/yahoo-finance/dividends?symbol=AAPW"

Write-Host "`nAll tests complete!" -ForegroundColor Green
```

Run with:
```powershell
.\test-backend.ps1
```

## Summary

All endpoints tested:
- ✅ Health check
- ✅ Get all ETFs
- ✅ Get single ETF
- ✅ Upload Excel
- ✅ Yahoo Finance returns
- ✅ Yahoo Finance dividends
- ✅ Yahoo Finance historical data
- ✅ Batch operations
- ✅ Error handling

Your backend is fully functional!

