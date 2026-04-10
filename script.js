function uploadFile() {
    let fileInput = document.querySelector(".file-input");
    let file = fileInput.files[0];

    if (!file) {
        alert("Select PDF first!");
        return;
    }

    let formData = new FormData();
    formData.append("file", file);

    fetch("http://localhost:5000/upload", {
        method: "POST",
        body: formData
    })
    .then(res => res.json())
    .then(data => alert("Uploaded!"))
    .catch(err => console.log(err));
}

// 🔥 SAMPLE STUDENT DATA
const students = [
    {
        name: "Parvati",
        attendance: { present: 6, total: 9 },
        proxy: false,
        assignment: "parvati_assignment1.pdf"
    },
    {
        name: "Riya",
        attendance: { present: 5, total: 9 },
        proxy: true,
        assignment: "riya_assignment1.pdf"
    }
];

// 🔹 Load Attendance for Teacher
function loadTeacherAttendance() {
    let html = "";

    students.forEach((s, index) => {
        let percent = (s.attendance.present / s.attendance.total) * 100;

        html += `
        <div class="subject">
            <h4>${s.name}</h4>

            <div class="progress-bar">
                <div class="progress" style="width:${percent}%"></div>
            </div>

            <p>${s.attendance.present} / ${s.attendance.total}</p>

            <label>
                <input type="checkbox" onchange="toggleProxy(${index})" ${s.proxy ? "checked" : ""}>
                Mark Proxy
            </label>

            ${s.proxy ? '<p class="proxy">⚠ Proxy Flag Active</p>' : ''}
        </div>
        `;
    });

    document.getElementById("attendanceContainer").innerHTML = html;
}

// 🔹 Toggle Proxy Flag
function toggleProxy(index) {
    students[index].proxy = !students[index].proxy;
    loadTeacherAttendance();
}

// 🔹 Load Assignments
function loadAssignments() {
    let html = "";

    students.forEach(s => {
        html += `
        <div class="assignment">
            <span>${s.name}</span>
            <button onclick="viewPDF('${s.assignment}')">View PDF</button>
        </div>
        `;
    });

    document.getElementById("assignmentContainer").innerHTML = html;
}

// 🔹 View PDF
function viewPDF(file) {
    // 🔥 backend se actual file ayega
    alert("Opening: " + file);
}

// 🔹 Auto Load (only if teacher page)
if (document.getElementById("attendanceContainer")) {
    loadTeacherAttendance();
    loadAssignments();
}

// 🔥 Global attendance state (simulate backend)
let attendanceActive = false;

// ================= TEACHER =================
function startAttendance() {
    attendanceActive = true;
    document.getElementById("attendanceStatus").innerText = "Status: ON ✅";

    alert("Live Attendance Started");
}

function stopAttendance() {
    attendanceActive = false;
    document.getElementById("attendanceStatus").innerText = "Status: OFF ❌";

    alert("Live Attendance Stopped");
}

// ================= STUDENT =================
function markAttendance() {
    if (!attendanceActive) {
        document.getElementById("status").innerText =
            "Attendance is OFF ❌";
        return;
    }

    document.getElementById("status").innerText =
        "Attendance Marked Successfully ✅";

    // backend call later
    /*
    fetch("/api/markAttendance", {
        method: "POST"
    });
    */
}