# Quick SQL Fixes - Supabase SQL Editor

## Delete All ETF Data (Start Fresh)

```sql
DELETE FROM etfs;
```

Verify it's empty:
```sql
SELECT COUNT(*) as total_etfs FROM etfs;
```

Should return: `0`

---

## View All Current ETFs

```sql
SELECT symbol, name, issuer, price, forward_yield 
FROM etfs 
ORDER BY symbol;
```

---

## Count Total ETFs

```sql
SELECT COUNT(*) as total_etfs FROM etfs;
```

---

## Delete Specific Symbols

Replace `'SYMBOL1'`, `'SYMBOL2'` with actual symbols:

```sql
DELETE FROM etfs 
WHERE symbol IN ('AAPW', 'ABNY', 'AIPI');
```

---

## View Last Upload Date

```sql
SELECT 
  symbol, 
  spreadsheet_updated_at 
FROM etfs 
ORDER BY spreadsheet_updated_at DESC 
LIMIT 1;
```

---

## Delete Old Data (Before Specific Date)

```sql
DELETE FROM etfs 
WHERE spreadsheet_updated_at < '2024-11-19';
```

---

## IMMEDIATE FIX FOR YOUR CURRENT ISSUE

**Problem:** Have 109 ETFs, uploaded 107, still showing 109

**Solution:** Run this now:

```sql
-- Step 1: Clear everything
DELETE FROM etfs;

-- Step 2: Verify it's empty (should show 0)
SELECT COUNT(*) as total_etfs FROM etfs;

-- Step 3: Re-upload your 107-ETF file via admin panel
-- Result: Will have exactly 107 ETFs
```

---

## After Backend Deploys

Once the new backend is live, **every upload will automatically replace all data**.

No need for manual SQL anymore - just upload and it replaces everything automatically.

---

## Quick Reference

| Task | SQL Command |
|------|-------------|
| Delete all | `DELETE FROM etfs;` |
| Count | `SELECT COUNT(*) FROM etfs;` |
| View all | `SELECT * FROM etfs ORDER BY symbol;` |
| Delete one | `DELETE FROM etfs WHERE symbol = 'AAPW';` |

