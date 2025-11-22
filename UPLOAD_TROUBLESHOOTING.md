# Excel Upload Troubleshooting Guide

## ✅ What Was Fixed

### 1. **Better Error Handling**
- More detailed error messages
- Specific error codes
- Better validation at each step

### 2. **Detailed Logging**
- Logs file processing steps
- Logs row counts
- Logs database operations
- Logs errors with stack traces

### 3. **Robust Header Matching**
- Case-insensitive column matching
- Supports multiple column name variations
- Better error if SYMBOL column missing

### 4. **Complete Data Replacement**
- Deletes all existing ETFs before inserting new ones
- Ensures database matches uploaded file exactly

---

## 🔍 How to Debug Upload Errors

### Check Railway Logs

1. Go to **Railway Dashboard**
2. Click on your service
3. Go to **Deployments** → **View Logs**
4. Look for error messages when you upload

### Common Error Messages

#### "SYMBOL column not found"
**Problem:** Excel file doesn't have a SYMBOL column

**Solution:**
- Check your Excel file has "SYMBOL" in row 1
- Column name must be exactly "SYMBOL" (case-insensitive)
- Check for typos or extra spaces

#### "Excel file is empty"
**Problem:** No data rows found

**Solution:**
- Make sure data starts in row 2
- Remove any filters from Excel
- Check for completely blank rows

#### "Failed to clear existing data"
**Problem:** Database delete operation failed

**Solution:**
- Check Supabase connection
- Verify RLS policies allow deletes
- Check service role key is correct

#### "Failed to save data to database"
**Problem:** Database insert failed

**Solution:**
- Check database schema matches
- Verify all required columns exist
- Check for data type mismatches
- Look at error.details in response

---

## 🧪 Testing the Upload

### Test with curl (Windows PowerShell)

```powershell
curl -X POST https://your-backend.railway.app/api/admin/upload-dtr `
  -F "file=@C:\path\to\your\file.xlsx"
```

### Check Response

**Success:**
```json
{
  "success": true,
  "count": 107,
  "skipped": 0,
  "message": "Successfully replaced all data with 107 ETFs"
}
```

**Error:**
```json
{
  "error": "Error message",
  "details": "More specific error details"
}
```

---

## 📋 Upload Checklist

Before uploading, verify:

- [ ] File is `.xlsx` or `.xls` format
- [ ] File size is under 10MB
- [ ] Row 1 contains headers
- [ ] Row 2+ contains data
- [ ] SYMBOL column exists
- [ ] SYMBOL column has values in all rows
- [ ] No merged cells in SYMBOL column
- [ ] No filters applied in Excel

---

## 🔧 Common Issues & Solutions

### Issue: "500 Internal Server Error"

**Check Railway logs for:**
- File read errors
- Database connection errors
- Memory issues
- Timeout errors

**Solutions:**
- Reduce file size (split into smaller files)
- Check Railway service is running
- Verify environment variables are set

### Issue: "Only processed 50 instead of 107"

**Causes:**
- Empty rows in Excel
- Missing SYMBOL values
- Blank cells in SYMBOL column

**Solution:**
- Remove empty rows
- Fill all SYMBOL cells
- Check for hidden rows

### Issue: "Numbers importing as 0 or NULL"

**Causes:**
- Cells formatted as text
- Special characters in numbers
- Empty cells

**Solution:**
- Format cells as numbers in Excel
- Remove special characters
- Backend handles most formats automatically

---

## 📊 What Gets Logged

The backend now logs:

```
Processing file: DTR.xlsx, size: 245678 bytes
Found 107 rows in Excel file
Processing 107 ETFs, 0 rows skipped
Clearing existing ETFs...
Inserting new ETFs...
Upload successful: Successfully replaced all data with 107 ETFs
```

If errors occur, you'll see:
```
Error reading Excel file: [error details]
Error clearing existing ETFs: [error details]
Supabase insert error: [error details]
```

---

## 🚀 After Upload

### Verify Data

```powershell
curl https://your-backend.railway.app/api/etfs
```

Should return your uploaded ETFs.

### Check Count

```powershell
curl https://your-backend.railway.app/api/etfs | ConvertFrom-Json | Select-Object -ExpandProperty count
```

Should match number of rows in your Excel file.

---

## 📞 Still Having Issues?

1. **Check Railway logs** - Most detailed error info
2. **Check file format** - Must be .xlsx or .xls
3. **Check SYMBOL column** - Must exist and have values
4. **Check database** - Verify connection and schema
5. **Try smaller file** - Test with 10-20 rows first

---

## ✅ Success Indicators

After successful upload:

- ✅ Response shows `"success": true`
- ✅ Count matches your Excel rows
- ✅ `/api/etfs` returns your data
- ✅ No errors in Railway logs
- ✅ Database has correct number of ETFs

---

**The upload endpoint is now much more robust and will give you detailed error messages if something goes wrong!**

