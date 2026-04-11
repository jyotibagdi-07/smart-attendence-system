// LOGIN
function login() {
    let enrollment = document.getElementById("enrollment").value;
    let password = document.getElementById("password").value;
    let role = document.getElementById("role").value;

    fetch("/login", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ enrollment, password, role })
    })
    .then(res => res.json())
    .then(data => {
        if (data.redirect) {
            localStorage.setItem("name", data.name);
            window.location.href = data.redirect;
        } else {
            alert(data.message);
        }
    });
}

// SIGNUP
function signup() {
    let name = document.getElementById("name").value;
    let enrollment = document.getElementById("new_enrollment").value;
    let password = document.getElementById("new_password").value;
    let role = document.getElementById("new_role").value;

    fetch("/signup", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ name, enrollment, password, role })
    })
    .then(res => res.json())
    .then(data => alert(data.message));
}

// STUDENT NAME
window.onload = function () {
    let name = localStorage.getItem("name");
    if (name && document.getElementById("name")) {
        document.getElementById("name").innerText = name;
    }
};

// ATTENDANCE
function markAttendance() {
    let name = document.getElementById("name").innerText;

    fetch("/mark_attendance", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ name })
    })
    .then(res => res.json())
    .then(data => {
        document.getElementById("status").innerText = data.message;
    });
}

// FILE UPLOAD
function uploadFile() {
    let file = document.querySelector(".file-input").files[0];
    let name = document.getElementById("name").innerText;

    let formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);

    fetch("/upload", {
        method: "POST",
        body: formData
    })
    .then(res => res.json())
    .then(data => alert(data.message));
}

// TEACHER
function loadTeacherData() {
    fetch("/get_attendance")
    .then(res => res.json())
    .then(data => {
        let html = "";
        data.forEach(s => {
            html += `<p>${s[1]} - ${s[2]} ${s[3]}</p>`;
        });
        document.getElementById("attendanceContainer").innerHTML = html;
    });

    fetch("/get_assignments")
    .then(res => res.json())
    .then(data => {
        let html = "";
        data.forEach(a => {
            html += `<p>${a[1]} submitted ${a[2]}</p>`;
        });
        document.getElementById("assignmentContainer").innerHTML = html;
    });
}