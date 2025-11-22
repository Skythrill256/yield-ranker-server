# Excel File Format Guide

## Supported Column Names

Your Excel file should have headers in **row 1** and data starting in **row 2**.

The backend supports multiple column name formats (case-insensitive where applicable):

### Required Columns

| Your Excel Header | Alternative Names | Database Field | Example Value |
|-------------------|-------------------|----------------|---------------|
| **SYMBOL** or **Symbol** | symbol | symbol | JEPI |
| **Price** or **Current Price** | PRICE | price | 55.23 |

### Optional Columns

| Your Excel Header | Alternative Names | Database Field | Example Value |
|-------------------|-------------------|----------------|---------------|
| Name | NAME | name | JPMorgan Equity Premium |
| Issuer | ISSUER | issuer | JPMorgan |
| Description or DESC | DESCRIPTION | description | Equity Premium Income ETF |
| Pay Day | PAY_DAY | pay_day | Monthly |
| IPO Price | IPO PRICE, IPO_PRICE | ipo_price | 50.00 |
| Price Change | Price Cha, PRICE_CHANGE | price_change | -0.45 |
| Dividend | DIVIDEND | dividend | 0.4832 |
| # Payments or # Pmts | NUM_PAYMENTS | payments_per_year | 12 |
| Annual Dividend or Annual Div | ANNUAL_DIVIDEND | annual_div | 5.80 |
| Forward Yield or Forward Y | FORWARD_YIELD | forward_yield | 7.24 |
| Standard Deviation or Dividend Vo | STD_DEV, Dividend Volatility | dividend_volatility_index | 0.15 |
| Weighted Rank or Weighted | - | weighted_rank | 85.5 |
| 3 Yr Total Return or 3 YR Annlz | 3 Year Annualized, TOTAL_RETURN_3YR | three_year_annualized | 15.2 |
| 12 Mo Total Return or 12 Month | TOTAL_RETURN_12MO | total_return_12m | 12.5 |
| 6 Mo Total Return or 6 Month | TOTAL_RETURN_6MO | total_return_6m | 8.3 |
| 3 Mo Total Return or 3 Month | TOTAL_RETURN_3MO | total_return_3m | 4.2 |
| 1 Mo Total Return or 1 Month | TOTAL_RETURN_1MO | total_return_1m | 2.1 |
| 1 Wk Total Return or 1 Week | TOTAL_RETURN_1WK | total_return_1w | 0.5 |
| 52 Week Low | WEEK_52_LOW | week_52_low | 48.50 |
| 52 Week High | WEEK_52_HIGH | week_52_high | 58.75 |

## Example Excel File Structure

### Row 1 (Headers):
```
Symbol | Name | Issuer | Current Price | Forward Yield | 12 Mo Total Return | 6 Mo Total Return | 3 Mo Total Return
```

### Row 2+ (Data):
```
JEPI | JPMorgan Equity Premium | JPMorgan | 55.23 | 7.24 | 12.5 | 8.3 | 4.2
JEPQ | JPMorgan Nasdaq ETF | JPMorgan | 52.18 | 9.15 | 15.2 | 10.1 | 5.5
DIVO | Amplify CWP Enhanced | Amplify | 43.67 | 5.12 | 8.3 | 6.2 | 3.1
```

## Important Notes

### 1. Symbol Column is Required
- Must be present in every row with data
- Will be converted to UPPERCASE automatically
- Used as unique identifier (updates existing records on re-upload)

### 2. Column Name Flexibility
- Column names are case-insensitive
- Partial matches work (e.g., "Price Cha" matches "Price Change")
- Multiple formats supported for compatibility

### 3. Data Types

**Text Fields** (stored as-is):
- Symbol, Name, Issuer, Description, Pay Day

**Numeric Fields** (parsed automatically):
- All other fields
- Supports: `123.45`, `$123.45`, `123.45%`, `(123.45)`
- "N/A", empty cells, or "-" are stored as NULL

### 4. Missing Data
- Missing columns are fine (will be NULL in database)
- Rows without a symbol are skipped
- Empty rows are skipped

### 5. Special Values
- "N/A" → NULL
- "-" → NULL
- Empty cell → NULL
- "$123.45" → 123.45
- "12.5%" → 12.5

## Sample Excel Templates

### Minimal Template (Required fields only)
```
Symbol | Price
JEPI   | 55.23
JEPQ   | 52.18
DIVO   | 43.67
```

### Complete Template (All fields)
```
Symbol | Name | Issuer | Description | Pay Day | IPO Price | Current Price | Price Change | Dividend | # Payments | Annual Dividend | Forward Yield | Standard Deviation | Weighted Rank | 3 Yr Total Return | 12 Mo Total Return | 6 Mo Total Return | 3 Mo Total Return | 1 Mo Total Return | 1 Wk Total Return | 52 Week Low | 52 Week High
JEPI | JPMorgan Equity Premium | JPMorgan | Equity Premium Income ETF | Monthly | 50.00 | 55.23 | -0.45 | 0.4832 | 12 | 5.80 | 7.24 | 0.15 | 85.5 | 15.2 | 12.5 | 8.3 | 4.2 | 2.1 | 0.5 | 48.50 | 58.75
```

## Testing Your File

Before uploading through the admin panel, you can test your Excel file:

### Option 1: Using curl
```powershell
curl -X POST http://localhost:4000/api/admin/upload-dtr -F "file=@C:\path\to\your-file.xlsx"
```

### Option 2: Using test script
```powershell
node test-upload.js C:\path\to\your-file.xlsx
```

## Expected Response

### Success
```json
{
  "success": true,
  "count": 45,
  "message": "Successfully processed 45 ETFs"
}
```

### Success with Skipped Rows
```json
{
  "success": true,
  "count": 43,
  "message": "Successfully processed 43 ETFs (2 rows skipped)"
}
```

### Error: No File
```json
{
  "error": "No file uploaded"
}
```

### Error: Empty File
```json
{
  "error": "Excel file is empty"
}
```

### Error: No Valid Data
```json
{
  "error": "No valid ETF data found. Make sure SYMBOL column exists and has values."
}
```

### Error: Database Issue
```json
{
  "error": "Failed to save data to database",
  "details": "specific error message"
}
```

## Common Issues

### Issue: "No valid ETF data found"
**Solution:**
- Make sure row 1 contains column headers
- Make sure you have a "Symbol" or "SYMBOL" column
- Make sure symbol column has values (not empty)
- Remove any blank rows at the top

### Issue: "Only processed 10 of 50 rows"
**Solution:**
- Check for empty cells in the Symbol column
- Remove completely blank rows
- Check for merged cells in Excel

### Issue: Numbers not importing correctly
**Solution:**
- Remove currency symbols or percentage signs (backend handles these)
- Or keep them - backend strips them automatically
- Check for text formatted as numbers in Excel

### Issue: "Failed to save data to database"
**Solution:**
- Verify Supabase connection in .env
- Check you ran the SQL schema in Supabase
- Ensure service_role key is used (not anon key)

## Re-uploading Data

When you upload the same Excel file again:
- Existing ETFs (matching symbol) are **UPDATED**
- New symbols are **INSERTED**
- Removed symbols stay in database (manual deletion if needed)

This means you can:
1. Update prices and returns by re-uploading
2. Add new ETFs by including them in the file
3. Maintain historical data safely

## Data Validation

The backend automatically:
- ✅ Converts symbols to UPPERCASE
- ✅ Trims whitespace from text fields
- ✅ Parses numbers from formatted strings
- ✅ Handles N/A and empty values
- ✅ Skips rows without symbols
- ✅ Validates numeric types
- ✅ Sets timestamp on upload

## Integration with Frontend

After successful upload, the frontend should:
1. Receive `{ success: true, count: X, message: "..." }`
2. Show success message to user
3. Refresh the ETF list/charts
4. Display the count of processed ETFs

Frontend can check for errors by:
```typescript
if (response.ok && result.success) {
  // Show success message with result.message
  // Refresh charts/data
} else {
  // Show error: result.error
  // Optionally show: result.details
}
```

## Best Practices

1. **Keep a master Excel file** - Update it regularly and re-upload
2. **Use consistent column names** - Pick one format and stick to it
3. **Include all columns** - Even if some have N/A values
4. **Test with small file first** - Upload 5-10 ETFs to verify format
5. **Backup before bulk changes** - Export current data before major updates
6. **Check the response** - Verify count matches expected ETFs

## Need Help?

If you're having issues:
1. Check your Excel file has headers in row 1
2. Verify Symbol column exists and has values
3. Try uploading a simple 2-column file (Symbol, Price) first
4. Check server logs for detailed error messages
5. Use the test-upload.js script for debugging





