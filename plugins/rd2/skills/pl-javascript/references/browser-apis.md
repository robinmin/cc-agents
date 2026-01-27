# Browser APIs Reference

Complete guide to modern browser APIs.

## Table of Contents

- [Storage APIs](#storage-apis)
- [Fetch API](#fetch-api)
- [History API](#history-api)
- [Geolocation API](#geolocation-api)
- [Clipboard API](#clipboard-api)
- [Notifications API](#notifications-api)
- [Web Workers](#web-workers)
- [Service Workers](#service-workers)

---

## Storage APIs

### Local Storage

```javascript
// Store data
localStorage.setItem('key', 'value');
localStorage.setItem('user', JSON.stringify({ name: 'Alice' }));

// Retrieve data
const value = localStorage.getItem('key');
const user = JSON.parse(localStorage.getItem('user'));

// Remove data
localStorage.removeItem('key');

// Clear all
localStorage.clear();

// Check availability
if (typeof Storage !== 'undefined') {
  // Storage available
}
```

### Session Storage

```javascript
// Same API as localStorage
sessionStorage.setItem('key', 'value');
const value = sessionStorage.getItem('key');
```

### IndexedDB

```javascript
// Open database
const request = indexedDB.open('MyDatabase', 1);

request.onupgradeneeded = (e) => {
  const db = e.target.result;
  const store = db.createObjectStore('users', { keyPath: 'id' });
};

request.onsuccess = (e) => {
  const db = e.target.result;

  // Add data
  const transaction = db.transaction(['users'], 'readwrite');
  const store = transaction.objectStore('users');
  store.add({ id: 1, name: 'Alice' });

  // Get data
  const getRequest = store.get(1);
  getRequest.onsuccess = () => {
    console.log(getRequest.result);
  };
};
```

---

## Fetch API

### GET Request

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

### Request with Headers

```javascript
async function authenticatedRequest(url, token) {
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });
  return await response.json();
}
```

### Abort Controller

```javascript
async function fetchWithTimeout(url, timeout = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal
    });
    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
```

---

## History API

### Navigation

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
});
```

---

## Geolocation API

### Get Current Position

```javascript
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
```

### Watch Position

```javascript
const watchId = navigator.geolocation.watchPosition(
  (position) => {
    console.log('Updated position:', position.coords);
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

### Copy Text

```javascript
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    console.log('Text copied');
  } catch (error) {
    console.error('Failed to copy:', error);
  }
}
```

### Read Text

```javascript
async function readText() {
  try {
    const text = await navigator.clipboard.readText();
    console.log('Clipboard content:', text);
    return text;
  } catch (error) {
    console.error('Failed to read:', error);
  }
}
```

### Check Permissions

```javascript
async function checkClipboardPermission() {
  const permission = await navigator.permissions.query({
  name: 'clipboard-read'
});
  console.log('Permission state:', permission.state);
}
```

---

## Notifications API

### Request Permission

```javascript
Notification.requestPermission().then(permission => {
  if (permission === 'granted') {
    showNotification();
  }
});
```

### Show Notification

```javascript
function showNotification() {
  const notification = new Notification('Title', {
    body: 'Notification body',
    icon: '/icon.png',
    badge: '/badge.png',
    tag: 'unique-id',
    data: { someData: 'value' }
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}
```

---

## Web Workers

### Create Worker

```javascript
// Main thread
const worker = new Worker('worker.js');

worker.postMessage({ data: largeDataSet });

worker.onmessage = (e) => {
  console.log('Result:', e.data);
};

worker.onerror = (e) => {
  console.error('Worker error:', e.message);
};
```

### Worker Script

```javascript
// worker.js
self.onmessage = (e) => {
  const result = heavyComputation(e.data);
  self.postMessage(result);
};

function heavyComputation(data) {
  // CPU-intensive work
  return result;
}
```

---

## Service Workers

### Register Service Worker

```javascript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(reg => console.log('SW registered:', reg))
    .catch(err => console.error('SW registration failed:', err));
}
```

### Service Worker Script

```javascript
// sw.js
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('v1').then(cache => {
      return cache.addAll([
        '/',
        '/styles.css',
        '/script.js'
      ]);
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(response => {
      return response || fetch(e.request);
    })
  );
});
```

---

## Best Practices

### Feature Detection

```javascript
// Check for API availability
if ('localStorage' in window) {
  // Use localStorage
}

if ('geolocation' in navigator) {
  // Use geolocation
}

if ('Notification' in window) {
  // Use notifications
}
```

### Error Handling

```javascript
// Always handle API errors
try {
  await navigator.clipboard.writeText(text);
} catch (error) {
  console.error('Clipboard error:', error);
  // Fallback behavior
}
```

### Permissions

```javascript
// Request permissions with user interaction
document.addEventListener('click', async () => {
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    showNotification();
  }
});
```
