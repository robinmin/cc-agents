---
name: browser-apis
description: "Guide to modern browser APIs: Fetch, LocalStorage, SessionStorage, Intersection Observer, Clipboard, History, and more."
see_also:
  - rd3:pl-javascript
---

# Browser APIs Reference

Guide to modern browser APIs for JavaScript applications.

## Table of Contents

- [Storage APIs](#storage-apis)
- [Fetch API](#fetch-api)
- [History API](#history-api)
- [Geolocation API](#geolocation-api)
- [Clipboard API](#clipboard-api)
- [Notifications API](#notifications-api)
- [Web Workers](#web-workers)

---

## Storage APIs

### Local Storage

```javascript
// Storing data
localStorage.setItem('key', 'value');
localStorage.setItem('user', JSON.stringify(user));

// Retrieving data
const value = localStorage.getItem('key');
const user = JSON.parse(localStorage.getItem('user'));

// Removing data
localStorage.removeItem('key');
localStorage.clear();

// Check availability
if (typeof Storage !== 'undefined') {
  // Storage is available
}

// Limitations: ~5-10MB, strings only
// Best for: simple preferences, non-sensitive data
```

### Session Storage

```javascript
// Same API as localStorage
sessionStorage.setItem('key', 'value');
const value = sessionStorage.getItem('key');
sessionStorage.removeItem('key');
sessionStorage.clear();

// Difference: cleared when tab/browser closes
// Best for: session-specific data, sensitive temporary data
```

### IndexedDB

```javascript
// Open database
const request = indexedDB.open('myDatabase', 1);

// Handle upgrades
request.onupgradeneeded = (event) => {
  const db = event.target.result;
  if (!db.objectStoreNames.contains('users')) {
    db.createObjectStore('users', { keyPath: 'id' });
  }
};

// Handle success
request.onsuccess = (event) => {
  const db = event.target.result;

  // Add data
  const tx = db.transaction('users', 'readwrite');
  tx.objectStore('users').add({ id: 1, name: 'Alice' });

  // Read data
  const getTx = db.transaction('users', 'readonly');
  const getRequest = getTx.objectStore('users').get(1);
  getRequest.onsuccess = () => console.log(getRequest.result);
};

// Best for: large datasets, complex queries, structured data
```

---

## Fetch API

### Basic GET

```javascript
async function get(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.json();
}
```

### POST Request

```javascript
async function post(url, data) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return await response.json();
}
```

### POST with FormData

```javascript
async function upload(url, file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });
  return await response.json();
}
```

### File Upload with Progress

```javascript
async function uploadWithProgress(url, file) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = (e.loaded / e.total) * 100;
        console.log(`Upload: ${percent.toFixed(2)}%`);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error')));

    xhr.open('POST', url);
    xhr.send(file);
  });
}
```

### Request with Timeout

```javascript
async function fetchWithTimeout(url, options = {}, timeout = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}
```

### AbortController for Cancellation

```javascript
const controller = new AbortController();

// Start fetch
const promise = fetch('/api/large-data', {
  signal: controller.signal
});

// Cancel after 5 seconds
setTimeout(() => controller.abort(), 5000);

try {
  const response = await promise;
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Fetch cancelled');
  }
}
```

---

## History API

```javascript
// Push state
history.pushState({ page: 1 }, '', '/page/1');

// Replace state
history.replaceState({ page: 2 }, '', '/page/2');

// Navigate
history.back();
history.forward();
history.go(-2);

// Listen for changes
window.addEventListener('popstate', (e) => {
  console.log('State:', e.state);
  console.log('URL:', location.href);
});
```

---

## Geolocation API

```javascript
// Get current position
navigator.geolocation.getCurrentPosition(
  (position) => {
    console.log('Lat:', position.coords.latitude);
    console.log('Lon:', position.coords.longitude);
    console.log('Accuracy:', position.coords.accuracy);
  },
  (error) => {
    console.error('Error:', error.message);
  },
  {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0
  }
);

// Watch position (continuous updates)
const watchId = navigator.geolocation.watchPosition(
  (position) => {
    console.log('Lat:', position.coords.latitude);
  },
  (error) => {
    console.error('Error:', error.message);
  }
);

// Stop watching
navigator.geolocation.clearWatch(watchId);
```

---

## Clipboard API

```javascript
// Copy text
await navigator.clipboard.writeText('Hello, world!');

// Read text
const text = await navigator.clipboard.readText();

// Check clipboard access
if (navigator.clipboard) {
  // Clipboard API available
}

// Fallback for older browsers
function copyToClipboardFallback(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}
```

---

## Notifications API

```javascript
// Check permission
if (Notification.permission === 'granted') {
  // Can notify
} else if (Notification.permission !== 'denied') {
  const permission = await Notification.requestPermission();
}

// Show notification
if (Notification.permission === 'granted') {
  const notification = new Notification('Title', {
    body: 'Notification body text',
    icon: '/icon.png',
    tag: 'unique-id',  // Prevents duplicate notifications
    requireInteraction: true  // Stays until dismissed
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}
```

---

## Web Workers

### Basic Worker

```javascript
// worker.js
self.addEventListener('message', (e) => {
  const result = heavyComputation(e.data);
  self.postMessage(result);
});

// main.js
const worker = new Worker('worker.js');

worker.postMessage({ data: myData });

worker.onmessage = (e) => {
  console.log('Result:', e.data);
};

worker.onerror = (error) => {
  console.error('Worker error:', error);
};

// Terminate worker
worker.terminate();
```

### Worker with Transfer

```javascript
// main.js
const buffer = new ArrayBuffer(1024 * 1024);  // 1MB
worker.postMessage({ buffer }, [buffer]);
// buffer is transferred, not copied

// worker.js
self.onmessage = (e) => {
  const view = new DataView(e.data.buffer);
  // Process buffer
};
```

### SharedWorker

```javascript
// shared-worker.js
const connections = new Set();

self.onconnect = (e) => {
  const port = e.ports[0];
  connections.add(port);

  port.onmessage = (e) => {
    // Broadcast to all connections
    connections.forEach(p => {
      if (p !== port) {
        p.postMessage(e.data);
      }
    });
  };

  port.start();
};
```

---

## Best Practices

### Performance

- Use appropriate storage based on data size
- Compress data before storing in localStorage
- Use IndexedDB for structured data
- Clear unused data from storage

### Security

- Never store sensitive data in localStorage/sessionStorage
- Validate all data from storage before use
- Sanitize data before displaying
- Use HTTPS for all fetch requests

### Error Handling

- Always handle storage quota exceeded errors
- Handle fetch errors gracefully
- Provide fallbacks for unsupported APIs
- Check API availability before use
