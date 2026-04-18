// ================= GLOBAL ERROR SAFETY =================
window.onerror = function(msg, url, line){
    console.log("JS ERROR:", msg, "at line", line);
};

// ================= INIT =================
document.addEventListener("DOMContentLoaded", () => {

    let name = localStorage.getItem("name");

    if(name){
        document.getElementById("studentName").innerText = "Welcome " + name;
    }

    showSection("dashboard");

    // Load everything
    loadAttendance();
    loadAssignments();
    loadNotes();
    loadAnnouncements();
    loadMarks();
});

// ================= UI MESSAGE =================
function showMsg(msg, color="green"){

    let box = document.getElementById("sideMessage");
    if(!box) return;

    box.innerText = msg;
    box.style.background = color;
    box.classList.add("show");

    setTimeout(()=>{
        box.classList.remove("show");
    },5000);
}

function handleResponse(d){
    let color = "green";

    if(d.status === "error") color = "red";
    if(d.status === "warning") color = "orange";

    showMsg(d.message || "Done", color);
}

// ================= SECTION CONTROL =================
function showSection(section){

    // ✅ UPDATED (added "marks")
    let sections = ["dashboard","attendance","assignments","notes","announcements","marks"];

    sections.forEach(id=>{
        let el = document.getElementById(id);
        if(el) el.style.display = "none";
    });

    let active = document.getElementById(section);
    if(active) active.style.display = "block";

    if(section==="attendance") loadAttendance();
    if(section==="assignments") loadAssignments();
    if(section==="notes") loadNotes();
    if(section==="announcements") loadAnnouncements();

    // ✅ NEW
    if(section==="marks") loadMarksTable();
}

// ================= DATE HELPER =================
function getToday(){
    return new Date().toISOString().split("T")[0];
}

// ================= ATTENDANCE =================
function loadAttendance(){

let name = localStorage.getItem("name");
if(!name) return;

Promise.all([
    fetch("/get_schedule").then(r=>r.json()).catch(()=>[]),
    fetch("/get_my_attendance/" + name).then(r=>r.json()).catch(()=>[]),
    fetch("/attendance_flag").then(r=>r.json()).catch(()=>({enabled:false}))
]).then(([classes, att, flag]) => {

    let table = document.getElementById("attendanceTable");
    if(!table) return;

    table.innerHTML = "";

    let present = 0;
    let total = classes.length;

    let today = getToday();

    if(total === 0){
        table.innerHTML = `<tr><td colspan="3">No class scheduled</td></tr>`;
        document.getElementById("attValue").innerText = "0%";
        return;
    }

    classes.forEach(c => {

        let date = c[1];

        let marked = att.some(a => a[1] === date);

        if(marked) present++;

        let canMark = flag.enabled && (date === today) && !marked;

        table.innerHTML += `
        <tr>
            <td>${date}</td>
            <td>${marked ? "✔ Present" : "⚪ Absent"}</td>
            <td>
                <button 
                onclick="markAttendance('${date}')"
                ${!canMark ? "disabled" : ""}>
                ${marked ? "Marked" : (date === today ? "Mark" : "Locked")}
                </button>
            </td>
        </tr>`;
    });

    let percent = Math.round((present / total) * 100);

    let fill = document.getElementById("progressFill");
    if(fill) fill.style.width = percent + "%";

    let text = document.getElementById("percentText");
    if(text) text.innerText = `Attendance: ${present}/${total} (${percent}%)`;

    let val = document.getElementById("attValue");
    if(val) val.innerText = percent + "%";

}).catch(()=>{
    showMsg("Failed to load attendance ❌","red");
});
}

// ================= MARK ATTENDANCE =================
function markAttendance(date){

let name = localStorage.getItem("name");
let today = getToday();

if(date !== today){
    showMsg("You can only mark today's attendance ❌","red");
    return;
}

fetch("/attendance_flag")
.then(r=>r.json())
.then(flag=>{

    if(!flag.enabled){
        showMsg("Attendance is OFF ❌","red");
        return;
    }

    fetch("/mark_class_attendance",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({name,date})
    })
    .then(r=>r.json())
    .then(d=>{
        handleResponse(d);

        setTimeout(()=>{
            loadAttendance();
        }, 200);
    });

})
.catch(()=>{
    showMsg("Server error ❌","red");
});
}

// ================= ASSIGNMENTS =================
function loadAssignments(){

fetch("/get_assignments")
.then(r=>r.json())
.then(data=>{

let val = document.getElementById("assignValue");
if(val) val.innerText = data.length;

let list = document.getElementById("assignmentList");
if(!list) return;

list.innerHTML = "";
let select = document.getElementById("assignmentSelect");
if(select) select.innerHTML = "<option value=''>Select Assignment</option>";

data.forEach(a=>{
    list.innerHTML += `
    <li>
        <b>${a[1]}</b><br>
        <small>${a[3]}</small><br>
        <a href="/uploads/${a[2]}" target="_blank">View Assignment</a>
    </li>`;
    
    if(select) select.innerHTML += `<option value="${a[0]}">${a[1]}</option>`;
});

loadSubmissions();
})
.catch(()=>{
    showMsg("Assignments load failed ❌","red");
});
}

function submitAssignment(){
    let assignmentId = document.getElementById("assignmentSelect").value;
    let file = document.getElementById("submissionFile").files[0];
    
    if(!assignmentId || !file){
        showMsg("Select assignment and file ❌","red");
        return;
    }
    
    let fd = new FormData();
    fd.append("assignment_id", assignmentId);
    fd.append("student_name", localStorage.getItem("name"));
    fd.append("student_enrollment", localStorage.getItem("enrollment"));
    fd.append("file", file);
    
    fetch("/submit_assignment", {method:"POST", body:fd})
    .then(r=>r.json())
    .then(d=>{
        handleResponse(d);
        loadSubmissions();
        // Clear the file input after successful submission
        document.getElementById("submissionFile").value = "";
    })
    .catch(()=>{
        showMsg("Submission failed ❌","red");
    });
}

function loadSubmissions(){
    let enrollment = localStorage.getItem("enrollment");
    
    fetch("/get_my_submissions/" + enrollment)
    .then(r=>r.json())
    .then(data=>{
        let list = document.getElementById("submissionList");
        if(!list) return;
        
        list.innerHTML = "";
        data.forEach(s=>{
            list.innerHTML += `
            <li id="submission-item-${s[0]}">
                <div class="assign-row">
                    <span class="assign-title">${s[1]} - ${s[5]}</span>
                    <div class="assign-actions">
                        <button class="danger-btn" onclick="showDeleteSubmission(${s[0]})">Delete</button>
                    </div>
                </div>
                <div class="assign-delete-confirm" id="submission-delete-${s[0]}" style="display:none;">
                    <span>Delete this submission?</span>
                    <button class="danger-btn" onclick="deleteSubmission(${s[0]})">Yes</button>
                    <button onclick="hideDeleteSubmission(${s[0]})">No</button>
                </div>
                <div class="submission-link"><a href="/uploads/${s[4]}" target="_blank">View Submission</a></div>
            </li>`;
        });
    })
    .catch(()=>{
        showMsg("Submissions load failed ❌","red");
    });
}

function showDeleteSubmission(id){
    let confirmBox = document.getElementById(`submission-delete-${id}`);
    if(confirmBox) confirmBox.style.display = "flex";
}

function hideDeleteSubmission(id){
    let confirmBox = document.getElementById(`submission-delete-${id}`);
    if(confirmBox) confirmBox.style.display = "none";
}

function deleteSubmission(id){
    fetch(`/delete_submission/${id}`, {method:"DELETE"})
    .then(r=>r.json())
    .then(d=>{
        handleResponse(d);
        loadSubmissions();
    });
}

// ================= NOTES =================
function loadNotes(){

fetch("/get_notes")
.then(r=>r.json())
.then(data=>{

let list = document.getElementById("notesList");
if(!list) return;

list.innerHTML = "";

if(data.length === 0){
    list.innerHTML = "<p>No notes available</p>";
    return;
}

data.forEach(n=>{
    list.innerHTML += `
    <li>
        <b>${n[1]}</b><br>
        <a href="/uploads/${n[2]}" target="_blank">Open</a>
    </li>`;
});
})
.catch(()=>{
    showMsg("Notes load failed ❌","red");
});
}

// ================= ANNOUNCEMENTS =================
function loadAnnouncements(){

fetch("/get_announcements")
.then(r=>r.json())
.then(data=>{

let list = document.getElementById("announcementList");
if(!list) return;

list.innerHTML = "";

data.forEach(a=>{
    list.innerHTML += `
    <li>
        <b>${a[1]}</b><br>
        <small>${a[2]}</small>
    </li>`;
});
})
.catch(()=>{
    showMsg("Announcements load failed ❌","red");
});
}

// ================= MARKS (DASHBOARD TOTAL) =================
function loadMarks(){

fetch("/get_marks")
.then(r=>r.json())
.then(data=>{

let name = localStorage.getItem("name");
let student = data.find(m => m[1] === name);

let val = document.getElementById("marksValue");

if(!student){
    if(val) val.innerText = "0";
    return;
}

let total =
    (student[2] || 0) +
    (student[3] || 0) +
    (student[4] || 0) +
    (student[5] || 0);

if(val) val.innerText = total;

})
.catch(()=>{
    showMsg("Marks load failed ❌","red");
});
}

// ================= MARKS TABLE (NEW) =================
function loadMarksTable(){

fetch("/get_marks")
.then(r=>r.json())
.then(data=>{

let name = localStorage.getItem("name");
let table = document.getElementById("marksTable");
if(!table) return;

table.innerHTML = "";

let student = data.find(m => m[1] === name);

if(!student){
    table.innerHTML = "<tr><td colspan='2'>No marks available</td></tr>";
    return;
}

let mid = student[2] || 0;
let end = student[3] || 0;
let cap = student[4] || 0;
let lab = student[5] || 0;

let total = mid + end + cap + lab;

// ✅ VERTICAL TABLE
table.innerHTML = `
<tr><th>Name</th><td>${student[1]}</td></tr>
<tr><th>Mid</th><td>${mid}</td></tr>
<tr><th>End</th><td>${end}</td></tr>
<tr><th>Cap</th><td>${cap}</td></tr>
<tr><th>Lab</th><td>${lab}</td></tr>
<tr><th>Total</th><td><b>${total}</b></td></tr>
`;

})
.catch(()=>{
    showMsg("Marks table load failed ❌","red");
});
}

// ================= LOGOUT =================
function logout(){
    localStorage.clear();
    location.href = "/";
}