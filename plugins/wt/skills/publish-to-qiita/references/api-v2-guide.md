# Qiita API v2 Guide

Complete guide for using Qiita API v2 for programmatic article publishing.

## Overview

Qiita API v2 is a RESTful API that allows programmatic access to Qiita platform features including:
- Creating and updating articles
- Managing tags and organizations
- Accessing user and article data
- Searching and filtering content

## Authentication

### Access Token

1. Generate token at: https://qiita.com/settings/tokens/new
2. Required scopes:
   - `read_qiita` - Read user data
   - `write_qiita` - Write/publish articles

### Using the Token

Include token in Authorization header:

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## API Endpoints

### Create Article

**Endpoint**: `POST https://qiita.com/api/v2/items`

**Request Headers**:
```http
Content-Type: application/json
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Request Body**:
```json
{
  "title": "Example title",
  "body": "# Example\n\nThis is an example.",
  "tags": [
    {
      "name": "Ruby"
    }
  ],
  "private": false,
  "slide": false
}
```

**Response**:
```json
{
  "id": "c686397e4a0f4f11683d",
  "title": "Example title",
  "url": "https://qiita.com/Qiita/items/c686397e4a0f4f11683d",
  "rendered_body": "<h1>Example</h1>",
  "body": "# Example",
  "private": false,
  "slide": false,
  "tags": [
    {
      "name": "Ruby",
      "versions": []
    }
  ],
  "created_at": "2000-01-01T00:00:00+00:00",
  "updated_at": "2000-01-01T00:00:00+00:00",
  "user": {
    "id": "qiita",
    "name": "Qiita",
    "profile_image_url": "https://avatars.githubusercontent.com/u/115?v=4"
  }
}
```

### Update Article

**Endpoint**: `PATCH https://qiita.com/api/v2/items/:item_id`

**Request Body**: Same as create article

### Get Article

**Endpoint**: `GET https://qiita.com/api/v2/items/:item_id`

Returns article details including rendered HTML and markdown content.

### Delete Article

**Endpoint**: `DELETE https://qiita.com/api/v2/items/:item_id`

**Note**: Only works for articles you own.

### List User's Articles

**Endpoint**: `GET https://qiita.com/api/v2/authenticated_user/items?page=1&per_page=20`

**Query Parameters**:
- `page` - Page number (default: 1)
- `per_page` - Items per page (default: 20, max: 100)

### Get Tags

**Endpoint**: `GET https://qiita.com/api/v2/tags?page=1&per_page=20&sort=count`

**Query Parameters**:
- `page` - Page number
- `per_page` - Items per page
- `sort` - Sort order: `count` (default), `name`

## Request Payload Structure

### Required Fields

```json
{
  "title": "Article title",  // Required: string
  "body": "# Article content", // Required: string (markdown)
  "tags": [                  // Required: array
    { "name": "JavaScript" }   // Tag name
  ]
}
```

### Optional Fields

```json
{
  "private": false,                    // Default: false
  "slide": false,                      // Default: false
  "organization_url_name": "qiita-inc", // Organization
  "tweet": false,                       // Default: false
  "group_url_name": "dev"              // Qiita Team only
}
```

## Tag Format

### Simple Tag

```json
{
  "name": "JavaScript"
}
```

### Tag with Versions

```json
{
  "name": "React",
  "versions": ["18.0.0", "18.1.0"]
}
```

## Response Format

### Success Response

```json
{
  "id": "c686397e4a0f4f11683d",
  "title": "Example title",
  "url": "https://qiita.com/username/items/c686397e4a0f4f11683d",
  "rendered_body": "<h1>Example</h1>\n...",
  "body": "# Example",
  "coediting": false,
  "comments_count": 0,
  "likes_count": 0,
  "reactions_count": 0,
  "stocks_count": 0,
  "private": false,
  "slide": false,
  "tags": [
    {
      "name": "Ruby",
      "versions": []
    }
  ],
  "created_at": "2000-01-01T00:00:00+00:00",
  "updated_at": "2000-01-01T00:00:00+00:00",
  "user": {
    "id": "qiita",
    "name": "Qiita",
    "profile_image_url": "https://..."
  }
}
```

### Error Response

```json
{
  "type": "error",
  "message": "Forbidden"
}
```

## HTTP Status Codes

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Too Many Requests |

## Rate Limits

### Authenticated Requests

- **Limit**: 1000 requests per hour
- **Reset**: Hourly

### Unauthenticated Requests

- **Limit**: 60 requests per hour per IP
- **Reset**: Hourly

Rate limit information is included in response headers:

```http
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1609459200
```

## Examples

### Using curl

```bash
# Create article
curl -X POST https://qiita.com/api/v2/items \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First Article",
    "body": "# Hello\n\nThis is my first article.",
    "tags": [{"name": "Python"}],
    "private": false
  }'
```

### Using JavaScript (fetch)

```javascript
const token = 'YOUR_ACCESS_TOKEN';
const payload = {
  title: 'My Article',
  body: '# Hello\n\nContent here...',
  tags: [{ name: 'JavaScript' }],
  private: false
};

fetch('https://qiita.com/api/v2/items', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
})
  .then(res => res.json())
  .then(data => console.log(data.url));
```

### Using Python (requests)

```python
import requests

token = 'YOUR_ACCESS_TOKEN'
headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

payload = {
    'title': 'My Article',
    'body': '# Hello\n\nContent here...',
    'tags': [{'name': 'Python'}],
    'private': False
}

response = requests.post(
    'https://qiita.com/api/v2/items',
    headers=headers,
    json=payload
)

print(f"URL: {response.json()['url']}")
```

### Using TypeScript

```typescript
interface QiitaTag {
  name: string;
  versions?: string[];
}

interface QiitaArticle {
  title: string;
  body: string;
  tags: QiitaTag[];
  private?: boolean;
  slide?: boolean;
}

async function publishArticle(article: QiitaArticle, token: string): Promise<string> {
  const response = await fetch('https://qiita.com/api/v2/items', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(article)
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  return data.url;
}

// Usage
const article: QiitaArticle = {
  title: 'My Article',
  body: '# Hello\n\nContent here...',
  tags: [{ name: 'TypeScript' }],
  private: false
};

publishArticle(article, 'YOUR_TOKEN')
  .then(url => console.log('Published:', url))
  .catch(err => console.error('Error:', err));
```

## Error Handling

### Common Errors

#### 401 Unauthorized

**Cause**: Invalid or missing token

**Solution**: Check token is correct and has required scopes

#### 400 Bad Request

**Cause**: Missing required fields or invalid data

**Solution**: Verify request payload has `title`, `body`, and `tags`

#### 403 Forbidden

**Cause**: Token lacks required permissions

**Solution**: Ensure token has `write_qiita` scope

#### 429 Too Many Requests

**Cause**: Rate limit exceeded

**Solution**: Wait for rate limit reset (check `X-RateLimit-Reset` header)

## Best Practices

1. **Secure Token Storage**
   - Never commit tokens to version control
   - Use environment variables
   - Rotate tokens periodically

2. **Error Handling**
   - Always check response status
   - Handle rate limit errors gracefully
   - Implement retry logic with exponential backoff

3. **Request Validation**
   - Validate required fields before sending
   - Escape markdown content properly
   - Check tag names are valid

4. **Rate Limit Awareness**
   - Monitor remaining requests in headers
   - Implement request queuing if needed
   - Cache responses where appropriate

## Testing

### Test Token

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://qiita.com/api/v2/authenticated_user
```

### Test Create Article

```bash
curl -X POST https://qiita.com/api/v2/items \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Article",
    "body": "# Test\n\nThis is a test.",
    "tags": [{"name": "test"}],
    "private": true
  }'
```

## See Also

- [Qiita CLI Guide](qiita-cli-guide.md)
- [Token Setup Guide](token-setup.md)
- [Official Qiita API Documentation](https://qiita.com/api/v2/docs)
- [GitHub Repository: increments/qiita-cli](https://github.com/increments/qiita-cli)
