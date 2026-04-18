// ================= INIT =================
window.onload = function(){
    showTeacher("dashboard");
    loadStatus();
};

// ================= SIDE MESSAGE =================
function showMsg(msg, color="green") {
    let box = document.getElementById("sideMessage");

    if(!box){
        box = document.createElement("div");
        box.id = "sideMessage";
        box.className = "side-message";
        document.body.appendChild(box);
    }

    box.innerText = msg;
    box.style.background = color === "red" ? "#e74c3c" :
                           color === "orange" ? "#f39c12" : "#2ecc71";

    box.classList.add("show");

    setTimeout(() => {
        box.classList.remove("show");
    }, 5000);
}

// ================= SAFE RESPONSE =================
function handleResponse(d){
    let color = "green";

    if(d.status === "error") color = "red";
    if(d.status === "warning") color = "orange";

    let msg = d.message || "Done ✅";

    showMsg(msg, color);
}

// ================= NAVIGATION =================
function showTeacher(section){

    let all = ["dashboard","students","schedule","assignments","notes","announcements","marks"];

    all.forEach(id=>{
        let el = document.getElementById(id);
        if(el) el.style.display="none";
    });

    let sec = document.getElementById(section);
    if(sec) sec.style.display="block";

    if(section==="dashboard") loadRecentSubmissions();
    if(section==="students") loadStudents();
    if(section==="schedule") loadSchedule();
    if(section==="assignments") loadAssignments();
    if(section==="notes") loadNotes();
    if(section==="marks") loadMarks();
}

function loadRecentSubmissions(){
    fetch("/get_recent_submissions")
    .then(r=>r.json())
    .then(data=>{
        let list = document.getElementById("recentSubmissions");
        if(!list) return;

        list.innerHTML = "";
        if(!data || data.length === 0) {
            list.innerHTML = "<li>No recent submissions</li>";
            return;
        }

        data.forEach(item=>{
            list.innerHTML += `
            <li>
                <strong>${item.assignment_title}</strong><br>
                ${item.student_name} (${item.student_enrollment})<br>
                <small>${item.time}</small><br>
                <a href="/uploads/${item.filename}" target="_blank">View Submission</a>
            </li>`;
        });
    })
    .catch(()=>{
        showMsg("Recent submissions load failed ❌","red");
    });
}

// ================= ATTENDANCE =================
function loadStatus(){
    fetch("/attendance_flag")
    .then(r=>r.json())
    .then(d=>{
        document.getElementById("attStatus").innerText =
        d.enabled ? "ON ✅" : "OFF ❌";
    })
    .catch(()=>{
        document.getElementById("attStatus").innerText = "OFF ❌";
        showMsg("Status load failed ❌","red");
    });
}

function toggleAttendance(){
    fetch("/toggle_attendance",{method:"POST"})
    .then(r=>r.json())
    .then(d=>{
        handleResponse(d);
        loadStatus();
    })
    .catch(()=>{
        showMsg("Toggle failed ❌","red");
    });
}

// ================= SCHEDULE =================
function scheduleClass(){

let date = document.getElementById("classDate").value;

if(!date){
    showMsg("Please select date ❌","red");
    return;
}

fetch("/schedule_class",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({date})
})
.then(r=>r.json())
.then(d=>{
    handleResponse(d);
    loadSchedule();
    loadStudents();
});
}

function loadSchedule(){

fetch("/get_schedule")
.then(r=>r.json())
.then(data=>{

let list=document.getElementById("scheduleList");
list.innerHTML="";

data.forEach(c=>{
    list.innerHTML+=`<li>📅 ${c[1]}</li>`;
});

});
}

// ================= STUDENTS =================
function loadStudents(){

fetch("/get_schedule")
.then(r=>r.json())
.then(classes=>{

fetch("/get_students")
.then(r=>r.json())
.then(students=>{

fetch("/get_class_attendance")
.then(r=>r.json())
.then(att=>{

let table=document.getElementById("studentTable");
table.innerHTML="";

// ✅ FIX 1: dynamic header
let header = document.getElementById("dynamicHeader");
header.innerHTML = "<th>Name</th><th>Enrollment</th>";

classes.forEach(c=>{
    header.innerHTML += `<th>${c[1]}</th>`;
});

// ✅ FIX 2: empty students safety
if(!students || students.length===0){
    table.innerHTML = "<tr><td colspan='10'>No students found</td></tr>";
    return;
}

students.forEach(s=>{

let row=`<tr>
<td>${s[0]}</td>
<td>${s[1]}</td>`;

classes.forEach(c=>{

let date=c[1];

// ✅ FIX 3: correct attendance check
let marked = att.some(a =>
    a[1] == s[0] && a[2] == date
);

row+=`
<td>
${marked ? "✔️" : "⚪"}<br>
<button onclick="markAttendance('${s[0]}','${date}')"
${marked ? "disabled" : ""}>
${marked ? "Done" : "Mark"}
</button>
</td>`;
});

row+="</tr>";
table.innerHTML+=row;

});

});
});
});
}

// ================= MARK ATTENDANCE =================
function markAttendance(name,date){

fetch("/mark_class_attendance",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({name,date})
})
.then(r=>r.json())
.then(d=>{
    handleResponse(d);
    loadStudents();
});
}

// ================= ASSIGNMENTS =================
function uploadAssignment(){

let title=document.getElementById("assignTitle").value;
let desc=document.getElementById("assignDesc").value;
let file=document.getElementById("assignFile").files[0];

if(!title || !file){
    showMsg("Fill all fields ❌","red");
    return;
}

let fd=new FormData();
fd.append("title",title);
fd.append("desc",desc);
fd.append("file",file);

fetch("/upload_assignment",{method:"POST",body:fd})
.then(r=>r.json())
.then(d=>{
    handleResponse(d);
    loadAssignments();
});
}

function loadAssignments(){
fetch("/get_assignments")
.then(r=>r.json())
.then(data=>{
    let list=document.getElementById("assignList");
    list.innerHTML="";
    
    data.forEach(a=>{
        list.innerHTML+=`
        <li id="assign-item-${a[0]}">
            <div class="assign-row">
                <span class="assign-title">${a[1]}</span>
                <div class="assign-actions">
                    <button class="action-btn" onclick="toggleEditAssignment(${a[0]})">Edit</button>
                    <button class="danger-btn" onclick="showDeleteAssignment(${a[0]})">Delete</button>
                </div>
            </div>
            <div class="assign-edit" id="assign-edit-${a[0]}" style="display:none;">
                <input id="assign-input-${a[0]}" value="${a[1]}" />
                <button onclick="saveAssignment(${a[0]})">Save</button>
                <button onclick="cancelEditAssignment(${a[0]})">Cancel</button>
            </div>
            <div class="assign-delete-confirm" id="assign-delete-${a[0]}" style="display:none;">
                <span>Delete this assignment?</span>
                <button class="danger-btn" onclick="deleteAssignment(${a[0]})">Yes</button>
                <button onclick="hideDeleteAssignment(${a[0]})">No</button>
            </div>
        </li>`;
    });
});
}

function toggleEditAssignment(id){
    let edit = document.getElementById(`assign-edit-${id}`);
    if(!edit) return;
    edit.style.display = edit.style.display === "none" ? "flex" : "none";
}

function cancelEditAssignment(id){
    let edit = document.getElementById(`assign-edit-${id}`);
    if(edit) edit.style.display = "none";
}

function saveAssignment(id){
    let input = document.getElementById(`assign-input-${id}`);
    if(!input) return;
    let newTitle = input.value.trim();

    if(!newTitle){
        showMsg("Title cannot be empty ❌","red");
        return;
    }

    fetch(`/edit_assignment/${id}`, {
        method:"PUT",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({title: newTitle})
    })
    .then(r=>r.json())
    .then(d=>{
        handleResponse(d);
        loadAssignments();
    });
}

function showDeleteAssignment(id){
    let confirmBox = document.getElementById(`assign-delete-${id}`);
    if(confirmBox) confirmBox.style.display = "flex";
}

function hideDeleteAssignment(id){
    let confirmBox = document.getElementById(`assign-delete-${id}`);
    if(confirmBox) confirmBox.style.display = "none";
}

function deleteAssignment(id){
    fetch(`/delete_assignment/${id}`, {method:"DELETE"})
    .then(r=>r.json())
    .then(d=>{
        handleResponse(d);
        loadAssignments();
    });
}

// ================= NOTES =================
function uploadNotes(){

let title=document.getElementById("noteTitle").value;
let file=document.getElementById("noteFile").files[0];

if(!title || !file){
    showMsg("Fill all fields ❌","red");
    return;
}

let fd=new FormData();
fd.append("title",title);
fd.append("file",file);

fetch("/upload_notes",{method:"POST",body:fd})
.then(r=>r.json())
.then(d=>{
    handleResponse(d);
    loadNotes();
});
}

function loadNotes(){
fetch("/get_notes")
.then(r=>r.json())
.then(data=>{
    let list=document.getElementById("noteList");
    list.innerHTML="";
    data.forEach(n=>{
        list.innerHTML+=`
        <li id="note-item-${n[0]}">
            <div class="assign-row">
                <span class="assign-title">${n[1]}</span>
                <div class="assign-actions">
                    <button class="action-btn" onclick="toggleEditNotes(${n[0]})">Edit</button>
                    <button class="danger-btn" onclick="showDeleteNotes(${n[0]})">Delete</button>
                </div>
            </div>
            <div class="assign-edit" id="note-edit-${n[0]}" style="display:none;">
                <input id="note-input-${n[0]}" value="${n[1]}" />
                <button onclick="saveNotes(${n[0]})">Save</button>
                <button onclick="cancelEditNotes(${n[0]})">Cancel</button>
            </div>
            <div class="assign-delete-confirm" id="note-delete-${n[0]}" style="display:none;">
                <span>Delete these notes?</span>
                <button class="danger-btn" onclick="deleteNotes(${n[0]})">Yes</button>
                <button onclick="hideDeleteNotes(${n[0]})">No</button>
            </div>
            <div class="note-link">- <a href="/uploads/${n[2]}" target="_blank">Open</a></div>
        </li>`;
    });
});
}

function toggleEditNotes(id){
    let edit = document.getElementById(`note-edit-${id}`);
    if(!edit) return;
    edit.style.display = edit.style.display === "none" ? "flex" : "none";
}

function cancelEditNotes(id){
    let edit = document.getElementById(`note-edit-${id}`);
    if(edit) edit.style.display = "none";
}

function saveNotes(id){
    let input = document.getElementById(`note-input-${id}`);
    if(!input) return;

    let newTitle = input.value.trim();
    if(!newTitle){
        showMsg("Title cannot be empty ❌","red");
        return;
    }

    fetch(`/edit_notes/${id}`, {
        method:"PUT",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({title: newTitle})
    })
    .then(r=>r.json())
    .then(d=>{
        handleResponse(d);
        loadNotes();
    });
}

function showDeleteNotes(id){
    let confirmBox = document.getElementById(`note-delete-${id}`);
    if(confirmBox) confirmBox.style.display = "flex";
}

function hideDeleteNotes(id){
    let confirmBox = document.getElementById(`note-delete-${id}`);
    if(confirmBox) confirmBox.style.display = "none";
}

function deleteNotes(id){
    fetch(`/delete_notes/${id}`, {method:"DELETE"})
    .then(r=>r.json())
    .then(d=>{
        handleResponse(d);
        loadNotes();
    });
}

// ================= ANNOUNCEMENTS =================
function postAnnouncement(){

let msg=document.getElementById("announcementInput").value;

if(!msg){
    showMsg("Message required ❌","red");
    return;
}

fetch("/add_announcement",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({message:msg})
})
.then(r=>r.json())
.then(d=>{
    handleResponse(d);
});
}

// ================= MARKS =================
function loadMarks(){

fetch("/get_students")
.then(r=>r.json())
.then(students=>{

let table=document.getElementById("marksTable");
table.innerHTML="";

if(!students || students.length===0){
    table.innerHTML="<tr><td colspan='7'>No students found</td></tr>";
    return;
}

students.forEach(s=>{

let name = s[0];
let enroll = s[1];

table.innerHTML+=`
<tr>
<td>${name}</td>
<td>${enroll}</td>

<td><input type="number" id="mid_${enroll}" placeholder="Mid"></td>
<td><input type="number" id="end_${enroll}" placeholder="End"></td>
<td><input type="number" id="cap_${enroll}" placeholder="Cap"></td>
<td><input type="number" id="lab_${enroll}" placeholder="Lab"></td>

<td>
<button onclick="saveMarks('${name}','${enroll}')">
💾 Save
</button>
</td>
</tr>
`;

});

})
.catch(()=>{
    showMsg("Failed to load students ❌","red");
});
}

// ================= SAVE MARKS =================
function saveMarks(name,enroll){

let mid = document.getElementById("mid_"+enroll).value;
let end = document.getElementById("end_"+enroll).value;
let cap = document.getElementById("cap_"+enroll).value;
let lab = document.getElementById("lab_"+enroll).value;

mid = mid ? Number(mid) : 0;
end = end ? Number(end) : 0;
cap = cap ? Number(cap) : 0;
lab = lab ? Number(lab) : 0;

if(mid < 0 || mid > 15 || end < 0 || end > 60 || cap < 0 || cap > 10 || lab < 0 || lab > 15){
    showMsg("Invalid credentials ❌","red");
    return;
}

fetch("/save_marks",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
        name:name,
        enrollment:enroll,
        mid:mid,
        end:end,
        cap:cap,
        lab:lab
    })
})
.then(r=>r.json())
.then(d=>{
    handleResponse(d);
})
.catch(()=>{
    showMsg("Save failed ❌","red");
});
}

// ================= LOGOUT =================
function logout(){
localStorage.clear();
location.href="/";
}