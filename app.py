from flask import Flask, render_template, request, jsonify, send_from_directory
import sqlite3, os, csv
from datetime import datetime
from werkzeug.utils import secure_filename

app = Flask(__name__)

# ================= GLOBAL =================
attendance_enabled = True

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ================= DB INIT =================
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

    c.execute('''CREATE TABLE IF NOT EXISTS class_schedule (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT UNIQUE
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS class_attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        class_date TEXT
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        filename TEXT,
        time TEXT
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        filename TEXT
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assignment_id INTEGER,
        student_name TEXT,
        student_enrollment TEXT,
        filename TEXT,
        time TEXT,
        FOREIGN KEY (assignment_id) REFERENCES assignments (id)
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT,
        time TEXT
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS marks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        mid INTEGER,
        end INTEGER,
        cap INTEGER,
        lab INTEGER
    )''')

    # Load data from CSV files
    try:
        # Load teachers
        with open('teacher.csv', 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                c.execute("INSERT OR IGNORE INTO users (name, enrollment, password, role) VALUES (?, ?, ?, ?)",
                         (row['name'], row['enrollment'], row['password'], row['role']))
        
        # Load students
        with open('students.csv', 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                c.execute("INSERT OR IGNORE INTO users (name, enrollment, password, role) VALUES (?, ?, ?, 'student')",
                         (row['name'], row['enrollment'], row['password']))
    except FileNotFoundError:
        pass  # CSV files might not exist

    conn.commit()
    conn.close()


# ================= ROUTES =================
@app.route('/')
def home():
    return render_template("index.html")

@app.route('/student')
def student():
    return render_template("student.html")

@app.route('/teacher')
def teacher():
    return render_template("teacher.html")

@app.route('/change-password')
def change_password():
    return render_template("change_password.html")


# ================= LOGIN =================
@app.route('/login', methods=['POST'])
def login():
    data = request.json

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("""
        SELECT * FROM users 
        WHERE enrollment=? AND password=? AND role=?
    """, (data['enrollment'], data['password'], data['role']))

    user = c.fetchone()
    conn.close()

    if user:
        return jsonify({
            "name": user[1],
            "redirect": "/teacher" if data['role']=="teacher" else "/student"
        })

    return jsonify({"message": "Invalid credentials ❌"})


# ================= ATTENDANCE CONTROL =================
@app.route('/toggle_attendance', methods=['POST'])
def toggle_attendance():
    global attendance_enabled
    attendance_enabled = not attendance_enabled
    return jsonify({"enabled": attendance_enabled})


@app.route('/attendance_flag')
def attendance_flag():
    return jsonify({"enabled": attendance_enabled})


# ================= CLASS SCHEDULE =================
@app.route('/schedule_class', methods=['POST'])
def schedule_class():

    data = request.json
    date = data['date']

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("INSERT OR IGNORE INTO class_schedule (date) VALUES (?)", (date,))

    conn.commit()
    conn.close()

    return jsonify({"message": "Class scheduled ✅"})


@app.route('/get_schedule')
def get_schedule():

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("SELECT * FROM class_schedule ORDER BY date DESC")
    data = c.fetchall()

    conn.close()
    return jsonify(data)


# ================= CLASS ATTENDANCE =================
@app.route('/mark_class_attendance', methods=['POST'])
def mark_class_attendance():

    global attendance_enabled

    if not attendance_enabled:
        return jsonify({"status":"error","message": "Attendance is OFF ❌"})

    data = request.json
    name = data['name']
    class_date = data['date']

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("SELECT * FROM class_schedule WHERE date=?", (class_date,))
    if not c.fetchone():
        return jsonify({"status":"error","message": "No class scheduled ❌"})

    c.execute("""
        SELECT * FROM class_attendance 
        WHERE name=? AND class_date=?
    """, (name, class_date))

    if c.fetchone():
        return jsonify({"status":"warning","message": "Already marked ⚠️"})

    c.execute("""
        INSERT INTO class_attendance (name, class_date)
        VALUES (?, ?)
    """, (name, class_date))

    conn.commit()
    conn.close()

    return jsonify({"status":"success","message": "Attendance marked ✅"})


# ✅🔥 NEW ROUTE (CRITICAL FIX)
@app.route('/get_my_attendance/<name>')
def get_my_attendance(name):

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("""
        SELECT name, class_date 
        FROM class_attendance 
        WHERE name=?
    """, (name,))

    data = c.fetchall()

    conn.close()
    return jsonify(data)


@app.route('/get_class_attendance')
def get_class_attendance():

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("SELECT * FROM class_attendance")
    data = c.fetchall()

    conn.close()
    return jsonify(data)


# ================= STUDENTS =================
@app.route('/get_students')
def get_students():

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("SELECT name, enrollment FROM users WHERE role='student'")
    data = c.fetchall()

    conn.close()
    return jsonify(data)


# ================= ASSIGNMENTS =================
@app.route('/upload_assignment', methods=['POST'])
def upload_assignment():

    file = request.files['file']
    title = request.form['title']
    desc = request.form.get('desc', '')

    filename = secure_filename(file.filename)
    file.save(os.path.join(UPLOAD_FOLDER, filename))

    time_now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("""
        INSERT INTO assignments (title, filename, time)
        VALUES (?, ?, ?)
    """, (title + " - " + desc, filename, time_now))

    conn.commit()
    conn.close()

    return jsonify({"message": "Assignment uploaded ✅"})


@app.route('/get_assignments')
def get_assignments():

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("SELECT * FROM assignments ORDER BY id DESC")
    data = c.fetchall()

    conn.close()
    return jsonify(data)


@app.route('/delete_assignment/<int:id>', methods=['DELETE'])
def delete_assignment(id):
    conn = sqlite3.connect("database.db")
    c = conn.cursor()
    
    # Get filename to delete file
    c.execute("SELECT filename FROM assignments WHERE id=?", (id,))
    result = c.fetchone()
    if result:
        filename = result[0]
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
    
    c.execute("DELETE FROM assignments WHERE id=?", (id,))
    conn.commit()
    conn.close()
    
    return jsonify({"message": "Assignment deleted ✅"})


@app.route('/edit_assignment/<int:id>', methods=['PUT'])
def edit_assignment(id):
    data = request.json
    title = data.get('title')
    
    conn = sqlite3.connect("database.db")
    c = conn.cursor()
    
    c.execute("UPDATE assignments SET title=? WHERE id=?", (title, id))
    conn.commit()
    conn.close()
    
    return jsonify({"message": "Assignment updated ✅"})


# ================= NOTES =================
@app.route('/upload_notes', methods=['POST'])
def upload_notes():

    file = request.files['file']
    title = request.form['title']

    filename = secure_filename(file.filename)
    file.save(os.path.join(UPLOAD_FOLDER, filename))

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("""
        INSERT INTO notes (title, filename)
        VALUES (?, ?)
    """, (title, filename))

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


@app.route('/delete_notes/<int:id>', methods=['DELETE'])
def delete_notes(id):
    conn = sqlite3.connect("database.db")
    c = conn.cursor()
    
    # Get filename to delete file
    c.execute("SELECT filename FROM notes WHERE id=?", (id,))
    result = c.fetchone()
    if result:
        filename = result[0]
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
    
    c.execute("DELETE FROM notes WHERE id=?", (id,))
    conn.commit()
    conn.close()
    
    return jsonify({"message": "Notes deleted ✅"})


@app.route('/edit_notes/<int:id>', methods=['PUT'])
def edit_notes(id):
    data = request.json
    title = data.get('title')
    
    conn = sqlite3.connect("database.db")
    c = conn.cursor()
    
    c.execute("UPDATE notes SET title=? WHERE id=?", (title, id))
    conn.commit()
    conn.close()
    
    return jsonify({"message": "Notes updated ✅"})


# ================= SUBMISSIONS =================
@app.route('/submit_assignment', methods=['POST'])
def submit_assignment():
    file = request.files['file']
    assignment_id = request.form['assignment_id']
    student_name = request.form['student_name']
    student_enrollment = request.form['student_enrollment']

    # Check if student has already submitted for this assignment
    conn = sqlite3.connect("database.db")
    c = conn.cursor()
    
    c.execute("""
        SELECT id FROM submissions 
        WHERE assignment_id=? AND student_enrollment=?
    """, (assignment_id, student_enrollment))
    
    existing = c.fetchone()
    if existing:
        conn.close()
        return jsonify({"message": "You have already submitted this assignment. Delete your previous submission first to submit again. ❌"})

    filename = secure_filename(file.filename)
    file.save(os.path.join(UPLOAD_FOLDER, filename))

    time_now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    c.execute("""
        INSERT INTO submissions (assignment_id, student_name, student_enrollment, filename, time)
        VALUES (?, ?, ?, ?, ?)
    """, (assignment_id, student_name, student_enrollment, filename, time_now))

    conn.commit()
    conn.close()

    return jsonify({"message": "Assignment submitted successfully ✅"})


@app.route('/get_submissions/<int:assignment_id>')
def get_submissions(assignment_id):
    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("SELECT * FROM submissions WHERE assignment_id=? ORDER BY time DESC", (assignment_id,))
    data = c.fetchall()

    conn.close()
    return jsonify(data)


@app.route('/get_my_submissions/<enrollment>')
def get_my_submissions(enrollment):
    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("""
        SELECT s.id, a.title, s.student_name, s.student_enrollment, s.filename, s.time
        FROM submissions s
        JOIN assignments a ON s.assignment_id = a.id
        WHERE s.student_enrollment=? ORDER BY s.time DESC
    """, (enrollment,))
    data = c.fetchall()

    conn.close()
    return jsonify(data)


@app.route('/get_recent_submissions')
def get_recent_submissions():
    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("""
        SELECT s.id, a.title, s.student_name, s.student_enrollment, s.filename, s.time
        FROM submissions s
        JOIN assignments a ON s.assignment_id = a.id
        ORDER BY s.time DESC
        LIMIT 10
    """)
    rows = c.fetchall()
    conn.close()

    recent = [
        {
            "id": row[0],
            "assignment_title": row[1],
            "student_name": row[2],
            "student_enrollment": row[3],
            "filename": row[4],
            "time": row[5]
        } for row in rows
    ]
    return jsonify(recent)


@app.route('/delete_submission/<int:id>', methods=['DELETE'])
def delete_submission(id):
    conn = sqlite3.connect("database.db")
    c = conn.cursor()
    
    # Get filename to delete file
    c.execute("SELECT filename FROM submissions WHERE id=?", (id,))
    result = c.fetchone()
    if result:
        filename = result[0]
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
    
    c.execute("DELETE FROM submissions WHERE id=?", (id,))
    conn.commit()
    conn.close()
    
    return jsonify({"message": "Submission deleted ✅"})


# ================= ANNOUNCEMENTS =================
@app.route('/add_announcement', methods=['POST'])
def add_announcement():

    data = request.json
    time_now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("""
        INSERT INTO announcements (message, time)
        VALUES (?, ?)
    """, (data['message'], time_now))

    conn.commit()
    conn.close()

    return jsonify({"message": "Announcement posted ✅"})


@app.route('/get_announcements')
def get_announcements():

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("SELECT * FROM announcements ORDER BY id DESC")
    data = c.fetchall()

    conn.close()
    return jsonify(data)


# ================= MARKS =================
@app.route('/save_marks', methods=['POST'])
def save_marks():

    data = request.json

    try:
        mid = int(data.get('mid', 0))
        end = int(data.get('end', 0))
        cap = int(data.get('cap', 0))
        lab = int(data.get('lab', 0))
    except (TypeError, ValueError):
        return jsonify({"status": "error", "message": "Invalid credentials ❌"})

    if mid < 0 or mid > 15 or end < 0 or end > 60 or cap < 0 or cap > 10 or lab < 0 or lab > 15:
        return jsonify({"status": "error", "message": "Invalid credentials ❌"})

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("SELECT * FROM marks WHERE name=?", (data['name'],))
    exists = c.fetchone()

    if exists:
        c.execute("""
            UPDATE marks 
            SET mid=?, end=?, cap=?, lab=? 
            WHERE name=?
        """, (mid, end, cap, lab, data['name']))
    else:
        c.execute("""
            INSERT INTO marks (name, mid, end, cap, lab)
            VALUES (?, ?, ?, ?, ?)
        """, (data['name'], mid, end, cap, lab))

    conn.commit()
    conn.close()

    return jsonify({"message": "Marks saved ✅"})


@app.route('/get_marks')
def get_marks():

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("SELECT * FROM marks")
    data = c.fetchall()

    conn.close()
    return jsonify(data)


# ================= FILES =================
@app.route('/uploads/<filename>')
def uploads(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)


# ================= RUN =================
if __name__ == '__main__':
    init_db()
    app.run(debug=True)