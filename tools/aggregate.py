"""
Aggregator — Orchestrates all scrapers and writes combined output.
Deduplicates by article ID (URL hash).
Output: .tmp/articles.json
"""

import json
import os
import sys

# Add project root to path so we can import tools
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from scrape_bens_bites import run as scrape_bens_bites
from scrape_ai_rundown import run as scrape_ai_rundown
from scrape_reddit import run as scrape_reddit

from datetime import datetime, timezone


def run():
    now = datetime.now(timezone.utc).isoformat()
    all_articles = []
    all_errors = []
    sources_status = {}

    # Run each scraper — catch errors per-source so one failure doesn't kill all
    scrapers = [
        ("bens-bites", scrape_bens_bites),
        ("ai-rundown", scrape_ai_rundown),
        ("reddit", scrape_reddit),
    ]

    for source_name, scraper_fn in scrapers:
        try:
            result = scraper_fn()
            articles = result.get("articles", [])
            errors = result.get("errors") or []
            all_articles.extend(articles)
            all_errors.extend(errors)
            sources_status[source_name] = {
                "status": "ok" if not errors else "partial",
                "articleCount": len(articles),
                "errors": errors if errors else None,
            }
            print(f"  ✓ {source_name}: {len(articles)} articles")
        except Exception as e:
            error_msg = f"Scraper '{source_name}' crashed: {e}"
            all_errors.append(error_msg)
            sources_status[source_name] = {
                "status": "error",
                "articleCount": 0,
                "errors": [error_msg],
            }
            print(f"  ✗ {source_name}: FAILED - {e}")

    # Deduplicate by article ID
    seen_ids = set()
    unique_articles = []
    for article in all_articles:
        if article["id"] not in seen_ids:
            seen_ids.add(article["id"])
            unique_articles.append(article)

    # Sort by publishedAt (newest first)
    unique_articles.sort(
        key=lambda a: a.get("publishedAt", ""),
        reverse=True,
    )

    output = {
        "scrapedAt": now,
        "totalArticles": len(unique_articles),
        "sources": sources_status,
        "articles": unique_articles,
        "errors": all_errors if all_errors else None,
    }

    # Write to dashboard/articles.json (for deployment)
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dashboard_dir = os.path.join(project_root, "dashboard")
    os.makedirs(dashboard_dir, exist_ok=True)
    output_path = os.path.join(dashboard_dir, "articles.json")

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\n✓ Wrote {len(unique_articles)} articles to {output_path}")
    print(f"  Sources: {json.dumps(sources_status, indent=2)}")

    return output


if __name__ == "__main__":
    print("🔄 Running all scrapers...\n")
    run()
