# Juejin API Research

## Research Date: 2026-02-02

## Summary

Juejin (稀土掘金) does not have an official public API for content publishing. However, internal API endpoints have been documented by the community through reverse engineering and network traffic analysis.

## Key Findings

### Official API Status

- **No Official Open Platform**: Juejin does not provide a public API documentation or developer portal for content publishing
- **Internal APIs**: Content creation and publishing use internal REST API endpoints
- **Authentication**: Cookie-based session authentication required

### Internal API Endpoints

Based on community research ([chenzijia12300/juejin-api](https://github.com/chenzijia12300/juejin-api)):

#### Article Draft Management

```
POST https://api.juejin.cn/content_api/v1/article_draft/create
Content-Type: application/json
Cookie: <session_cookie>

Request Body:
{
  "title": "文章标题",
  "content": "文章内容",
  "category": "前端",
  "tags": ["vue", "react"],
  "cover_image": "https://example.com/cover.png"
}
```

```
POST https://api.juejin.cn/content_api/v1/article_draft/update
Content-Type: application/json
Cookie: <session_cookie>

Request Body:
{
  "article_id": "7400000000000000000",
  "title": "更新的标题",
  "content": "更新的内容"
}
```

```
POST https://api.juejin.cn/content_api/v1/article_draft/
Content-Type: application/json
Cookie: <session_cookie>

Response:
{
  "data": {
    "drafts": [
      {
        "article_id": "7400000000000000000",
        "title": "草稿标题",
        "created_at": "1234567890"
      }
    ]
  }
}
```

#### Article Publishing

```
POST https://api.juejin.cn/content_api/v1/article/publish
Content-Type: application/json
Cookie: <session_cookie>

Request Body:
{
  "article_id": "7400000000000000000"
}
```

#### Category and Tag APIs

```
GET https://api.juejin.cn/content_api/v1/categories
Cookie: <session_cookie>

Response:
{
  "data": {
    "categories": [
      { "id": "6809637767543259168", "name": "后端" },
      { "id": "6809637769958768653", "name": "前端" },
      { "id": "6809637767037300752", "name": "Android" },
      { "id": "6809637759720599553", "name": "iOS" },
      { "id": "6809637727033307650", "name": "人工智能" },
      { "id": "6809637769877095977", "name": "开发工具" },
      { "id": "6809637770794494983", "name": "代码人生" },
      { "id": "6809637758488961059", "name": "阅读" }
    ]
  }
}
```

```
GET https://api.juejin.cn/content_api/v1/tag/suggest?keyword=vue
Cookie: <session_cookie>

Response:
{
  "data": {
    "tags": [
      { "id": "6809637774978168836", "name": "vue" },
      { "id": "6809637775168377857", "name": "vue.js" }
    ]
  }
}
```

## Authentication Flow

Juejin uses phone number + SMS verification code for authentication:

1. **Send SMS Code**:
   ```
   POST https://api.juejin.cn/captcha/send
   Content-Type: application/json

   Request Body:
   {
     "phone": "13800138000"
   }
   ```

2. **Login with SMS Code**:
   ```
   POST https://api.juejin.cn/captcha/login
   Content-Type: application/json

   Request Body:
   {
     "phone": "13800138000",
     "code": "123456"
   }

   Response:
   {
     "data": {
       "user_id": "1234567890",
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
     }
   }
   ```

3. **Session Management**:
   - Session cookies are stored after login
   - Subsequent API calls include these cookies
   - Cookie format: `sessionid=xxx; sessionid_sig=yyy`

## Editor Technology

Based on research:

- **Primary Editor**: Rich text editor with Markdown support
- **Editor Libraries**: Likely uses CodeMirror or similar
- **Editor URL**: `/post/create`, `/editor`, `/markdown-editor`
- **Content Format**: Markdown is supported and converted to rich text

## Rate Limiting

Based on community reports:

- **Publishing**: No official rate limit published
- **SMS Verification**: Limited to prevent abuse
- **Recommendation**: Wait 1-2 minutes between consecutive publishes

## Limitations

1. **No Official Documentation**: All API endpoints are reverse-engineered
2. **API Changes**: Internal APIs may change without notice
3. **Session Expiration**: Cookies expire and need re-authentication
4. **SMS Verification**: Automated login requires handling SMS codes

## Alternative: Browser Automation

Given the lack of official API, browser automation is the most reliable approach:

**Pros**:
- Works with actual DOM elements
- Less affected by API changes
- Can handle complex editor interactions

**Cons**:
- Slower than direct API calls
- Requires UI to be loaded
- More resource intensive

## References

- [juejin-api GitHub Repository](https://github.com/chenzijia12300/juejin-api) - Community API documentation
- [掘金自动发布文章的实现](https://juejin.cn/post/6980305681689640991) - Implementation guide
- [Puppeteer实战：教你如何自动在掘金上发布文章](https://juejin.cn/post/6844903961271468045) - Puppeteer tutorial
- [一键自动化博客发布工具(掘金篇)](https://developer.aliyun.com/article/1510701) - Aliyun article

## Conclusion

For reliable Juejin publishing automation:

1. **Browser Automation (Recommended)**: Use Chrome CDP for maximum compatibility
2. **Direct API (Experimental)**: Use internal APIs with caution - may break without notice
3. **Hybrid Approach**: Use browser automation for login, then extract session cookies for API calls
