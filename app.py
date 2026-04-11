from flask import Flask, render_template, request, jsonify
import sqlite3
from datetime import datetime
import os

app = Flask(__name__)

# Create uploads folder
if not os.path.exists("uploads"):
    os.makedirs("uploads")

# -------- DATABASE --------
def init_db():
    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    # USERS TABLE
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        enrollment TEXT UNIQUE,
        password TEXT,
        role TEXT
    )''')

    # ATTENDANCE TABLE
    c.execute('''CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        date TEXT,
        time TEXT
    )''')

    # ASSIGNMENT TABLE
    c.execute('''CREATE TABLE IF NOT EXISTS assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        filename TEXT
    )''')

    conn.commit()
    conn.close()

init_db()

# -------- ROUTES --------
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/student')
def student():
    return render_template('student.html')

@app.route('/teacher')
def teacher():
    return render_template('teacher.html')

# -------- SIGNUP --------
@app.route('/signup', methods=['POST'])
def signup():
    data = request.json

    name = data['name']
    enrollment = data['enrollment']
    password = data['password']
    role = data['role']

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    try:
        c.execute("INSERT INTO users (name, enrollment, password, role) VALUES (?, ?, ?, ?)",
                  (name, enrollment, password, role))
        conn.commit()
    except:
        return jsonify({"message": "User already exists ❌"})

    conn.close()
    return jsonify({"message": "Signup successful ✅"})

# -------- LOGIN --------
@app.route('/login', methods=['POST'])
def login():
    data = request.json

    enrollment = data['enrollment']
    password = data['password']
    role = data['role']

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("SELECT * FROM users WHERE enrollment=? AND password=? AND role=?",
              (enrollment, password, role))

    user = c.fetchone()
    conn.close()

    if user:
        return jsonify({
            "redirect": "/student" if role == "student" else "/teacher",
            "name": user[1]
        })
    else:
        return jsonify({"message": "Invalid login ❌"})

# -------- ATTENDANCE --------
@app.route('/mark_attendance', methods=['POST'])
def mark_attendance():
    data = request.json
    name = data['name']

    now = datetime.now()
    date = now.strftime("%Y-%m-%d")
    time = now.strftime("%H:%M:%S")

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("INSERT INTO attendance (name, date, time) VALUES (?, ?, ?)",
              (name, date, time))

    conn.commit()
    conn.close()

    return jsonify({"message": "Attendance Marked ✅"})

@app.route('/get_attendance')
def get_attendance():
    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("SELECT * FROM attendance")
    data = c.fetchall()

    conn.close()

    return jsonify(data)

# -------- FILE UPLOAD --------
@app.route('/upload', methods=['POST'])
def upload():
    file = request.files['file']
    filename = file.filename

    file.save("uploads/" + filename)

    name = request.form.get("name", "Unknown")

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("INSERT INTO assignments (name, filename) VALUES (?, ?)",
              (name, filename))

    conn.commit()
    conn.close()

    return jsonify({"message": "File Uploaded ✅"})

@app.route('/get_assignments')
def get_assignments():
    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("SELECT * FROM assignments")
    data = c.fetchall()

    conn.close()

    return jsonify(data)

if __name__ == '__main__':
    app.run(debug=True)