# 🔍 Findings — B.L.A.S.T. Project

> Research, discoveries, and constraints logged here.

---

## 2026-02-13 — Source Research

### Ben's Bites (`bensbites.com`)
- **Platform:** Substack (predictable HTML structure)
- **Archive:** `bensbites.com/archive` — lists all posts with titles, subtitles, and links
- **Post URLs:** Pattern: `bensbites.com/p/{slug}`
- **Frequency:** ~2x per week
- **Structure:** Posts have title, subtitle/description, sections (Quick Bites, Tools, Dev Dish)
- **Scraping:** No JS needed — static HTML with post links

### The AI Rundown (`therundown.ai`)
- **Platform:** Substack (same patterns as Ben's Bites)
- **Archive:** `therundown.ai/archive` — clean list with headlines + subtitles
- **Post URLs:** Pattern: `therundown.ai/p/{slug}`
- **Frequency:** Daily
- **Structure:** Main headline + "PLUS:" secondary story per issue
- **Author:** Zach Mink + team

### Reddit
- **Subreddits:** `r/artificial` (primary), `r/MachineLearning`, `r/ArtificialIntelligence`
- **API:** Public JSON endpoint: `/r/{subreddit}/new.json` (no auth required)
- **Data fields:** title, url, author, score, created_utc, permalink, selftext
- **Rate limits:** Public API — respectful polling (1 req/sec max)

### Constraints
- Both newsletters are Substack → consistent parsing via `BeautifulSoup4`
- Reddit JSON API is keyless → simplest integration
- 24h filter must use article publish date, not scrape time
