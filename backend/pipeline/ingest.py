"""
Ingest data.jsonl into SQLite database.
Parses Reddit JSONL format, extracts relevant fields, creates indexes.
"""

import json
import sqlite3
import os
import sys
from datetime import datetime, timezone
from urllib.parse import urlparse

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import DATA_JSONL, POSTS_DB


def create_schema(conn):
    """Create the posts table and indexes."""
    conn.executescript("""
        DROP TABLE IF EXISTS posts;
        DROP TABLE IF EXISTS cluster_assignments;
        DROP TABLE IF EXISTS author_stats;
        DROP TABLE IF EXISTS coordination_events;

        CREATE TABLE posts (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            selftext TEXT DEFAULT '',
            author TEXT NOT NULL,
            subreddit TEXT NOT NULL,
            url TEXT,
            domain TEXT,
            score INTEGER DEFAULT 0,
            num_comments INTEGER DEFAULT 0,
            upvote_ratio REAL DEFAULT 0.5,
            created_utc REAL NOT NULL,
            created_date TEXT NOT NULL,
            is_self INTEGER DEFAULT 0,
            is_crosspost INTEGER DEFAULT 0,
            crosspost_parent_id TEXT,
            crosspost_parent_author TEXT,
            crosspost_parent_subreddit TEXT,
            permalink TEXT,
            over_18 INTEGER DEFAULT 0,
            num_crossposts INTEGER DEFAULT 0,
            combined_text TEXT NOT NULL
        );

        CREATE INDEX idx_posts_subreddit ON posts(subreddit);
        CREATE INDEX idx_posts_author ON posts(author);
        CREATE INDEX idx_posts_created_date ON posts(created_date);
        CREATE INDEX idx_posts_domain ON posts(domain);
        CREATE INDEX idx_posts_created_utc ON posts(created_utc);

        CREATE TABLE cluster_assignments (
            post_id TEXT,
            k INTEGER,
            cluster_id INTEGER,
            cluster_label TEXT,
            PRIMARY KEY (post_id, k),
            FOREIGN KEY (post_id) REFERENCES posts(id)
        );
    """)


def parse_post(line):
    """Parse a single JSONL line into a post dict."""
    record = json.loads(line)
    d = record.get('data', record)

    post_id = d.get('id', '')
    title = d.get('title', '')
    selftext = d.get('selftext', '') or ''
    author = d.get('author', '[deleted]')
    subreddit = d.get('subreddit', '')
    url = d.get('url', '')
    score = d.get('score', 0)
    num_comments = d.get('num_comments', 0)
    upvote_ratio = d.get('upvote_ratio', 0.5)
    created_utc = d.get('created_utc', 0)
    is_self = 1 if d.get('is_self', False) else 0
    permalink = d.get('permalink', '')
    over_18 = 1 if d.get('over_18', False) else 0
    num_crossposts = d.get('num_crossposts', 0)

    # Parse domain from URL
    domain = d.get('domain', '')
    if not domain and url:
        try:
            domain = urlparse(url).netloc
        except Exception:
            domain = ''

    # Parse date
    if created_utc:
        dt = datetime.fromtimestamp(created_utc, tz=timezone.utc)
        created_date = dt.strftime('%Y-%m-%d')
    else:
        created_date = ''

    # Extract crosspost info
    is_crosspost = 0
    crosspost_parent_id = None
    crosspost_parent_author = None
    crosspost_parent_subreddit = None

    cpl = d.get('crosspost_parent_list', [])
    if cpl and len(cpl) > 0:
        parent = cpl[0]
        is_crosspost = 1
        crosspost_parent_id = parent.get('id', '')
        crosspost_parent_author = parent.get('author', '')
        crosspost_parent_subreddit = parent.get('subreddit', '')

    # Combined text for embedding
    combined_text = title
    if selftext.strip():
        combined_text = title + ' ' + selftext
    if not combined_text.strip():
        combined_text = '[no content]'

    return (
        post_id, title, selftext, author, subreddit, url, domain,
        score, num_comments, upvote_ratio, created_utc, created_date,
        is_self, is_crosspost, crosspost_parent_id,
        crosspost_parent_author, crosspost_parent_subreddit,
        permalink, over_18, num_crossposts, combined_text
    )


def ingest():
    """Main ingestion function."""
    print(f"Reading from: {DATA_JSONL}")
    print(f"Writing to: {POSTS_DB}")

    os.makedirs(os.path.dirname(POSTS_DB), exist_ok=True)

    conn = sqlite3.connect(POSTS_DB)
    create_schema(conn)

    insert_sql = """
        INSERT OR IGNORE INTO posts (
            id, title, selftext, author, subreddit, url, domain,
            score, num_comments, upvote_ratio, created_utc, created_date,
            is_self, is_crosspost, crosspost_parent_id,
            crosspost_parent_author, crosspost_parent_subreddit,
            permalink, over_18, num_crossposts, combined_text
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """

    count = 0
    errors = 0

    with open(DATA_JSONL, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                row = parse_post(line)
                conn.execute(insert_sql, row)
                count += 1
            except Exception as e:
                errors += 1
                if errors <= 5:
                    print(f"  Error on line {count + errors}: {e}")

            if count % 1000 == 0 and count > 0:
                conn.commit()
                print(f"  Ingested {count} posts...")

    conn.commit()

    # Verify
    total = conn.execute("SELECT COUNT(*) FROM posts").fetchone()[0]
    subs = conn.execute("SELECT subreddit, COUNT(*) FROM posts GROUP BY subreddit ORDER BY COUNT(*) DESC").fetchall()

    print(f"\nDone! Ingested {total} posts ({errors} errors)")
    print(f"\nSubreddit breakdown:")
    for sub, c in subs:
        print(f"  {sub}: {c}")

    conn.close()


if __name__ == '__main__':
    ingest()
