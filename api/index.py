"""Vercel entry point for EduSmart.

Vercel runs Flask as a Python serverless function. The existing project uses
SQLite and a local uploads directory, so this adapter redirects those runtime
writes to /tmp. This is suitable for a portfolio/demo deployment; persistent
production data should use a hosted database and object storage.
"""

import builtins
import os
import shutil
import sqlite3
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
RUNTIME_DIR = Path("/tmp/edusmart")
UPLOAD_DIR = RUNTIME_DIR / "uploads"
RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# app.py creates the uploads directory during import. Redirect that write to
# Vercel's writable temporary directory before importing the Flask app.
_original_makedirs = os.makedirs


def _vercel_makedirs(name, *args, **kwargs):
    if name == "uploads":
        name = str(UPLOAD_DIR)
    return _original_makedirs(name, *args, **kwargs)


os.makedirs = _vercel_makedirs

# app.py uses sqlite3.connect("database.db") throughout the application.
# Redirect SQLite writes to /tmp because the deployed source filesystem is
# read-only and temporary storage is not persistent across cold starts.
_original_sqlite_connect = sqlite3.connect


def _vercel_sqlite_connect(database, *args, **kwargs):
    if database == "database.db":
        database = str(RUNTIME_DIR / "database.db")
    return _original_sqlite_connect(database, *args, **kwargs)


sqlite3.connect = _vercel_sqlite_connect

# app.py reads the seed CSV files using relative paths. Keep the working
# directory at the repository root so templates, CSVs and static assets resolve.
os.chdir(PROJECT_ROOT)

from app import app, init_db  # noqa: E402
import app as _app_module  # noqa: E402

# Use the writable runtime upload directory for all file operations.
_app_module.UPLOAD_FOLDER = str(UPLOAD_DIR)

# Seed the temporary SQLite database from the committed CSV files.
init_db()


# Fix the existing announcement handler for the deployed app. The original
# handler references posted_by without assigning it from the request payload.
def add_announcement():
    from datetime import datetime
    from flask import jsonify, request

    data = request.get_json(silent=True) or {}
    message = str(data.get("message", "")).strip()
    posted_by = str(data.get("posted_by", "Teacher")).strip() or "Teacher"

    if not message:
        return jsonify({"status": "error", "message": "Message required ❌"}), 400

    conn = sqlite3.connect("database.db")
    c = conn.cursor()
    c.execute(
        """
        INSERT INTO announcements (message, time, posted_by)
        VALUES (?, ?, ?)
        """,
        (message, datetime.now().strftime("%Y-%m-%d %H:%M:%S"), posted_by),
    )
    conn.commit()
    conn.close()

    return jsonify({"status": "success", "message": "Announcement posted ✅"})


app.view_functions["add_announcement"] = add_announcement

# Vercel discovers the top-level WSGI application named `app`.
