import sqlite3
import random
import time
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, send_from_directory, redirect
from pathlib import Path

DB_PATH = Path(__file__).parent / "ads.db"
app = Flask(__name__, static_folder="static")
@app.route("/health")
def health():
    return {"status": "ok"}

# ---------- Database Setup ----------
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS ads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            advertiser TEXT NOT NULL,
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            url TEXT NOT NULL,
            keywords TEXT DEFAULT '',
            impressions INTEGER DEFAULT 0,
            clicks INTEGER DEFAULT 0,
            last_shown REAL DEFAULT 0,
            active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ad_id INTEGER,
            event TEXT,
            ts TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS leads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ad_id INTEGER,
            name TEXT,
            email TEXT,
            phone TEXT,
            timing TEXT,
            message TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

init_db()

def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# ---------- Fairness Rotation Logic ----------
def pick_ads(context: str, n: int = 2):
    """
    Simple fair rotation:
    1. Filter ads by keyword overlap with context (if context given)
    2. Sort by least-recently-shown (fairness)
    3. Tie-break by lowest impressions (fairness)
    """
    conn = db()
    rows = conn.execute("SELECT * FROM ads WHERE active = 1").fetchall()
    conn.close()

    if not rows:
        return []

    ctx = (context or "").lower()
    now = time.time()

    def score(row):
        # Keyword match bonus
        kws = [k.strip().lower() for k in (row["keywords"] or "").split(",") if k.strip()]
        match = sum(1 for k in kws if k and k in ctx)
        keyword_score = match * 1000 if kws else 0
        # Least-recently-shown (higher = should be shown sooner)
        recency = now - (row["last_shown"] or 0)
        # Fewer impressions = higher priority
        fairness = -row["impressions"]
        return (keyword_score + recency + fairness)

    ranked = sorted(rows, key=score, reverse=True)
    return ranked[:n]

# ---------- Routes: Ad Serving (Publisher API) ----------
@app.route("/api/serve")
def serve():
    context = request.args.get("context", "")
    n = int(request.args.get("n", 2))
    picks = pick_ads(context, n)

    out = []
    conn = db()
    now = time.time()
    for row in picks:
        conn.execute("UPDATE ads SET impressions = impressions + 1, last_shown = ? WHERE id = ?",
                     (now, row["id"]))
        conn.execute("INSERT INTO events (ad_id, event) VALUES (?, 'impression')", (row["id"],))
        out.append({
            "id": row["id"],
            "title": row["title"],
            "body": row["body"],
            "url": row["url"],
            "advertiser": row["advertiser"],
        })
    conn.commit()
    conn.close()
    return jsonify(out)

# ---------- Click Tracking + Redirect ----------
@app.route("/click/<int:ad_id>")
def click(ad_id):
    conn = db()
    row = conn.execute("SELECT url FROM ads WHERE id = ?", (ad_id,)).fetchone()
    if not row:
        conn.close()
        return "Ad not found", 404
    conn.execute("UPDATE ads SET clicks = clicks + 1 WHERE id = ?", (ad_id,))
    conn.execute("INSERT INTO events (ad_id, event) VALUES (?, 'click')", (ad_id,))
    conn.commit()
    conn.close()
    return redirect(row["url"])

# ---------- Admin API ----------
@app.route("/api/ads", methods=["GET", "POST"])
def ads():
    conn = db()
    if request.method == "POST":
        data = request.get_json()
        conn.execute("""
            INSERT INTO ads (advertiser, title, body, url, keywords)
            VALUES (?, ?, ?, ?, ?)
        """, (
            data.get("advertiser", "Anonymous"),
            data.get("title", ""),
            data.get("body", ""),
            data.get("url", "#"),
            data.get("keywords", ""),
        ))
        conn.commit()
        conn.close()
        # Fetch advertiser URL for redirect
    conn2 = db()
    ad_row = conn2.execute("SELECT url FROM ads WHERE id = ?", (ad_id,)).fetchone()
    conn2.close()
    redirect_url = ad_row["url"] if ad_row else "https://example.com"

    return jsonify({"ok": True, "redirect_url": redirect_url})

    rows = conn.execute("SELECT * FROM ads ORDER BY id DESC").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route("/api/ads/<int:ad_id>", methods=["DELETE"])
def delete_ad(ad_id):
    conn = db()
    conn.execute("DELETE FROM ads WHERE id = ?", (ad_id,))
    conn.commit()
    conn.close()
    # Fetch advertiser URL for redirect
    conn2 = db()
    ad_row = conn2.execute("SELECT url FROM ads WHERE id = ?", (ad_id,)).fetchone()
    conn2.close()
    redirect_url = ad_row["url"] if ad_row else "https://example.com"

    return jsonify({"ok": True, "redirect_url": redirect_url})

@app.route("/api/stats")
def stats():
    conn = db()
    rows = conn.execute("SELECT * FROM ads").fetchall()
    conn.close()
    total_impr = sum(r["impressions"] for r in rows)
    total_clicks = sum(r["clicks"] for r in rows)
    return jsonify({
        "ads": len(rows),
        "total_impressions": total_impr,
        "total_clicks": total_clicks,
        "ctr": round(total_clicks / total_impr, 4) if total_impr else 0,
    })

# ---------- Static Pages ----------
@app.route("/")
def index():
    return send_from_directory("static", "admin.html")

@app.route("/publisher")
def publisher():
    return send_from_directory("static", "publisher.html")

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5000))
    debug_mode = os.environ.get("ENV", "development") == "development"

    print(f"\n🚀 Simple Ad System running on port {port}")
    print(f"   Debug mode: {debug_mode}\n")

    app.run(host="0.0.0.0", port=port, debug=debug_mode)

# ---------- Conversion Tracking ----------
@app.route("/conversion", methods=["POST"])
def track_conversion():
    """Advertisers ping this when a user fills a form or calls."""
    data = request.get_json()
    ad_id = data.get("ad_id")
    value = data.get("value", 0)  # optional lead value

    if not ad_id:
        return jsonify({"error": "ad_id required"}), 400

    conn = db()
    # Log the conversion event
    conn.execute("INSERT INTO events (ad_id, event, value) VALUES (?, 'conversion', ?)",
                 (ad_id, value))
    conn.commit()
    conn.close()
    # Fetch advertiser URL for redirect
    conn2 = db()
    ad_row = conn2.execute("SELECT url FROM ads WHERE id = ?", (ad_id,)).fetchone()
    conn2.close()
    redirect_url = ad_row["url"] if ad_row else "https://example.com"

    return jsonify({"ok": True, "redirect_url": redirect_url})

# Add value column to events table (run once)
def migrate_db():
    conn = db()
    try:
        conn.execute("ALTER TABLE events ADD COLUMN value REAL DEFAULT 0")
        conn.commit()
    except:
        pass  # column already exists
    conn.close()

migrate_db()

# ---------- Lead Capture ----------
@app.route("/api/lead", methods=["POST"])
def capture_lead():
    """Stores lead form submissions."""
    data = request.get_json()
    ad_id = data.get("ad_id")

    conn = db()
    # Create leads table if not exists
    conn.execute("""
        CREATE TABLE IF NOT EXISTS leads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ad_id INTEGER,
            name TEXT,
            email TEXT,
            phone TEXT,
            timing TEXT,
            message TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.execute("""
        INSERT INTO leads (ad_id, name, email, phone, timing, message)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (ad_id, data.get("name"), data.get("email"),
          data.get("phone"), data.get("timing"), data.get("message")))
    conn.commit()
    conn.close()
    # Fetch advertiser URL for redirect
    conn2 = db()
    ad_row = conn2.execute("SELECT url FROM ads WHERE id = ?", (ad_id,)).fetchone()
    conn2.close()
    redirect_url = ad_row["url"] if ad_row else "https://example.com"

    return jsonify({"ok": True, "redirect_url": redirect_url})

# ---------- Admin: View Leads ----------
@app.route("/api/leads", methods=["GET"])
def list_leads():
    conn = db()
    rows = conn.execute("SELECT * FROM leads ORDER BY id DESC").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])
