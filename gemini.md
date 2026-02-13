# 🧭 gemini.md — Project Constitution

> **This file is law.** All data schemas, behavioral rules, and architectural invariants live here.  
> Only updated when: a schema changes, a rule is added, or architecture is modified.

---

## Project: AI News Aggregation Dashboard

**North Star:** A beautiful, interactive web dashboard that aggregates the latest AI news from curated newsletters and Reddit, refreshes every 24 hours, and allows users to save articles persistently.

---

## Data Schemas

### Article Schema (Core Entity)
```json
{
  "id": "string (UUID or hash of URL)",
  "title": "string",
  "subtitle": "string | null",
  "url": "string (original article URL)",
  "source": "bens-bites | ai-rundown | reddit",
  "sourceName": "string (display name: 'Ben's Bites', 'The AI Rundown', 'Reddit')",
  "publishedAt": "string (ISO 8601 datetime)",
  "scrapedAt": "string (ISO 8601 datetime)",
  "summary": "string | null (article excerpt or description)",
  "imageUrl": "string | null",
  "author": "string | null",
  "tags": ["string"],
  "isSaved": false,
  "isNew": true
}
```

### Saved Article Schema (Persisted in localStorage → later Supabase)
```json
{
  "articleId": "string (references Article.id)",
  "savedAt": "string (ISO 8601 datetime)"
}
```

### Scraper Response Schema (Raw Input)
```json
{
  "source": "string",
  "scrapedAt": "string (ISO 8601 datetime)",
  "articles": ["Article[]"],
  "errors": ["string[] | null"]
}
```

### Dashboard State Schema
```json
{
  "articles": ["Article[]"],
  "savedArticles": ["SavedArticle[]"],
  "lastRefreshed": "string (ISO 8601 datetime)",
  "activeFilter": "all | bens-bites | ai-rundown | reddit | saved",
  "searchQuery": "string",
  "isLoading": false
}
```

---

## Source Registry

| Source | URL | Type | Scraping Method |
|---|---|---|---|
| Ben's Bites | `bensbites.com/archive` | Substack newsletter | HTTP scrape archive page → extract post URLs and titles |
| The AI Rundown | `therundown.ai/archive` | Substack newsletter | HTTP scrape archive page → extract post URLs and titles |
| Reddit | `reddit.com/r/artificial` | Forum | Public JSON API (`/r/artificial/new.json`) |

---

## Behavioral Rules

1. **24-hour freshness:** Only display articles from the last 24 hours. Stale articles are hidden (not deleted).
2. **No data loss:** Saved articles persist across refreshes (localStorage now, Supabase later).
3. **Graceful degradation:** If a scraper fails, show cached data with an error indicator — never a blank dashboard.
4. **No duplicates:** Articles are deduplicated by URL hash before display.
5. **Beautiful by default:** The UI must be visually stunning — dark theme, glassmorphism, smooth animations, premium typography.

---

## Architectural Invariants

1. **Data-First** — No tool code is written until schemas above are confirmed
2. **Self-Annealing** — Every failure triggers Analyze → Patch → Test → Update Architecture
3. **Deterministic Logic** — Business logic lives in `tools/` as deterministic scripts
4. **SOPs Before Code** — `architecture/` docs are written before their corresponding `tools/` scripts
5. **Intermediates are Ephemeral** — `.tmp/` files can be deleted anytime; only persistent payloads matter

---

## Integration Registry

| Service | Status | Key Location |
|---|---|---|
| n8n MCP | ✅ Configured | `../n8n workflows/.mcp.json` |
| Supabase | ⏳ Phase 2 (later) | `.env` |
| Reddit JSON API | ✅ No key needed | Public endpoint |

---

## Change Log

| Date | Change | Reason |
|---|---|---|
| 2026-02-13 | Initial constitution created | Protocol 0 initialization |
| 2026-02-13 | Data schemas defined | Discovery answers received — schemas confirmed |
