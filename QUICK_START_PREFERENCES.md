# Quick Start: Ranking Weights Feature

## ✅ Backend Implementation Complete!

The backend API for saved ranking weights is **ready and deployed**.

---

## 🚀 Setup in 3 Steps

### Step 1: Run SQL (2 minutes)

1. Open **Supabase Dashboard**
2. Go to **SQL Editor**  
3. Copy and paste this:

```sql
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_profiles_preferences 
ON profiles USING gin(preferences);
```

4. Click **Run**

✅ Done! The database is ready.

---

### Step 2: Backend Auto-Deploys (Automatic)

Railway will automatically deploy the new code in ~2-3 minutes.

Or restart your local server:

```powershell
cd yield-ranker-server
npm start
```

✅ Backend endpoints are live!

---

### Step 3: Test It (1 minute)

1. Open your frontend app
2. Login
3. Open **"Customize Rankings"**
4. Change weights (e.g., 40/30/30)
5. Select **"3 Mo"**
6. Click **"Apply Rankings"**
7. **Refresh the page**
8. ✅ Weights should still be 40/30/30!

---

## 🎯 What Just Got Added

### API Endpoints:
- `PUT /api/user/preferences` - Saves ranking weights
- `GET /api/user/preferences` - Loads ranking weights

### Features:
- ✅ Saves user's custom yield/stdDev/totalReturn weights
- ✅ Saves selected timeframe (1wk, 1mo, 3mo, 6mo, 12mo)
- ✅ Persists across sessions
- ✅ Loads automatically on login
- ✅ JWT authentication secured

---

## 🧪 Quick Test Commands

Get your JWT token:
```javascript
// In browser console (F12)
localStorage.getItem('supabase.auth.token')
```

Test save:
```powershell
curl -X PUT http://localhost:4000/api/user/preferences -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" -d "{\"preferences\":{\"ranking_weights\":{\"yield\":40,\"stdDev\":30,\"totalReturn\":30,\"timeframe\":\"3mo\"}}}"
```

Test load:
```powershell
curl -X GET http://localhost:4000/api/user/preferences -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📁 Files Added

- `routes/user.js` - Preferences API routes
- `SUPABASE_PREFERENCES_SETUP.sql` - Database setup
- `RANKING_WEIGHTS_API.md` - Complete API docs

---

## ✅ Success Checklist

After setup:
- [ ] SQL run in Supabase
- [ ] Backend deployed/restarted
- [ ] Changed weights in frontend
- [ ] Clicked "Apply Rankings"
- [ ] Refreshed page
- [ ] Weights still saved ✓

---

## 🐛 Troubleshooting

**Weights don't save?**
- Check backend is running
- Check SQL was executed
- Open browser console for errors

**401 Unauthorized?**
- User needs to be logged in
- JWT token might be expired - re-login

**Weights don't load on refresh?**
- Check browser console for "Loading saved weights"
- Verify preferences saved in database

---

## 📞 Need Help?

Check the detailed docs:
- `RANKING_WEIGHTS_API.md` - Complete API reference
- `SUPABASE_PREFERENCES_SETUP.sql` - Database setup with verification queries

---

**Status: 🎉 READY TO USE!**

Your users can now save their custom ranking weights!


