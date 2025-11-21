# Frontend Guide: Displaying Last Updated Date & Time

## 📋 API Response Format

When you call `GET /api/etfs`, the response includes:

```json
{
  "data": [ /* ETF array */ ],
  "count": 107,
  "last_updated": "EOD 11/19/2024",
  "last_updated_timestamp": "2024-11-19T16:30:00.000Z"
}
```

### Fields Explained:

- **`last_updated`**: Pre-formatted string like `"EOD 11/19/2024"` (ready to display)
- **`last_updated_timestamp`**: ISO 8601 timestamp for custom formatting (e.g., `"2024-11-19T16:30:00.000Z"`)

---

## 🎯 How to Use in Frontend

### Option 1: Use Pre-formatted String (Easiest)

```typescript
// In your Dashboard or Header component
const [lastUpdated, setLastUpdated] = useState<string | null>(null);

useEffect(() => {
  const fetchETFs = async () => {
    const response = await fetch(`${API_URL}/api/etfs`);
    const result = await response.json();
    
    setLastUpdated(result.last_updated); // "EOD 11/19/2024"
  };
  
  fetchETFs();
}, []);

// Display it
{lastUpdated && (
  <div className="text-sm text-muted-foreground">
    Last Updated: {lastUpdated}
  </div>
)}
```

**Output:** `Last Updated: EOD 11/19/2024`

---

### Option 2: Custom Format with Timestamp (More Control)

```typescript
const [lastUpdated, setLastUpdated] = useState<string | null>(null);

useEffect(() => {
  const fetchETFs = async () => {
    const response = await fetch(`${API_URL}/api/etfs`);
    const result = await response.json();
    
    if (result.last_updated_timestamp) {
      const date = new Date(result.last_updated_timestamp);
      
      // Format: "Nov 19, 2024 at 4:30 PM"
      const formatted = date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      setLastUpdated(`EOD ${formatted}`);
    }
  };
  
  fetchETFs();
}, []);

// Display
{lastUpdated && (
  <div>Last Updated: {lastUpdated}</div>
)}
```

**Output:** `Last Updated: EOD Nov 19, 2024 at 4:30 PM`

---

### Option 3: Multiple Format Options

```typescript
// Helper function for formatting
const formatLastUpdated = (timestamp: string | null, format: 'short' | 'long' | 'relative' = 'short') => {
  if (!timestamp) return null;
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  switch (format) {
    case 'short':
      // "EOD 11/19/2024"
      return `EOD ${date.toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric'
      })}`;
    
    case 'long':
      // "EOD November 19, 2024 at 4:30 PM"
      return `EOD ${date.toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })}`;
    
    case 'relative':
      // "EOD 2 days ago" or "EOD Today"
      if (diffDays === 0) return 'EOD Today';
      if (diffDays === 1) return 'EOD Yesterday';
      if (diffDays < 7) return `EOD ${diffDays} days ago`;
      return `EOD ${date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })}`;
    
    default:
      return null;
  }
};

// Usage
const response = await fetch(`${API_URL}/api/etfs`);
const result = await response.json();

const shortFormat = formatLastUpdated(result.last_updated_timestamp, 'short');
const longFormat = formatLastUpdated(result.last_updated_timestamp, 'long');
const relativeFormat = formatLastUpdated(result.last_updated_timestamp, 'relative');
```

---

## 📍 Where to Display

### 1. Dashboard Header (Recommended)

```tsx
// Dashboard.tsx
export function Dashboard() {
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  
  useEffect(() => {
    const loadData = async () => {
      const response = await fetch(`${API_URL}/api/etfs`);
      const result = await response.json();
      setLastUpdated(result.last_updated);
    };
    loadData();
  }, []);
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1>ETF Dashboard</h1>
        {lastUpdated && (
          <div className="text-sm text-muted-foreground">
            Last Updated: {lastUpdated}
          </div>
        )}
      </div>
      {/* ... rest of dashboard */}
    </div>
  );
}
```

### 2. Table Header

```tsx
// ETFTable.tsx
<div className="flex justify-between items-center mb-4">
  <h2>ETF Rankings</h2>
  {lastUpdated && (
    <span className="text-xs text-muted-foreground">
      Data as of {lastUpdated}
    </span>
  )}
</div>
```

### 3. Footer

```tsx
// Footer.tsx
<footer className="text-center text-sm text-muted-foreground py-4">
  {lastUpdated && (
    <p>Last data update: {lastUpdated}</p>
  )}
</footer>
```

### 4. Tooltip/Info Badge

```tsx
// Info badge next to title
<div className="flex items-center gap-2">
  <h1>ETF Rankings</h1>
  {lastUpdated && (
    <Tooltip>
      <TooltipTrigger>
        <Info className="h-4 w-4 text-muted-foreground" />
      </TooltipTrigger>
      <TooltipContent>
        <p>Data last updated: {lastUpdated}</p>
      </TooltipContent>
    </Tooltip>
  )}
</div>
```

---

## 🎨 Styling Examples

### Minimal (Muted Text)

```tsx
<div className="text-sm text-muted-foreground">
  Last Updated: {lastUpdated}
</div>
```

### Badge Style

```tsx
<div className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-muted-foreground text-xs">
  <Clock className="h-3 w-3 mr-1" />
  {lastUpdated}
</div>
```

### With Icon

```tsx
<div className="flex items-center gap-2 text-sm text-muted-foreground">
  <Calendar className="h-4 w-4" />
  <span>Last Updated: {lastUpdated}</span>
</div>
```

---

## 🔄 Auto-Refresh Example

If you want to update the timestamp when data refreshes:

```typescript
const [lastUpdated, setLastUpdated] = useState<string | null>(null);

useEffect(() => {
  const fetchData = async () => {
    const response = await fetch(`${API_URL}/api/etfs`);
    const result = await response.json();
    setLastUpdated(result.last_updated);
    // Also update your ETF data...
  };
  
  fetchData();
  
  // Refresh every 5 minutes
  const interval = setInterval(fetchData, 5 * 60 * 1000);
  return () => clearInterval(interval);
}, []);
```

---

## 📝 Complete React Component Example

```tsx
import { useState, useEffect } from 'react';
import { Calendar, Clock } from 'lucide-react';

interface LastUpdatedProps {
  apiUrl?: string;
  format?: 'short' | 'long' | 'relative';
  showIcon?: boolean;
  className?: string;
}

export function LastUpdated({ 
  apiUrl = '/api/etfs',
  format = 'short',
  showIcon = true,
  className = ''
}: LastUpdatedProps) {
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchLastUpdated = async () => {
      try {
        const response = await fetch(apiUrl);
        const result = await response.json();
        
        if (result.last_updated_timestamp) {
          const formatted = formatLastUpdated(result.last_updated_timestamp, format);
          setLastUpdated(formatted);
        } else if (result.last_updated) {
          setLastUpdated(result.last_updated);
        }
      } catch (error) {
        console.error('Failed to fetch last updated:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLastUpdated();
  }, [apiUrl, format]);
  
  if (loading || !lastUpdated) return null;
  
  return (
    <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
      {showIcon && <Calendar className="h-4 w-4" />}
      <span>Last Updated: {lastUpdated}</span>
    </div>
  );
}

// Usage
<LastUpdated format="short" />
<LastUpdated format="long" showIcon={false} />
<LastUpdated format="relative" className="text-xs" />
```

---

## ✅ Quick Reference

### API Response:
```json
{
  "last_updated": "EOD 11/19/2024",
  "last_updated_timestamp": "2024-11-19T16:30:00.000Z"
}
```

### Simple Display:
```tsx
{result.last_updated && <div>Last Updated: {result.last_updated}</div>}
```

### Custom Format:
```tsx
const date = new Date(result.last_updated_timestamp);
const formatted = date.toLocaleString('en-US', { /* options */ });
```

---

## 🎯 Recommended Implementation

**For most use cases, use the pre-formatted string:**

```typescript
const response = await fetch('/api/etfs');
const { last_updated } = await response.json();

// Display it
{last_updated && (
  <div className="text-sm text-muted-foreground">
    Last Updated: {last_updated}
  </div>
)}
```

**That's it!** The backend already formats it as `"EOD MM/DD/YYYY"` so you can display it directly.

---

## 📞 Need Help?

- **Pre-formatted string**: Use `result.last_updated` directly
- **Custom formatting**: Use `result.last_updated_timestamp` with `new Date()`
- **Multiple formats**: Use the helper function examples above

The backend is ready - just fetch and display! 🚀

