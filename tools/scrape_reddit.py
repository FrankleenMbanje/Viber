"""
Reddit Scraper (stdlib-only)
Scrapes r/artificial via the public JSON API for the latest AI posts.
Output: JSON array matching the Article Schema in gemini.md.
Uses only Python stdlib — no external dependencies required.
"""

import hashlib
import json
import ssl
from datetime import datetime, timezone, timedelta
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

HEADERS = {
    "User-Agent": "AntigravityBot/1.0 (AI News Dashboard)",
    "Accept": "application/json",
}
TIMEOUT = 10
SUBREDDITS = ["artificial"]
REDDIT_BASE = "https://www.reddit.com"

SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE


def make_id(url: str) -> str:
    return hashlib.sha256(url.encode()).hexdigest()[:16]


def fetch_json(url: str) -> dict | None:
    req = Request(url)
    for k, v in HEADERS.items():
        req.add_header(k, v)
    try:
        with urlopen(req, timeout=TIMEOUT, context=SSL_CTX) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except (URLError, HTTPError, TimeoutError, OSError, json.JSONDecodeError):
        return None


def is_within_24h(timestamp: float) -> bool:
    try:
        dt = datetime.fromtimestamp(timestamp, tz=timezone.utc)
        now = datetime.now(timezone.utc)
        return (now - dt) < timedelta(hours=24)
    except (ValueError, TypeError, OSError):
        return False


def scrape_subreddit(subreddit: str) -> tuple[list[dict], list[str]]:
    url = f"{REDDIT_BASE}/r/{subreddit}/hot.json?limit=25"
    articles = []
    errors = []

    data = fetch_json(url)
    if not data:
        return [], [f"Failed to fetch r/{subreddit}"]

    now = datetime.now(timezone.utc).isoformat()

    for child in data.get("data", {}).get("children", []):
        post = child.get("data", {})

        if post.get("stickied"):
            continue

        created_utc = post.get("created_utc", 0)
        if not is_within_24h(created_utc):
            continue

        permalink = post.get("permalink", "")
        post_url = post.get("url", f"{REDDIT_BASE}{permalink}")
        reddit_url = f"{REDDIT_BASE}{permalink}" if permalink else post_url

        # Image extraction
        image_url = None
        thumbnail = post.get("thumbnail", "")
        if thumbnail and thumbnail.startswith("http"):
            image_url = thumbnail
        preview = post.get("preview", {})
        if preview:
            images = preview.get("images", [])
            if images:
                src = images[0].get("source", {}).get("url")
                if src:
                    image_url = src.replace("&amp;", "&")

        published_at = datetime.fromtimestamp(
            created_utc, tz=timezone.utc
        ).isoformat()

        selftext = (post.get("selftext", "") or "")[:300] or None

        article = {
            "id": make_id(reddit_url),
            "title": post.get("title", "Untitled"),
            "subtitle": None,
            "url": reddit_url,
            "source": "reddit",
            "sourceName": f"Reddit r/{subreddit}",
            "publishedAt": published_at,
            "scrapedAt": now,
            "summary": selftext,
            "imageUrl": image_url,
            "author": post.get("author", "unknown"),
            "tags": ["ai", "reddit", subreddit],
            "isSaved": False,
            "isNew": True,
        }
        articles.append(article)

    return articles, errors


def run():
    now = datetime.now(timezone.utc).isoformat()
    all_articles = []
    all_errors = []

    for subreddit in SUBREDDITS:
        articles, errors = scrape_subreddit(subreddit)
        all_articles.extend(articles)
        all_errors.extend(errors)

    return {
        "source": "reddit",
        "scrapedAt": now,
        "articles": all_articles,
        "errors": all_errors if all_errors else None,
    }


if __name__ == "__main__":
    result = run()
    print(json.dumps(result, indent=2))
