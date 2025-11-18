# Complete API Reference

## Base URL

Development: `http://localhost:4000`
Production: `https://your-backend.railway.app`

## Authentication

Currently, no authentication required for read endpoints.
Upload endpoint should be protected in production (add auth middleware).

## Response Format

All successful responses return JSON:
```json
{
  "data": { ... } or [ ... ],
  "count": number (optional)
}
```

Error responses:
```json
{
  "error": "Error message",
  "details": "Additional details (optional)"
}
```

## Endpoints

### Health Check

Check if server is running.

**Endpoint:** `GET /api/health`

**Response:**
```json
{
  "status": "ok"
}
```

**Status Codes:**
- 200: Server is running

---

### Upload Excel File

Upload DTR spreadsheet to update ETF database.

**Endpoint:** `POST /api/admin/upload-dtr`

**Content-Type:** `multipart/form-data`

**Body:**
- `file`: Excel file (.xlsx or .xls)

**Response:**
```json
{
  "message": "Successfully processed 108 ETFs",
  "count": 108
}
```

**Status Codes:**
- 200: Upload successful
- 400: No file uploaded / Invalid file / Empty file / No valid data
- 500: Server error / Database error

**Notes:**
- Accepts .xlsx and .xls files only
- Max file size: 10MB
- File is automatically deleted after processing
- Uses UPSERT logic (updates existing, inserts new)
- Sets `spreadsheet_updated_at` timestamp on all records

**Example (curl):**
```bash
curl -X POST http://localhost:4000/api/admin/upload-dtr \
  -F "file=@/path/to/DTR.xlsx"
```

---

### Get All ETFs

Retrieve all ETFs from database.

**Endpoint:** `GET /api/etfs`

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "symbol": "AAPW",
      "issuer": "ROUNDHILL",
      "description": "AAPL",
      "pay_day": "TU",
      "ipo_price": 50.00,
      "price": 42.61,
      "price_change": 0.11,
      "dividend": 0.23838,
      "payments_per_year": 52,
      "annual_div": 12.40,
      "forward_yield": 29.1,
      "dividend_volatility_index": 0.4629,
      "weighted_rank": 0,
      "three_year_annualized": null,
      "total_return_12m": -18.24,
      "total_return_6m": 17.13,
      "total_return_3m": 9.51,
      "total_return_1m": 5.23,
      "total_return_1w": 1.45,
      "spreadsheet_updated_at": "2024-11-18T10:30:00Z",
      "created_at": "2024-11-18T10:30:00Z",
      "updated_at": "2024-11-18T10:30:00Z"
    },
    ...
  ],
  "count": 108
}
```

**Status Codes:**
- 200: Success
- 500: Database error

**Notes:**
- Returns all ETFs ordered by symbol (ascending)
- Includes exact count
- Empty array if no ETFs in database

---

### Get Single ETF

Retrieve a specific ETF by symbol.

**Endpoint:** `GET /api/etfs/:symbol`

**Parameters:**
- `symbol` (path): ETF ticker symbol (case-insensitive)

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "symbol": "AAPW",
    "issuer": "ROUNDHILL",
    ...
  }
}
```

**Status Codes:**
- 200: ETF found
- 404: ETF not found
- 500: Database error

**Example:**
```bash
curl http://localhost:4000/api/etfs/AAPW
```

---

### Get Price & Total Returns

Get price returns and total returns for a symbol using Yahoo Finance historical data.

**Endpoint:** `GET /api/yahoo-finance/returns`

**Query Parameters:**
- `symbol` (required): Ticker symbol

**Response:**
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

**Status Codes:**
- 200: Success
- 400: Missing symbol parameter
- 500: Yahoo Finance error

**Notes:**
- Price returns calculated from historical prices (no dividends)
- Total returns include dividend reinvestment (when available)
- Returns are percentages
- null values indicate insufficient historical data
- Data fetched in real-time from Yahoo Finance

**Example:**
```bash
curl "http://localhost:4000/api/yahoo-finance/returns?symbol=AAPW"
```

---

### Get Dividend History

Get 5-year dividend payment history for a symbol.

**Endpoint:** `GET /api/yahoo-finance/dividends`

**Query Parameters:**
- `symbol` (required): Ticker symbol

**Response:**
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

**Status Codes:**
- 200: Success
- 400: Missing symbol parameter
- 500: Yahoo Finance error

**Notes:**
- Returns up to 5 years of dividend history
- Sorted by date (newest first)
- Empty array if no dividends found
- Amounts are per-share values

**Example:**
```bash
curl "http://localhost:4000/api/yahoo-finance/dividends?symbol=AAPW"
```

---

### Get Historical Chart Data

Get historical price data for charting.

**Endpoint:** `GET /api/yahoo-finance/etf`

**Query Parameters:**
- `symbol` (required): Ticker symbol
- `timeframe` (optional): Time period (default: "1Y")
  - Valid values: "1W", "1M", "3M", "6M", "1Y", "3Y", "5Y"

**Response:**
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

**Status Codes:**
- 200: Success
- 400: Missing symbol parameter
- 404: No data found
- 500: Yahoo Finance error

**Notes:**
- Timestamps are Unix epoch (seconds)
- OHLCV data included
- Data points vary by timeframe
- Used for rendering interactive charts

**Example:**
```bash
curl "http://localhost:4000/api/yahoo-finance/etf?symbol=AAPW&timeframe=1Y"
```

---

### Get Total Returns (Cached)

Get total returns with 6-hour caching.

**Endpoint:** `GET /api/yahoo-finance/total-returns`

**Query Parameters:**
- `symbol` (required): Ticker symbol

**Response:**
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

**Status Codes:**
- 200: Success
- 400: Missing symbol parameter
- 500: Yahoo Finance error

**Notes:**
- Cached for 6 hours per symbol
- Reduces Yahoo Finance API load
- null values indicate insufficient data

**Example:**
```bash
curl "http://localhost:4000/api/yahoo-finance/total-returns?symbol=AAPW"
```

---

### Batch Quote Request

Get quotes for multiple symbols at once.

**Endpoint:** `POST /api/yahoo-finance/batch`

**Content-Type:** `application/json`

**Body:**
```json
{
  "symbols": ["AAPW", "AAPL", "MSFO"]
}
```

**Response:**
```json
{
  "data": {
    "AAPW": {
      "price": 42.61,
      "priceChange": 0.11,
      "previousClose": 42.50,
      "currency": "USD",
      "exchange": "PCX"
    },
    "AAPL": { ... },
    "MSFO": { ... }
  }
}
```

**Status Codes:**
- 200: Success
- 400: Missing or empty symbols array
- 500: Yahoo Finance error

**Notes:**
- Optimized for fetching multiple quotes
- Faster than individual requests
- Max 50 symbols recommended

**Example:**
```bash
curl -X POST http://localhost:4000/api/yahoo-finance/batch \
  -H "Content-Type: application/json" \
  -d '{"symbols":["AAPW","AAPL","MSFO"]}'
```

---

### Quick Update

Get latest prices for specific symbols or all ETFs.

**Endpoint:** `GET /api/yahoo-finance/quick-update`

**Query Parameters:**
- `symbols` (optional): Comma-separated list of symbols
  - If omitted, fetches all ETFs from database

**Response:**
```json
{
  "data": {
    "AAPW": { ... },
    "AAPL": { ... },
    ...
  }
}
```

**Status Codes:**
- 200: Success
- 500: Yahoo Finance or database error

**Examples:**
```bash
curl "http://localhost:4000/api/yahoo-finance/quick-update?symbols=AAPW,AAPL"

curl "http://localhost:4000/api/yahoo-finance/quick-update"
```

**Also available as POST:**

**Endpoint:** `POST /api/yahoo-finance/quick-update`

**Body:**
```json
{
  "symbols": ["AAPW", "AAPL"]
}
```

---

### Get Single Quote

Get current quote for a single symbol.

**Endpoint:** `GET /api/yahoo-finance`

**Query Parameters:**
- `symbol` (required): Ticker symbol

**Response:**
```json
{
  "data": {
    "price": 42.61,
    "priceChange": 0.11,
    "previousClose": 42.50,
    "currency": "USD",
    "exchange": "PCX"
  }
}
```

**Status Codes:**
- 200: Success
- 400: Missing symbol parameter
- 500: Yahoo Finance error

**Example:**
```bash
curl "http://localhost:4000/api/yahoo-finance?symbol=AAPW"
```

---

### Yahoo Finance Comparison Charts

Get historical data for comparing multiple symbols.

**Endpoint:** `POST /api/yahoo-finance`

**Body:**
```json
{
  "action": "fetchComparisonData",
  "symbols": ["AAPW", "AAPL", "MSFO"],
  "timeframe": "1M"
}
```

**Response:**
```json
{
  "data": {
    "data": {
      "AAPW": {
        "timestamps": [1699920000, ...],
        "closes": [42.61, ...],
        "highs": [43.12, ...],
        "lows": [42.30, ...],
        "opens": [42.50, ...],
        "volumes": [123456, ...]
      },
      "AAPL": { ... },
      "MSFO": { ... }
    }
  }
}
```

**Status Codes:**
- 200: Success
- 400: Missing symbols or invalid action
- 500: Yahoo Finance error

**Notes:**
- Used for side-by-side comparisons
- All symbols normalized to same timeframe
- Useful for relative performance charts

---

## Data Types

### ETF Object
```typescript
{
  id: string (uuid)
  symbol: string
  issuer: string | null
  description: string | null
  pay_day: string | null
  ipo_price: number | null
  price: number | null
  price_change: number | null
  dividend: number | null
  payments_per_year: number | null
  annual_div: number | null
  forward_yield: number | null
  dividend_volatility_index: number | null
  weighted_rank: number | null
  three_year_annualized: number | null
  total_return_12m: number | null
  total_return_6m: number | null
  total_return_3m: number | null
  total_return_1m: number | null
  total_return_1w: number | null
  spreadsheet_updated_at: string (ISO 8601) | null
  created_at: string (ISO 8601)
  updated_at: string (ISO 8601)
}
```

### Quote Object
```typescript
{
  price: number | null
  priceChange: number | null
  previousClose: number | null
  currency: string | null
  exchange: string | null
}
```

### Dividend Object
```typescript
{
  date: string (YYYY-MM-DD)
  amount: number
}
```

### Historical Data Point
```typescript
{
  timestamp: number (Unix epoch)
  close: number
  high: number
  low: number
  open: number
  volume: number
}
```

## Rate Limiting

No rate limiting currently implemented.
Yahoo Finance has its own rate limits (typically generous for individual use).

## Caching

- Total Returns: 6 hours per symbol
- ETF List: 60 seconds
- Quick Updates: No caching (always fresh)
- Historical Data: No caching (always fresh)

## Error Handling

All endpoints return proper HTTP status codes and error messages:

- 200: Success
- 400: Bad request (missing parameters, invalid input)
- 404: Not found
- 500: Server error (database, Yahoo Finance, parsing errors)

Error response format:
```json
{
  "error": "Human-readable error message",
  "details": "Technical details (optional)",
  "message": "Additional context (optional)"
}
```

## CORS

CORS is enabled for all origins in development.
Configure appropriately for production.

## Notes

1. All symbol parameters are case-insensitive (converted to uppercase)
2. Numeric values can be null if not available
3. Excel upload uses UPSERT (updates existing records)
4. Yahoo Finance data is fetched in real-time (may be slow)
5. Timestamps use ISO 8601 format
6. Prices and returns are in the currency of the listing

## Production Considerations

1. Add authentication to upload endpoint
2. Configure CORS for specific origins
3. Implement rate limiting
4. Add request logging
5. Set up error monitoring (Sentry, etc.)
6. Use environment-specific .env files
7. Enable HTTPS only
8. Add health check monitoring
9. Configure database connection pooling
10. Implement request validation middleware

