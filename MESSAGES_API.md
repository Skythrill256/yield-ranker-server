# Site Messages API Documentation

## Overview

The backend now supports admin messages and disclosure popups that can be edited via API and displayed to users.

## Database Setup

Run this SQL in your Supabase SQL Editor:

```sql
-- Copy and run SUPABASE_MESSAGES_TABLE.sql
```

This creates the `site_messages` table with default values for:
- `admin_message`: Editable admin message shown on the site
- `disclosure`: Disclosure popup shown to every new user

## API Endpoints

### 1. Get Admin Message

**Endpoint:** `GET /api/admin/message`

**Description:** Retrieves the current admin message

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "message_type": "admin_message",
    "content": "Welcome to Yield Ranker",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

**Example (Frontend):**
```typescript
const response = await fetch(`${API_URL}/api/admin/message`);
const { data } = await response.json();
console.log(data.content);
```

---

### 2. Update Admin Message

**Endpoint:** `PUT /api/admin/message`

**Description:** Updates the admin message content

**Request Body:**
```json
{
  "content": "New admin message here",
  "is_active": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Admin message updated successfully",
  "data": {
    "id": "uuid",
    "message_type": "admin_message",
    "content": "New admin message here",
    "is_active": true
  }
}
```

**Example (Frontend):**
```typescript
const response = await fetch(`${API_URL}/api/admin/message`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: "New admin message",
    is_active: true
  })
});
const result = await response.json();
```

---

### 3. Get Disclosure

**Endpoint:** `GET /api/disclosure`

**Description:** Retrieves the disclosure message for popup

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "message_type": "disclosure",
    "content": "This website is for informational purposes only...",
    "is_active": true
  }
}
```

**Example (Frontend - Show on First Visit):**
```typescript
const hasSeenDisclosure = localStorage.getItem('hasSeenDisclosure');

if (!hasSeenDisclosure) {
  const response = await fetch(`${API_URL}/api/disclosure`);
  const { data } = await response.json();
  
  showDisclosurePopup(data.content);
  
  localStorage.setItem('hasSeenDisclosure', 'true');
}
```

---

### 4. Update Disclosure

**Endpoint:** `PUT /api/disclosure`

**Description:** Updates the disclosure content

**Request Body:**
```json
{
  "content": "Updated disclosure text...",
  "is_active": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Disclosure updated successfully",
  "data": {
    "message_type": "disclosure",
    "content": "Updated disclosure text..."
  }
}
```

---

### 5. Get ETFs (Updated with EOD timestamp)

**Endpoint:** `GET /api/etfs`

**Description:** Get all ETFs with "EOD" formatted last updated timestamp

**Response:**
```json
{
  "data": [ /* ETF array */ ],
  "count": 108,
  "last_updated": "EOD 11/19/2024"
}
```

**Example (Frontend):**
```typescript
const response = await fetch(`${API_URL}/api/etfs`);
const { data, count, last_updated } = await response.json();

console.log(`${count} ETFs - Last Updated: ${last_updated}`);
```

---

## Frontend Integration Examples

### Admin Message Component

```tsx
import { useState, useEffect } from 'react';

export function AdminMessage() {
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState('');

  useEffect(() => {
    fetchMessage();
  }, []);

  const fetchMessage = async () => {
    const res = await fetch(`${API_URL}/api/admin/message`);
    const { data } = await res.json();
    setMessage(data.content);
  };

  const saveMessage = async () => {
    await fetch(`${API_URL}/api/admin/message`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    setMessage(content);
    setEditing(false);
  };

  if (!message) return null;

  return (
    <div className="admin-message">
      {editing ? (
        <>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} />
          <button onClick={saveMessage}>Save</button>
          <button onClick={() => setEditing(false)}>Cancel</button>
        </>
      ) : (
        <>
          <p>{message}</p>
          <button onClick={() => { setContent(message); setEditing(true); }}>
            Edit
          </button>
        </>
      )}
    </div>
  );
}
```

### Disclosure Popup Component

```tsx
import { useState, useEffect } from 'react';

export function DisclosurePopup() {
  const [show, setShow] = useState(false);
  const [content, setContent] = useState('');

  useEffect(() => {
    const hasSeenDisclosure = localStorage.getItem('hasSeenDisclosure');
    
    if (!hasSeenDisclosure) {
      fetchDisclosure();
    }
  }, []);

  const fetchDisclosure = async () => {
    try {
      const res = await fetch(`${API_URL}/api/disclosure`);
      const { data } = await res.json();
      setContent(data.content);
      setShow(true);
    } catch (error) {
      console.error('Failed to fetch disclosure:', error);
    }
  };

  const handleAccept = () => {
    localStorage.setItem('hasSeenDisclosure', 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="disclosure-overlay">
      <div className="disclosure-modal">
        <h2>Important Disclosure</h2>
        <p>{content}</p>
        <button onClick={handleAccept}>I Understand</button>
      </div>
    </div>
  );
}
```

### Last Updated Display

```tsx
import { useState, useEffect } from 'react';

export function LastUpdated() {
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => {
    fetchETFs();
  }, []);

  const fetchETFs = async () => {
    const res = await fetch(`${API_URL}/api/etfs`);
    const { last_updated } = await res.json();
    setLastUpdated(last_updated);
  };

  return (
    <div className="last-updated">
      {lastUpdated && <span>Last Updated: {lastUpdated}</span>}
    </div>
  );
}
```

## CSS Example for Disclosure Popup

```css
.disclosure-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.disclosure-modal {
  background: white;
  padding: 32px;
  border-radius: 12px;
  max-width: 600px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.disclosure-modal h2 {
  margin-bottom: 16px;
  color: #333;
}

.disclosure-modal p {
  line-height: 1.6;
  margin-bottom: 24px;
  color: #666;
}

.disclosure-modal button {
  background: #2563eb;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
}

.disclosure-modal button:hover {
  background: #1d4ed8;
}
```

## Testing

### Test Admin Message
```bash
curl http://localhost:4000/api/admin/message

curl -X PUT http://localhost:4000/api/admin/message \
  -H "Content-Type: application/json" \
  -d '{"content":"Welcome! Special offer today","is_active":true}'
```

### Test Disclosure
```bash
curl http://localhost:4000/api/disclosure

curl -X PUT http://localhost:4000/api/disclosure \
  -H "Content-Type: application/json" \
  -d '{"content":"Updated disclosure message","is_active":true}'
```

### Test Last Updated
```bash
curl http://localhost:4000/api/etfs | jq '.last_updated'
```

## Notes

- Disclosure popup should show once per user (use localStorage)
- Admin message should be editable only by admins (add auth)
- Last updated timestamp is from most recent spreadsheet upload
- Format is "EOD MM/DD/YYYY" (e.g., "EOD 11/19/2024")
- All endpoints return JSON
- Use proper error handling in production

