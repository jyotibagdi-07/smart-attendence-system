from flask import Flask, render_template, request, jsonify
import sqlite3
from datetime import datetime
import os
import csv

app = Flask(__name__)

# -------- GLOBAL ATTENDANCE SWITCH --------
attendance_enabled = False

# -------- CREATE UPLOADS FOLDER --------
if not os.path.exists("uploads"):
    os.makedirs("uploads")

# -------- DATABASE --------
def init_db():
    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        enrollment TEXT UNIQUE,
        password TEXT,
        role TEXT
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        date TEXT,
        time TEXT
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        filename TEXT
    )''')

    conn.commit()
    conn.close()


# -------- INSERT FROM CSV --------
def insert_from_csv():
    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("SELECT COUNT(*) FROM users WHERE role='student'")
    count = c.fetchone()[0]

    if count == 0:
        with open("students.csv", newline='', encoding='utf-8') as file:
            reader = csv.DictReader(file)

            for row in reader:
                name = row.get('name', '').strip()
                enrollment = row.get('enrollment', '').strip()

                if not name or not enrollment:
                    continue

                try:
                    c.execute(
                        "INSERT INTO users (name, enrollment, password, role) VALUES (?, ?, ?, ?)",
                        (name, enrollment, "1234", "student")
                    )
                except:
                    pass

        print("✅ Students inserted")

    # -------- ADD TEACHER SAFELY --------
    c.execute(
        "INSERT OR IGNORE INTO users (name, enrollment, password, role) VALUES (?, ?, ?, ?)",
        ("Teacher", "T001", "admin123", "teacher")
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

    enrollment = data.get('enrollment')
    password = data.get('password')
    role = data.get('role')

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


# -------- CHANGE PASSWORD --------
@app.route('/change_password', methods=['POST'])
def change_password():
    data = request.json

    enrollment = data.get('enrollment')
    old_password = data.get('old_password')
    new_password = data.get('new_password')

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("SELECT * FROM users WHERE enrollment=? AND password=?",
              (enrollment, old_password))

    if not c.fetchone():
        return jsonify({"message": "Incorrect old password ❌"})

    c.execute("UPDATE users SET password=? WHERE enrollment=?",
              (new_password, enrollment))

    conn.commit()
    conn.close()

    return jsonify({"message": "Password changed ✅"})


# -------- ATTENDANCE CONTROL (NEW 🔥) --------
@app.route('/toggle_attendance', methods=['POST'])
def toggle_attendance():
    global attendance_enabled
    attendance_enabled = not attendance_enabled

    return jsonify({
        "status": "ON" if attendance_enabled else "OFF"
    })


# -------- MARK ATTENDANCE --------
@app.route('/mark_attendance', methods=['POST'])
def mark_attendance():
    global attendance_enabled

    if not attendance_enabled:
        return jsonify({"message": "Attendance is OFF ❌"})

    data = request.json
    name = data.get('name')

    now = datetime.now()
    date = now.strftime("%Y-%m-%d")
    time = now.strftime("%H:%M:%S")

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("SELECT * FROM attendance WHERE name=? AND date=?", (name, date))
    if c.fetchone():
        return jsonify({"message": "Already marked today ❌"})

    c.execute("INSERT INTO attendance (name, date, time) VALUES (?, ?, ?)",
              (name, date, time))

    conn.commit()
    conn.close()

    return jsonify({"message": "Attendance Marked ✅"})


# -------- GET ATTENDANCE --------
@app.route('/get_attendance')
def get_attendance():
    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("SELECT * FROM attendance")
    data = c.fetchall()

    conn.close()
    return jsonify(data)


# -------- FILE UPLOAD --------
ALLOWED_EXTENSIONS = {'pdf', 'docx', 'ppt', 'pptx'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/upload', methods=['POST'])
def upload():
    file = request.files['file']

    if not file or not allowed_file(file.filename):
        return jsonify({"message": "Only PDF/DOCX allowed ❌"})

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


# -------- RUN --------
if __name__ == '__main__':
    init_db()
    insert_from_csv()
    app.run(debug=True)