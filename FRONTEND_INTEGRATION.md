# Frontend Integration Guide

## Quick Reference

### API Endpoint

```
POST http://localhost:4000/api/admin/upload-dtr
```

### Request Format

```typescript
const formData = new FormData();
formData.append("file", uploadFile); // File from <input type="file">

fetch("http://localhost:4000/api/admin/upload-dtr", {
  method: "POST",
  body: formData,
  // Don't set Content-Type header - browser sets it automatically with boundary
});
```

### Success Response

```typescript
{
  success: true,
  count: 45,
  message: "Successfully processed 45 ETFs"
}
```

### Error Response

```typescript
{
  error: "Error message",
  details?: "Additional details"
}
```

## Complete Frontend Implementation

### React/TypeScript Example

```typescript
import React, { useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export function ETFUploadComponent() {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      setError("Please select a file");
      return;
    }

    // Validate file type
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setError("Please upload an Excel file (.xlsx or .xls)");
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return;
    }

    setUploading(true);
    setMessage(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE_URL}/api/admin/upload-dtr`, {
        method: "POST",
        body: formData,
        // Add authentication if needed:
        // headers: {
        //   'Authorization': `Bearer ${userToken}`
        // }
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setMessage(result.message);
        // Refresh your ETF data/charts here
        await refreshETFData();
      } else {
        setError(result.error || "Upload failed");
        console.error("Upload error:", result);
      }
    } catch (err) {
      setError("Failed to upload file. Please check your connection.");
      console.error("Upload exception:", err);
    } finally {
      setUploading(false);
      // Clear the input so user can upload same file again
      event.target.value = "";
    }
  };

  const refreshETFData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/etfs`);
      const data = await response.json();
      // Update your state/store with new data
      console.log(`Loaded ${data.count} ETFs`);
    } catch (err) {
      console.error("Failed to refresh data:", err);
    }
  };

  return (
    <div className="etf-upload">
      <label htmlFor="file-upload" className="upload-label">
        {uploading ? "Uploading..." : "Upload Excel File"}
      </label>

      <input
        id="file-upload"
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileUpload}
        disabled={uploading}
      />

      {uploading && (
        <div className="upload-progress">
          <div className="spinner" />
          <p>Processing Excel file...</p>
        </div>
      )}

      {message && <div className="success-message">✓ {message}</div>}

      {error && <div className="error-message">✗ {error}</div>}
    </div>
  );
}
```

### Plain JavaScript Example

```javascript
async function uploadETFFile(fileInput) {
  const file = fileInput.files[0];

  if (!file) {
    alert('Please select a file');
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('http://localhost:4000/api/admin/upload-dtr', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (response.ok && result.success) {
      alert(`Success! ${result.message}`);
      // Refresh your charts/data
      loadETFData();
    } else {
      alert(`Error: ${result.error}`);
    }
  } catch (error) {
    alert('Upload failed. Please try again.');
    console.error(error);
  }
}

// HTML
<input type="file" id="etfFile" accept=".xlsx,.xls" />
<button onclick="uploadETFFile(document.getElementById('etfFile'))">
  Upload
</button>
```

### Vue.js Example

```vue
<template>
  <div class="etf-upload">
    <input
      type="file"
      accept=".xlsx,.xls"
      @change="handleUpload"
      :disabled="uploading"
      ref="fileInput"
    />

    <button @click="$refs.fileInput.click()" :disabled="uploading">
      {{ uploading ? "Uploading..." : "Upload ETF Data" }}
    </button>

    <div v-if="message" class="success">{{ message }}</div>
    <div v-if="error" class="error">{{ error }}</div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      uploading: false,
      message: null,
      error: null,
      apiUrl: import.meta.env.VITE_API_URL || "http://localhost:4000",
    };
  },
  methods: {
    async handleUpload(event) {
      const file = event.target.files[0];
      if (!file) return;

      this.uploading = true;
      this.message = null;
      this.error = null;

      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch(`${this.apiUrl}/api/admin/upload-dtr`, {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (response.ok && result.success) {
          this.message = result.message;
          this.$emit("upload-success", result);
          await this.refreshData();
        } else {
          this.error = result.error;
        }
      } catch (err) {
        this.error = "Upload failed";
        console.error(err);
      } finally {
        this.uploading = false;
        this.$refs.fileInput.value = "";
      }
    },
    async refreshData() {
      const response = await fetch(`${this.apiUrl}/api/etfs`);
      const data = await response.json();
      this.$emit("data-refreshed", data);
    },
  },
};
</script>
```

## Error Handling

### All Possible Error Responses

```typescript
type ErrorResponse =
  | { error: "No file uploaded" }
  | { error: "Excel file is empty" }
  | {
      error: "No valid ETF data found. Make sure SYMBOL column exists and has values.";
    }
  | { error: "Failed to save data to database"; details: string }
  | { error: "Failed to process Excel file"; details: string };
```

### Recommended Error Messages to User

```typescript
function getUserFriendlyError(error: string): string {
  if (error.includes("No file")) {
    return "Please select an Excel file to upload.";
  }
  if (error.includes("empty")) {
    return "The Excel file is empty. Please add data and try again.";
  }
  if (error.includes("SYMBOL")) {
    return "Excel file must have a SYMBOL column with ticker symbols.";
  }
  if (error.includes("database")) {
    return "Database error. Please contact support.";
  }
  return "Failed to upload file. Please try again.";
}
```

## Refreshing Charts After Upload

### Option 1: Immediate Refresh

```typescript
async function uploadAndRefresh(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const uploadResponse = await fetch(`${API_URL}/api/admin/upload-dtr`, {
    method: "POST",
    body: formData,
  });

  const uploadResult = await uploadResponse.json();

  if (uploadResponse.ok && uploadResult.success) {
    // Fetch updated ETF data
    const etfsResponse = await fetch(`${API_URL}/api/etfs`);
    const etfsData = await etfsResponse.json();

    // Update your state/store
    updateETFData(etfsData.data);

    // Show success message
    showNotification(uploadResult.message);
  }
}
```

### Option 2: Optimistic Update

```typescript
async function uploadAndOptimisticRefresh(file: File) {
  // Show loading state immediately
  setLoading(true);

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch(`${API_URL}/api/admin/upload-dtr`, {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (response.ok && result.success) {
      // Trigger a background refresh
      refreshETFData();

      // Show success immediately
      showNotification(result.message);
    } else {
      showError(result.error);
    }
  } finally {
    setLoading(false);
  }
}
```

### Option 3: Event-Based Refresh

```typescript
// Create an event emitter or use your state management
import { EventEmitter } from "events";
const uploadEvents = new EventEmitter();

// In your upload component
async function handleUpload(file: File) {
  // ... upload logic ...

  if (result.success) {
    uploadEvents.emit("etf-data-updated", { count: result.count });
  }
}

// In your chart components
useEffect(() => {
  const handleUpdate = () => {
    fetchETFData(); // Refresh chart data
  };

  uploadEvents.on("etf-data-updated", handleUpdate);

  return () => {
    uploadEvents.off("etf-data-updated", handleUpdate);
  };
}, []);
```

## Testing the Integration

### Test Checklist

- [ ] File upload with valid Excel file succeeds
- [ ] Success message displays with correct count
- [ ] Charts/data refresh after successful upload
- [ ] Error message displays for invalid file type
- [ ] Error message displays for empty file
- [ ] Error message displays for missing SYMBOL column
- [ ] Loading state shows during upload
- [ ] Can upload same file twice (input clears)
- [ ] File size validation (max 10MB)
- [ ] Network error handling

### Test Script

```bash
# Terminal 1: Start backend
cd yield-ranker-server
npm start

# Terminal 2: Start frontend
cd your-frontend
npm run dev

# Test Steps:
# 1. Open http://localhost:5173 (or your frontend URL)
# 2. Navigate to admin panel
# 3. Click "Upload Excel"
# 4. Select a valid .xlsx file
# 5. Verify success message appears
# 6. Verify charts update with new data
# 7. Check browser console for any errors
```

## Environment Variables

### Frontend .env

```env
VITE_API_URL=http://localhost:4000
```

### Production .env

```env
VITE_API_URL=https://your-backend.railway.app
```

## CORS Configuration

The backend already has CORS enabled for all origins in development. For production, you may want to restrict it:

```javascript
// In your backend index.js
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
```

## Authentication (Optional)

If you want to add authentication to the upload endpoint:

### Backend

```javascript
const authenticateAdmin = (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

app.post(
  "/api/admin/upload-dtr",
  authenticateAdmin,
  upload.single("file"),
  async (req, res) => {
    // ... existing code
  }
);
```

### Frontend

```typescript
const response = await fetch(`${API_URL}/api/admin/upload-dtr`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${adminToken}`,
  },
  body: formData,
});
```

## Performance Optimization

### Large Files (500+ rows)

```typescript
async function uploadLargeFile(file: File) {
  // Show processing message
  setMessage("Processing large file... This may take a minute.");

  // Set longer timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

  try {
    const response = await fetch(`${API_URL}/api/admin/upload-dtr`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // ... handle response
  } catch (err) {
    if (err.name === "AbortError") {
      setError("Upload timed out. File may be too large.");
    }
  }
}
```

## Troubleshooting

### Issue: "CORS error"

**Solution:**

- Verify backend is running
- Check VITE_API_URL is correct
- Ensure backend has CORS enabled

### Issue: "Network request failed"

**Solution:**

- Check backend server is running on correct port
- Verify API_URL in frontend
- Check browser console for details

### Issue: "Success but charts don't update"

**Solution:**

- Ensure you're calling refresh function after success
- Check fetch('/api/etfs') is using correct URL
- Verify state management is updating correctly

### Issue: "File uploads but shows 0 ETFs"

**Solution:**

- Check Excel file has SYMBOL column
- Verify SYMBOL column has values
- Check backend logs for parsing errors

## Summary

✅ Use FormData to send file
✅ Don't set Content-Type header manually
✅ Handle success response with `result.success` check
✅ Refresh data after successful upload
✅ Show user-friendly error messages
✅ Clear file input after upload
✅ Add loading state during upload
✅ Validate file type and size on frontend

The backend is production-ready and will automatically:

- Parse Excel files
- Validate data
- Update database
- Return proper responses
- Handle errors gracefully

Your frontend just needs to send the file and handle the response!


