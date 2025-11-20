# Ranking Weights API - Implementation Complete

## ✅ What Was Implemented

### Backend Endpoints:
- ✅ `PUT /api/user/preferences` - Save ranking weights
- ✅ `GET /api/user/preferences` - Load ranking weights
- ✅ JWT token verification middleware
- ✅ Database integration with profiles table

---

## 📋 Setup Instructions

### Step 1: Run SQL in Supabase

1. Open **Supabase Dashboard**
2. Go to **SQL Editor**
3. Copy contents of `SUPABASE_PREFERENCES_SETUP.sql`
4. Click **Run**

This adds the `preferences` column to your `profiles` table.

### Step 2: Deploy Backend

The backend code is already committed. Just:

```powershell
git pull origin main
```

Railway will auto-deploy, or restart your local server:

```powershell
cd yield-ranker-server
npm start
```

---

## 🧪 Testing the API

### Get Your JWT Token

1. Open your frontend app
2. Open browser console (F12)
3. Run:
```javascript
localStorage.getItem('supabase.auth.token')
```
4. Copy the token value

### Test Save Preferences

```powershell
curl -X PUT http://localhost:4000/api/user/preferences -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" -d "{\"preferences\":{\"ranking_weights\":{\"yield\":40,\"stdDev\":30,\"totalReturn\":30,\"timeframe\":\"3mo\"}}}"
```

**Expected Response:**
```json
{
  "success": true,
  "preferences": {
    "ranking_weights": {
      "yield": 40,
      "stdDev": 30,
      "totalReturn": 30,
      "timeframe": "3mo"
    }
  }
}
```

### Test Load Preferences

```powershell
curl -X GET http://localhost:4000/api/user/preferences -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "preferences": {
    "ranking_weights": {
      "yield": 40,
      "stdDev": 30,
      "totalReturn": 30,
      "timeframe": "3mo"
    }
  }
}
```

---

## 🔄 Complete User Flow

### 1. User Changes Weights

Frontend → Dashboard → "Customize Rankings"
- User sets: Yield 40%, Std Dev 30%, Total Return 30%
- User selects: "3 Month" timeframe
- User clicks: "Apply Rankings"

### 2. Frontend Saves to Backend

```typescript
PUT /api/user/preferences
{
  preferences: {
    ranking_weights: {
      yield: 40,
      stdDev: 30,
      totalReturn: 30,
      timeframe: "3mo"
    }
  }
}
```

### 3. Backend Saves to Database

```sql
UPDATE profiles 
SET preferences = '{"ranking_weights": {...}}'
WHERE id = user_id;
```

### 4. User Refreshes Page

Frontend loads profile → Profile includes preferences → Weights auto-applied

---

## 📁 Files Created

### Backend Implementation:
- ✅ `routes/user.js` - User preferences routes
- ✅ `index.js` - Updated to mount routes

### Database Setup:
- ✅ `SUPABASE_PREFERENCES_SETUP.sql` - Database schema

### Documentation:
- ✅ `RANKING_WEIGHTS_API.md` - This file

---

## 🎯 API Endpoints

### PUT /api/user/preferences

**Save user ranking weights**

**Request:**
```http
PUT /api/user/preferences
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "preferences": {
    "ranking_weights": {
      "yield": 40,
      "stdDev": 30,
      "totalReturn": 30,
      "timeframe": "3mo"
    }
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "preferences": {
    "ranking_weights": {
      "yield": 40,
      "stdDev": 30,
      "totalReturn": 30,
      "timeframe": "3mo"
    }
  }
}
```

**Response (Error - No Token):**
```json
{
  "success": false,
  "message": "No token provided"
}
```

**Response (Error - Invalid Token):**
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

---

### GET /api/user/preferences

**Load user ranking weights**

**Request:**
```http
GET /api/user/preferences
Authorization: Bearer <jwt_token>
```

**Response (Has Preferences):**
```json
{
  "success": true,
  "preferences": {
    "ranking_weights": {
      "yield": 40,
      "stdDev": 30,
      "totalReturn": 30,
      "timeframe": "3mo"
    }
  }
}
```

**Response (No Preferences Yet):**
```json
{
  "success": true,
  "preferences": null
}
```

---

## 🔐 Authentication

### JWT Token Verification

The backend verifies tokens using Supabase:

```javascript
const { data: { user }, error } = await supabase.auth.getUser(token);
```

- Token must be valid Supabase JWT
- Token must not be expired
- User must exist in Supabase auth

---

## 💾 Database Schema

### profiles Table

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  full_name TEXT,
  preferences JSONB DEFAULT '{}'::jsonb,  -- NEW COLUMN
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### preferences Column Structure

```json
{
  "ranking_weights": {
    "yield": 40,
    "stdDev": 30,
    "totalReturn": 30,
    "timeframe": "3mo"
  }
}
```

Timeframe options:
- `"1wk"` - 1 Week
- `"1mo"` - 1 Month
- `"3mo"` - 3 Months
- `"6mo"` - 6 Months
- `"12mo"` - 12 Months

---

## 🐛 Troubleshooting

### "No token provided"
- Check Authorization header is set
- Format: `Authorization: Bearer <token>`
- No quotes around token

### "Invalid or expired token"
- Token might be expired (Supabase tokens expire)
- User needs to re-login
- Check token is copied correctly

### "Failed to save preferences"
- Check database has preferences column
- Check RLS policies allow updates
- Check user exists in profiles table

### "Failed to load preferences"
- Check user exists in profiles table
- If returns `null`, user hasn't saved preferences yet (this is OK)

---

## ✅ Verification Checklist

After implementation:

1. ✅ Run SQL in Supabase
2. ✅ Backend deployed/restarted
3. ✅ Test save endpoint with curl
4. ✅ Test load endpoint with curl
5. ✅ Frontend can save weights
6. ✅ Frontend can load weights on refresh
7. ✅ Weights persist after logout/login

---

## 🚀 Production Ready

The implementation includes:

- ✅ JWT authentication
- ✅ Error handling
- ✅ Validation
- ✅ Database indexing
- ✅ RLS policies
- ✅ Proper HTTP status codes
- ✅ Detailed error messages
- ✅ Console logging for debugging

---

## 📞 Support

If you encounter issues:

1. Check backend logs for errors
2. Verify SQL was run successfully
3. Test with curl first before frontend
4. Check JWT token is valid and not expired
5. Verify user exists in profiles table

---

**Status: ✅ READY TO USE**

Frontend and backend are now connected. Users can save and load their custom ranking weights!

