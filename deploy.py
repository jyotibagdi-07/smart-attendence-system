"""Production entry point for deploying EduSmart with Gunicorn.

This wrapper initializes the SQLite database when Gunicorn imports the app
and fixes the announcement handler so the posted_by value comes from the
request payload.
"""

import sqlite3

from flask import jsonify, request

from app import app, init_db


# Initialize the database when the WSGI server imports this module.
init_db()


def add_announcement():
    data = request.get_json(silent=True) or {}
    message = data.get("message", "").strip()
    posted_by = data.get("posted_by", "Teacher").strip() or "Teacher"

    if not message:
        return jsonify({"status": "error", "message": "Message required ❌"}), 400

    time_now = __import__("datetime").datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    conn = sqlite3.connect("database.db")
    c = conn.cursor()
    c.execute(
        """
        INSERT INTO announcements (message, time, posted_by)
        VALUES (?, ?, ?)
        """,
        (message, time_now, posted_by),
    )
    conn.commit()
    conn.close()

    return jsonify({"status": "success", "message": "Announcement posted ✅"})


# Replace the original handler at runtime without changing the rest of the app.
app.view_functions["add_announcement"] = add_announcement
