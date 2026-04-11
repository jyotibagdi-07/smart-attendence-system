// ================= LOADER =================
function showLoader() {
  const loader = document.getElementById("loader");
  if (loader) loader.style.display = "flex";
}

function hideLoader() {
  const loader = document.getElementById("loader");
  if (loader) loader.style.display = "none";
}

window.addEventListener("load", () => {
  setTimeout(hideLoader, 400);
});


// ================= LOGIN =================
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const enrollment = document.getElementById("enrollment").value.trim();
    const password = document.getElementById("password").value.trim();
    const role = document.getElementById("role").value;

    if (!enrollment || !password || !role) {
      alert("Fill all fields ❌");
      return;
    }

    showLoader();

    const res = await fetch("/login", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ enrollment, password, role })
    });

    const data = await res.json();

    if (data.redirect) {
      localStorage.setItem("name", data.name);
      localStorage.setItem("enrollment", enrollment);
      localStorage.setItem("role", role);

      window.location.href = data.redirect;
    } else {
      hideLoader();
      alert(data.message);
    }
  });
}


// ================= PASSWORD TOGGLE =================
const passwordInput = document.getElementById("password");
const toggleBtn = document.getElementById("togglePassword");

if (toggleBtn && passwordInput) {
  toggleBtn.addEventListener("click", () => {
    const hidden = passwordInput.type === "password";
    passwordInput.type = hidden ? "text" : "password";
    toggleBtn.textContent = hidden ? "🙈" : "👁️";
  });
}


// ==================================================
// ================= STUDENT SECTION =================
// ==================================================

if (document.getElementById("attendanceTable")) {

  // Show name
  const name = localStorage.getItem("name");
  if (document.getElementById("studentName")) {
    document.getElementById("studentName").innerText = "Hi, " + name;
  }

  // LOAD ATTENDANCE
  async function loadAttendance() {
    const res = await fetch("/get_attendance");
    const data = await res.json();

    const table = document.querySelector("#attendanceTable tbody");
    table.innerHTML = "";

    data.forEach(row => {
      table.innerHTML += `
        <tr>
          <td>${row[1]}</td>
          <td>${row[2]}</td>
          <td>${row[3]}</td>
        </tr>
      `;
    });
  }

  // MARK ATTENDANCE
  window.markAttendance = async function () {
  const name = localStorage.getItem("name");

  const res = await fetch("/mark_attendance", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ name })
  });

  const data = await res.json();
  alert(data.message);
};

  // LOAD FILES (FIXED 🔥)
  async function loadFiles() {
    const res = await fetch("/get_assignments");
    const data = await res.json();

    const list = document.getElementById("filesList");

    if (!list) return;

    list.innerHTML = "";

    data.forEach(file => {
      list.innerHTML += `
        <li style="margin-bottom:8px;">
          <a href="/uploads/${file[2]}" target="_blank">
            📄 ${file[2]}
          </a>
        </li>
      `;
    });
  }

  loadAttendance();
  loadFiles();
}


// ==================================================
// ================= TEACHER SECTION =================
// ==================================================

if (document.getElementById("teacherName")) {

  // Show teacher name
  document.getElementById("teacherName").innerText =
    "Hi, " + (localStorage.getItem("name") || "Teacher") + " 👋";


  // UPLOAD FILE
  window.uploadFile = async function (inputId, type) {
    const file = document.getElementById(inputId).files[0];

    if (!file) {
      alert("Select file ❌");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", type);

    const res = await fetch("/upload", {
      method: "POST",
      body: formData
    });

    const data = await res.json();
    alert(data.message);
  };

  // LOGOUT
  window.logout = function () {
    localStorage.clear();
    window.location.href = "/";
  };
}
//toggle attendance
window.toggleAttendance = async function () {
  const res = await fetch("/toggle_attendance", {
    method: "POST"
  });

  const data = await res.json();

  document.getElementById("attendanceStatus").innerText = data.status;
};