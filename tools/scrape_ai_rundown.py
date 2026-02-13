"""
The AI Rundown Scraper (stdlib-only)
Scrapes therundown.ai/archive for the latest AI newsletter articles.
Output: JSON array matching the Article Schema in gemini.md.
Uses only Python stdlib — no external dependencies required.
"""

import hashlib
import json
import time
import ssl
from datetime import datetime, timezone, timedelta
from html.parser import HTMLParser
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

HEADERS = {
    "User-Agent": "AntigravityBot/1.0 (AI News Dashboard)",
    "Accept": "text/html,application/xhtml+xml",
}
TIMEOUT = 10
BASE_URL = "https://www.therundown.ai"
ARCHIVE_URL = f"{BASE_URL}/archive"

SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE


def make_id(url: str) -> str:
    return hashlib.sha256(url.encode()).hexdigest()[:16]


def fetch(url: str) -> str | None:
    req = Request(url)
    for k, v in HEADERS.items():
        req.add_header(k, v)
    try:
        with urlopen(req, timeout=TIMEOUT, context=SSL_CTX) as resp:
            return resp.read().decode("utf-8", errors="replace")
    except (URLError, HTTPError, TimeoutError, OSError):
        return None


class ArchiveParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.posts = []
        self._seen = set()
        self._in_a = False
        self._current_href = None
        self._current_text = []

    def handle_starttag(self, tag, attrs):
        if tag == "a":
            attrs_dict = dict(attrs)
            href = attrs_dict.get("href", "")
            if "/p/" in href:
                self._in_a = True
                if href.startswith("/"):
                    href = BASE_URL + href
                self._current_href = href
                self._current_text = []

    def handle_data(self, data):
        if self._in_a:
            self._current_text.append(data.strip())

    def handle_endtag(self, tag):
        if tag == "a" and self._in_a:
            self._in_a = False
            title = " ".join(self._current_text).strip()
            href = self._current_href
            if href and title and len(title) >= 5 and href not in self._seen:
                self._seen.add(href)
                self.posts.append({"url": href, "title": title})


class MetaParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.meta = {}
        self.time_datetime = None

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        if tag == "meta":
            prop = attrs_dict.get("property", "") or attrs_dict.get("name", "")
            content = attrs_dict.get("content", "")
            if prop and content:
                self.meta[prop] = content
        elif tag == "time":
            dt = attrs_dict.get("datetime", "")
            if dt:
                self.time_datetime = dt


def scrape_archive():
    html = fetch(ARCHIVE_URL)
    if not html:
        return [], ["Failed to fetch archive page"]

    parser = ArchiveParser()
    parser.feed(html)
    return parser.posts, []


def scrape_post(url: str) -> dict | None:
    html = fetch(url)
    if not html:
        return None

    parser = MetaParser()
    parser.feed(html)
    m = parser.meta

    return {
        "title": m.get("og:title", ""),
        "subtitle": m.get("og:description"),
        "url": url,
        "publishedAt": m.get("article:published_time") or parser.time_datetime,
        "imageUrl": m.get("og:image"),
        "author": m.get("author", "The Rundown AI"),
    }


def is_within_24h(date_str: str | None) -> bool:
    if not date_str:
        return True
    try:
        dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        return (now - dt) < timedelta(hours=24)
    except (ValueError, TypeError):
        return True


def run():
    now = datetime.now(timezone.utc).isoformat()
    archive_posts, errors = scrape_archive()
    articles = []

    for i, post_info in enumerate(archive_posts[:10]):
        if i > 0:
            time.sleep(1)

        detail = scrape_post(post_info["url"])
        if not detail:
            errors.append(f"Failed to scrape: {post_info['url']}")
            continue

        if not is_within_24h(detail.get("publishedAt")):
            continue

        article = {
            "id": make_id(detail["url"]),
            "title": detail["title"],
            "subtitle": detail["subtitle"],
            "url": detail["url"],
            "source": "ai-rundown",
            "sourceName": "The AI Rundown",
            "publishedAt": detail["publishedAt"] or now,
            "scrapedAt": now,
            "summary": detail["subtitle"],
            "imageUrl": detail["imageUrl"],
            "author": detail["author"],
            "tags": ["ai", "newsletter"],
            "isSaved": False,
            "isNew": True,
        }
        articles.append(article)

    return {
        "source": "ai-rundown",
        "scrapedAt": now,
        "articles": articles,
        "errors": errors if errors else None,
    }


if __name__ == "__main__":
    result = run()
    print(json.dumps(result, indent=2))
