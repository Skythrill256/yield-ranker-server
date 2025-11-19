# Setup Guide for New Features

## What Was Added

✅ **Admin Message Endpoint** - Editable message shown to users  
✅ **Disclosure Popup Endpoint** - One-time disclosure for new users  
✅ **EOD Timestamp** - "EOD MM/DD/YYYY" format for last updated

---

## Step 1: Run SQL in Supabase

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy contents of `SUPABASE_MESSAGES_TABLE.sql`
4. Click "Run"

This creates the `site_messages` table with default content.

---

## Step 2: Test Backend Endpoints

### Test Admin Message
```powershell
curl http://localhost:4000/api/admin/message
```

### Test Disclosure
```powershell
curl http://localhost:4000/api/disclosure
```

### Test EOD Timestamp
```powershell
curl http://localhost:4000/api/etfs
```

Look for `last_updated: "EOD 11/19/2024"` in the response.

---

## Step 3: Frontend Integration

### For Admin Message (editable)

```typescript
GET /api/admin/message
PUT /api/admin/message
```

**Example Usage:**
```typescript
const { data } = await fetch(`${API_URL}/api/admin/message`).then(r => r.json());
console.log(data.content);

await fetch(`${API_URL}/api/admin/message`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: "New message" })
});
```

### For Disclosure Popup (show once)

```typescript
GET /api/disclosure
```

**Example Usage:**
```typescript
const hasSeenDisclosure = localStorage.getItem('hasSeenDisclosure');

if (!hasSeenDisclosure) {
  const { data } = await fetch(`${API_URL}/api/disclosure`).then(r => r.json());
  
  showPopup(data.content);
  
  localStorage.setItem('hasSeenDisclosure', 'true');
}
```

### For Last Updated Display

```typescript
const { last_updated } = await fetch(`${API_URL}/api/etfs`).then(r => r.json());
console.log(last_updated);
```

Displays as: **"EOD 11/19/2024"**

---

## Complete Frontend Examples

See `MESSAGES_API.md` for:
- Complete React components
- CSS styling for popup
- Full integration examples
- Error handling

---

## Deploy

Once Railway redeploys (automatic), the new endpoints will be live at:

```
https://your-backend.railway.app/api/admin/message
https://your-backend.railway.app/api/disclosure
https://your-backend.railway.app/api/etfs (with EOD timestamp)
```

---

## Summary of Changes

| Feature | Endpoint | Method | Purpose |
|---------|----------|--------|---------|
| Get Admin Message | `/api/admin/message` | GET | Fetch current admin message |
| Update Admin Message | `/api/admin/message` | PUT | Edit admin message |
| Get Disclosure | `/api/disclosure` | GET | Fetch disclosure for popup |
| Update Disclosure | `/api/disclosure` | PUT | Edit disclosure content |
| Get ETFs | `/api/etfs` | GET | Now includes `last_updated: "EOD MM/DD/YYYY"` |

---

## Next Steps

1. ✅ SQL table created in Supabase
2. ⏳ Frontend adds admin message display/edit
3. ⏳ Frontend adds disclosure popup on first visit
4. ⏳ Frontend displays "Last Updated: EOD XX/XX/XXXX"

All backend work is complete and ready for frontend integration!

