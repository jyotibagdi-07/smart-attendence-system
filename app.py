from flask import Flask, render_template, request, jsonify, send_from_directory
import sqlite3, os, csv
from datetime import datetime
from werkzeug.utils import secure_filename

app = Flask(__name__)

attendance_enabled = True

# create uploads folder
if not os.path.exists("uploads"):
    os.makedirs("uploads")

# ---------------- DATABASE ----------------
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

    c.execute('''CREATE TABLE IF NOT EXISTS marks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        mid INTEGER,
        end INTEGER
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        filename TEXT
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT,
        date TEXT
    )''')

    conn.commit()
    conn.close()


# ---------------- LOAD CSV ----------------
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

    conn.commit()
    conn.close()


def insert_teachers():
    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    with open("teachers.csv", newline='', encoding='utf-8') as file:
        reader = csv.DictReader(file)

        for row in reader:
            try:
                c.execute(
                    "INSERT INTO users (name, enrollment, password, role) VALUES (?, ?, ?, ?)",
                    (row['username'], row['username'], row['password'], "teacher")
                )
            except:
                pass

    conn.commit()
    conn.close()


# ---------------- ROUTES ----------------
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/student')
def student():
    return render_template('student.html')

@app.route('/teacher')
def teacher():
    return render_template('teacher.html')


# ---------------- LOGIN ----------------
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
            "redirect": "/student" if data['role']=="student" else "/teacher",
            "name": user[1]
        })
    return jsonify({"message": "Invalid login ❌"})


# ---------------- ATTENDANCE ----------------
@app.route('/toggle_attendance', methods=['POST'])
def toggle():
    global attendance_enabled
    attendance_enabled = not attendance_enabled
    return jsonify({"status": "ON" if attendance_enabled else "OFF"})


@app.route('/attendance_status')
def attendance_status():
    return jsonify({"enabled": attendance_enabled})


@app.route('/mark_attendance', methods=['POST'])
def mark_attendance():
    if not attendance_enabled:
        return jsonify({"message": "Attendance Closed ❌"})

    data = request.json
    name = data['name']
    today = datetime.now().strftime("%Y-%m-%d")

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("SELECT * FROM attendance WHERE name=? AND date=?", (name, today))
    if c.fetchone():
        conn.close()
        return jsonify({"message": "Already marked today ⚠️"})

    now = datetime.now()

    c.execute("INSERT INTO attendance (name, date, time) VALUES (?, ?, ?)",
              (name, today, now.strftime("%H:%M:%S")))

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


# ---------------- STUDENTS ----------------
@app.route('/get_students')
def get_students():
    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("SELECT name, enrollment FROM users WHERE role='student'")
    data = c.fetchall()

    conn.close()
    return jsonify(data)


# ---------------- CHANGE PASSWORD ----------------
@app.route('/change_password', methods=['POST'])
def change_password():
    data = request.json

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("SELECT password FROM users WHERE enrollment=?", (data['enrollment'],))
    user = c.fetchone()

    if not user or user[0] != data['old']:
        return jsonify({"message": "Wrong old password ❌"})

    c.execute("UPDATE users SET password=? WHERE enrollment=?",
              (data['new'], data['enrollment']))

    conn.commit()
    conn.close()

    return jsonify({"message": "Password Updated ✅"})


# ---------------- ASSIGNMENTS ----------------
@app.route('/upload', methods=['POST'])
def upload():
    file = request.files['file']
    name = request.form.get("name")

    filename = secure_filename(file.filename)
    file.save(os.path.join("uploads", filename))

    conn = sqlite3.connect("database.db")
    c = conn.cursor()
    c.execute("INSERT INTO assignments (name, filename) VALUES (?, ?)", (name, filename))

    conn.commit()
    conn.close()

    return jsonify({"message": "Uploaded ✅"})


@app.route('/get_assignments')
def get_assignments():
    name = request.args.get("name")
    role = request.args.get("role")

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    if role == "teacher":
        c.execute("SELECT * FROM assignments")
    else:
        c.execute("SELECT * FROM assignments WHERE name=?", (name,))

    data = c.fetchall()
    conn.close()

    return jsonify(data)


# ---------------- NOTES ----------------
@app.route('/upload_notes', methods=['POST'])
def upload_notes():
    file = request.files['file']
    title = request.form.get("title")

    filename = secure_filename(file.filename)
    file.save(os.path.join("uploads", filename))

    conn = sqlite3.connect("database.db")
    c = conn.cursor()
    c.execute("INSERT INTO notes (title, filename) VALUES (?, ?)", (title, filename))

    conn.commit()
    conn.close()

    return jsonify({"message": "Notes uploaded ✅"})


@app.route('/get_notes')
def get_notes():
    conn = sqlite3.connect("database.db")
    c = conn.cursor()
    c.execute("SELECT * FROM notes")
    data = c.fetchall()
    conn.close()
    return jsonify(data)


# ---------------- ANNOUNCEMENTS ----------------
@app.route('/add_announcement', methods=['POST'])
def add_announcement():
    data = request.json

    conn = sqlite3.connect("database.db")
    c = conn.cursor()
    c.execute("INSERT INTO announcements (message, date) VALUES (?, ?)",
              (data['message'], datetime.now().strftime("%Y-%m-%d")))

    conn.commit()
    conn.close()

    return jsonify({"message": "Announcement added ✅"})


@app.route('/get_announcements')
def get_announcements():
    conn = sqlite3.connect("database.db")
    c = conn.cursor()
    c.execute("SELECT * FROM announcements ORDER BY id DESC")
    data = c.fetchall()
    conn.close()
    return jsonify(data)


# ---------------- FILE SERVE ----------------
@app.route('/uploads/<filename>')
def files(filename):
    return send_from_directory("uploads", filename)


# ---------------- RUN ----------------
if __name__ == '__main__':
    init_db()
    insert_students()
    insert_teachers()
    app.run(debug=True)