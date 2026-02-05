# InfoQ API Research

## Why Browser Automation?

**InfoQ has NO official API** for content publishing. According to research:

- No official public API for article posting
- Internal API endpoints exist but are undocumented:
  - `/api/v1/auth/login` - Login endpoint
  - `/api/v1/article/list` - Article listing
  - `/submit/push` - Likely submission endpoint
- Authentication: Cookie-based with `SET-TICKET` header
- Platform: Vue.js 2.6.11 SPA (JavaScript-rendered)

## Internal API Discovery

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/api/v1/auth/login` | POST | Requires auth | Returns ticket for session |
| `/api/v1/article/list` | GET | Requires auth | Returns user articles |
| `/submit/push` | Unknown | Discovered | Likely submission endpoint |

**CORS Configuration:**
```
Access-Control-Allow-Origin: https://xie.infoq.cn
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: OPTIONS,GET,POST
Access-Control-Expose-Headers: SET-TICKET
```

**Authentication:** Cookie-based with `SET-TICKET` header for session tokens

## GitHub Automation Repositories

### Crawler Repositories Found

**1. youshoubianer/infoqCrawler** (Python)
- **Description:** InfoQ中文站爬虫
- **Stars:** 2 | **Forks:** 0
- **Language:** Python
- **URL:** https://github.com/youshoubianer/infoqCrawler
- **Files:** crawler.py, crawlerInfoq.py, crawlerSys.py
- **Approach:** BeautifulSoup-based HTML scraping
- **Categories:** news, articles, presentations, interviews, minibooks

**2. dunnice/infoq_weekly_crawler** (Python)
- **Description:** 自动抓取 InfoQ 周刊内容
- **Stars:** 0 | **Forks:** 0
- **Language:** Python
- **URL:** https://github.com/dunnice/infoq_weekly_crawler
- **Features:**
  - Selenium WebDriver for JS-rendered content
  - Markdown conversion for Obsidian
  - Image downloading
  - Scheduled tasks (launchd/cron)
  - Intelligent deduplication

**Code Pattern from infoq_weekly_crawler:**
```python
class InfoQWeeklyCrawler:
    BASE_URL = "https://www.infoq.cn"
    WEEKLY_LANDING_URL = "https://www.infoq.cn/weekly/landing"

    def _init_driver(self):
        chrome_options = Options()
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        # ... webdriver setup
```

## Technical Rationale

**Why Chrome CDP over alternatives:**

1. **Reliability**: Direct DOM manipulation vs API reverse-engineering
2. **Maintenance**: DOM selectors easier to update than API endpoints
3. **Authentication**: Cookie-based sessions work reliably with browser profiles
4. **SPA Support**: InfoQ is Vue.js-based, requires JavaScript rendering
5. **Future-proof**: If InfoQ releases official API, migration path remains clear

## Platform Technical Details

### URLs

| Purpose | URL |
|---------|-----|
| Editor Home | https://xie.infoq.cn |
| Login Page | https://xie.infoq.cn/auth/login |
| Article Creation | https://xie.infoq.cn/article/create |

### Technical Stack

- **Framework:** Vue.js 2.6.11
- **Build:** Webpack bundle
- **CDN:** geekbang.org (static001.geekbang.org)
- **Auth:** Cookie-based with SET-TICKET header
- **Third-party:** WeChat JSAPI, DingTalk JSAPI

### DOM Structure (JavaScript-Rendered)

**Key Finding:** The entire editor interface is JavaScript-rendered. Traditional form scraping methods will NOT work.

**Implications:**
- Must use browser automation (Selenium, Puppeteer, Playwright)
- Must wait for page load and element visibility
- Dynamic selectors require element reference strategy
- Vue.js reactivity requires proper event triggering

## Alternative Approaches

### Option A: Browser Automation (Recommended - Current Implementation)

**Tools:** Chrome CDP

**Workflow:**
```
1. Navigate to https://xie.infoq.cn/article/create
2. Wait for page load (Vue.js app mount)
3. Check login status (redirect to /auth/login if needed)
4. Fill article fields (title, content, category, tags)
5. Submit article
6. Verify success
```

**Pros:**
- Works with JS-rendered content
- Handles dynamic elements
- Can save session state for reuse
- Visual verification via screenshots
- No API reverse-engineering required

**Cons:**
- Requires browser overhead
- Slower than direct API
- UI changes may break selectors

### Option B: Reverse Engineer Internal API (Advanced)

**Tools:** Burp Suite, Wireshark, DevTools

**Workflow:**
```
1. Login to xie.infoq.cn manually
2. Open DevTools Network tab
3. Create article submission manually
4. Capture API requests/responses
5. Replicate with requests library
6. Handle CSRF tokens, cookies, session
```

**Pros:**
- Faster execution
- No browser overhead
- Can run headless

**Cons:**
- API is undocumented and may change
- Requires auth token handling
- Risk of being blocked if overused
- CSRF protection likely present

## Security Considerations

**Red Flags:**
- No rate limiting documentation discovered
- Session expiration unknown
- No API versioning documentation
- CSRF protection likely present

**Best Practices:**
- Respect site robots.txt
- Implement rate limiting in automation
- Use official submission channel when possible
- Don't spam submission endpoints
- Consider terms of service violations

## Sources

- InfoQ Contribution Guide: https://www.infoq.cn/article/2012/02/how-to-contribute
- InfoQ Editor: https://xie.infoq.cn
- infoqCrawler: https://github.com/youshoubianer/infoqCrawler
- infoq_weekly_crawler: https://github.com/dunnice/infoq_weekly_crawler
- CORS Analysis: curl tests to /api/v1/auth/login
