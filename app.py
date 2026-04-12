from flask import Flask, render_template, request, jsonify, send_from_directory
import sqlite3
from datetime import datetime
import os
import csv

app = Flask(__name__)

attendance_enabled = True   # 🔥 ON by default (important)

# Create uploads folder
if not os.path.exists("uploads"):
    os.makedirs("uploads")

# -------- DATABASE --------
def init_db():
    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    # USERS
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        enrollment TEXT UNIQUE,
        password TEXT,
        role TEXT
    )''')

    # ATTENDANCE
    c.execute('''CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        date TEXT,
        time TEXT
    )''')

    # ASSIGNMENTS
    c.execute('''CREATE TABLE IF NOT EXISTS assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        filename TEXT
    )''')

    # 🔥 MARKS TABLE (NEW)
    c.execute('''CREATE TABLE IF NOT EXISTS marks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        mid INTEGER,
        end INTEGER
    )''')

    conn.commit()
    conn.close()

# -------- INSERT STUDENTS --------
def insert_students():
    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    with open("students.csv", newline='', encoding='utf-8') as file:
        reader = csv.DictReader(file)

        for row in reader:
            try:
                c.execute(
                    "INSERT INTO users (name, enrollment, password, role) VALUES (?, ?, ?, ?)",
                    (row['name'], row['enrollment'], "1234", "student")
                )
            except:
                pass

    # TEACHER
    c.execute(
        "INSERT OR IGNORE INTO users VALUES (NULL, 'Teacher', 'T001', 'admin123', 'teacher')"
    )

    conn.commit()
    conn.close()

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

# -------- LOGIN --------
@app.route('/login', methods=['POST'])
def login():
    data = request.json

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("SELECT * FROM users WHERE enrollment=? AND password=? AND role=?",
              (data['enrollment'], data['password'], data['role']))

    user = c.fetchone()
    conn.close()

    if user:
        return jsonify({
            "redirect": "/student" if data['role'] == "student" else "/teacher",
            "name": user[1]
        })
    else:
        return jsonify({"message": "Invalid login ❌"})

# -------- ATTENDANCE --------
@app.route('/toggle_attendance', methods=['POST'])
def toggle():
    global attendance_enabled
    attendance_enabled = not attendance_enabled
    return jsonify({"status": "ON" if attendance_enabled else "OFF"})

@app.route('/mark_attendance', methods=['POST'])
def mark():
    if not attendance_enabled:
        return jsonify({"message": "Attendance OFF ❌"})

    data = request.json
    name = data['name']

    now = datetime.now()

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("INSERT INTO attendance (name, date, time) VALUES (?, ?, ?)",
              (name, now.strftime("%Y-%m-%d"), now.strftime("%H:%M:%S")))

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

# -------- STUDENTS --------
@app.route('/get_students')
def get_students():
    conn = sqlite3.connect("database.db")
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE role='student'")
    data = c.fetchall()
    conn.close()
    return jsonify(data)

# -------- MARKS --------
@app.route('/save_marks', methods=['POST'])
def save_marks():
    data = request.json

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("INSERT INTO marks (name, mid, end) VALUES (?, ?, ?)",
              (data['name'], int(data['mid']), int(data['end'])))

    conn.commit()
    conn.close()

    return jsonify({"message": "Marks Saved ✅"})

@app.route('/get_marks')
def get_marks():
    conn = sqlite3.connect("database.db")
    c = conn.cursor()
    c.execute("SELECT * FROM marks")
    data = c.fetchall()
    conn.close()
    return jsonify(data)

# -------- FILE UPLOAD --------
@app.route('/upload', methods=['POST'])
def upload():
    file = request.files['file']
    filename = file.filename

    file.save("uploads/" + filename)

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("INSERT INTO assignments (name, filename) VALUES (?, ?)",
              (request.form.get("name"), filename))

    conn.commit()
    conn.close()

    return jsonify({"message": "Uploaded ✅"})

@app.route('/get_assignments')
def get_assignments():
    conn = sqlite3.connect("database.db")
    c = conn.cursor()
    c.execute("SELECT * FROM assignments")
    data = c.fetchall()
    conn.close()
    return jsonify(data)

@app.route('/uploads/<filename>')
def files(filename):
    return send_from_directory("uploads", filename)

# -------- RUN --------
if __name__ == '__main__':
    init_db()
    insert_students()
    app.run(debug=True)