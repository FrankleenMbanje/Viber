# Scraping SOP — Architecture Layer 1

## Goal
Scrape the latest AI news articles from 3 sources and output a unified JSON feed matching the Article Schema in `gemini.md`.

---

## Sources & Endpoints

| Source | Endpoint | Method |
|---|---|---|
| Ben's Bites | `https://bensbites.com/archive` | HTTP GET → parse HTML |
| The AI Rundown | `https://www.therundown.ai/archive` | HTTP GET → parse HTML |
| Reddit | `https://www.reddit.com/r/artificial/new.json?limit=25` | HTTP GET → parse JSON |

---

## Input
- None (all sources are public, no auth required)
- Reddit requires a descriptive `User-Agent` header

## Output
Each scraper returns a JSON array of objects matching:
```json
{
  "id": "sha256(url)[:16]",
  "title": "string",
  "subtitle": "string|null",
  "url": "string",
  "source": "bens-bites|ai-rundown|reddit",
  "sourceName": "Ben's Bites|The AI Rundown|Reddit",
  "publishedAt": "ISO 8601",
  "scrapedAt": "ISO 8601",
  "summary": "string|null",
  "imageUrl": "string|null",
  "author": "string|null",
  "tags": [],
  "isSaved": false,
  "isNew": true
}
```

---

## Scraping Rules

1. **Respectful scraping** — 1 second delay between HTTP requests
2. **User-Agent** — Always identify as: `AntigravityBot/1.0 (AI News Dashboard)`
3. **Timeout** — 10 second timeout per request, fail gracefully
4. **24h filter** — Only return articles published within the last 24 hours
5. **Deduplication** — `id = sha256(url)[:16]` ensures no duplicates
6. **Error handling** — On failure, return `{"articles": [], "errors": ["description"]}` — never crash

## Edge Cases

| Case | Behavior |
|---|---|
| Network timeout | Return empty articles + error message |
| Source returns 403/429 | Log error, return cached data if available |
| No articles in 24h | Return empty array (valid state) |
| Malformed HTML | Skip unparseable entries, log warning |
| Duplicate articles across sources | Handled by aggregator via URL hash |

## Rate Limits
- Ben's Bites: 1 req to archive page + 1 req per article (max ~5)
- AI Rundown: 1 req to archive page + 1 req per article (max ~3)
- Reddit: 1 req total (JSON endpoint returns 25 posts)

## Testing
- Each scraper must be independently runnable: `python tools/scrape_<source>.py`
- Output must be valid JSON, parseable by `json.loads()`
- Scraper must complete in < 30 seconds
