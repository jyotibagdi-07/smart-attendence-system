//////////////////////////////////////////////////
// LOGIN
//////////////////////////////////////////////////
function login(){
let e=document.getElementById("enrollment").value;
let p=document.getElementById("password").value;
let r=document.getElementById("role").value;

fetch("/login",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({enrollment:e,password:p,role:r})
})
.then(r=>r.json())
.then(d=>{
if(d.redirect){
localStorage.setItem("name",d.name);
localStorage.setItem("enrollment",e);
localStorage.setItem("role",r);
location.href=d.redirect;
}else alert(d.message);
});
}

function logout(){
localStorage.clear();
location.href="/";
}

//////////////////////////////////////////////////
// CHANGE PASSWORD
//////////////////////////////////////////////////
function togglePasswordBox(){
let box=document.getElementById("passwordBox");
if(box) box.style.display = box.style.display==="none"?"block":"none";
}

function changePassword(){
fetch("/change_password",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({
enrollment:localStorage.getItem("enrollment"),
old:document.getElementById("oldPass").value,
new:document.getElementById("newPass").value
})
})
.then(r=>r.json())
.then(d=>alert(d.message));
}

//////////////////////////////////////////////////
// STUDENT SECTION
//////////////////////////////////////////////////
if(document.getElementById("studentName")){

let name=localStorage.getItem("name");
document.getElementById("studentName").innerText=name;

// SECTION SWITCH
window.showSection=function(section){

document.querySelectorAll(".section").forEach(sec=>{
sec.style.display="none";
});

if(section==="dashboard"){
document.getElementById("dashboardSection").style.display="block";
loadDashboard();
}
else if(section==="attendance"){
document.getElementById("attendanceSection").style.display="block";
loadAttendance();
checkAttendance();
}
else if(section==="assignment"){
document.getElementById("assignmentSection").style.display="block";
loadAssignments();
}
else if(section==="notes"){
document.getElementById("notesSection").style.display="block";
loadNotes();
}
else if(section==="announcements"){
document.getElementById("announcementsSection").style.display="block";
loadAnnouncements();
}
}

// DASHBOARD
function loadDashboard(){

fetch("/get_attendance").then(r=>r.json()).then(data=>{
let my=data.filter(d=>d[1]===name);
let present=my.length;
let total=10;

let percent=Math.round((present/total)*100);
document.getElementById("attValue").innerText=percent+"%";

if(window.pieChart) window.pieChart.destroy();

window.pieChart=new Chart(document.getElementById("pieChart"),{
type:"doughnut",
data:{
labels:["Present","Absent"],
datasets:[{data:[present,total-present]}]
}
});
});

fetch(`/get_assignments?name=${name}&role=student`)
.then(r=>r.json())
.then(d=>{

document.getElementById("assignValue").innerText=d.length;

if(window.assignChart) window.assignChart.destroy();

window.assignChart = new Chart(
document.getElementById("assignChart"),
{
type:"doughnut",
data:{
labels:["Submitted","Pending"],
datasets:[{
data:[d.length, 5 - d.length],
backgroundColor:["#4caf50","#e0e0e0"]
}]
}
});

});

fetch("/get_marks")
.then(r=>r.json())
.then(data=>{

let m = data.find(x=>x[1]===name);

let mid = 0;
let end = 0;

if(m){
   mid = m[2];
   end = m[3];
}

document.getElementById("marksValue").innerText = mid + end;

if(window.barChart) window.barChart.destroy();

window.barChart = new Chart(document.getElementById("barChart"),{
type:"bar",
data:{
labels:["Mid Exam","End Exam"],
datasets:[{
label:"Marks",
data:[mid,end],
backgroundColor:["#5f5fff","#ff9800"]
}]
},
options:{
responsive:true,
scales:{y:{beginAtZero:true,max:100}}
}
});
});

}
 // ✅ THIS WAS MISSING
// ATTENDANCE
function loadAttendance(){
fetch("/get_attendance").then(r=>r.json()).then(data=>{
let my=data.filter(d=>d[1]===name);
let present=my.length;
let total=10;

let percent=(present/total)*100;
document.getElementById("progressFill").style.width=percent+"%";
document.getElementById("percentText").innerText=`${present}/${total}`;
});
}

function checkAttendance(){
fetch("/attendance_status")
.then(r=>r.json())
.then(d=>{
let btn=document.getElementById("attBtn");
btn.disabled=!d.enabled;
btn.innerText=d.enabled?"Mark Attendance":"Closed ❌";
});
}

window.markAttendance=function(){
fetch("/mark_attendance",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({name:name})
})
.then(r=>r.json())
.then(d=>{
alert(d.message);
loadAttendance();
});
}

// ASSIGNMENTS
function loadAssignments(){
fetch(`/get_assignments?name=${name}&role=student`)
.then(r=>r.json())
.then(data=>{
let list=document.getElementById("assignmentList");
list.innerHTML="";

data.forEach(a=>{
list.innerHTML+=`<li>
<a href="/uploads/${a[2]}" target="_blank">${a[2]}</a>
</li>`;
});
});
}

window.uploadFile=function(){
let file=document.getElementById("fileInput").files[0];
let fd=new FormData();
fd.append("file",file);
fd.append("name",name);

fetch("/upload",{method:"POST",body:fd})
.then(r=>r.json())
.then(d=>{
alert(d.message);
loadAssignments();
});
}
window.uploadNotes=function(){

let file=document.getElementById("notesFile").files[0];

let fd=new FormData();
fd.append("file",file);
fd.append("type","notes");

fetch("/upload_notes",{method:"POST",body:fd})
.then(r=>r.json())
.then(d=>{
alert(d.message);
loadNotes();
});

}

// NOTES
function loadNotes(){
fetch("/get_notes")
.then(r=>r.json())
.then(data=>{
let list=document.getElementById("notesList");
list.innerHTML="";

data.forEach(n=>{
list.innerHTML+=`<li>
<a href="/uploads/${n[2]}" target="_blank">${n[1]}</a>
</li>`;
});
});
}

// ANNOUNCEMENTS
function loadAnnouncements(){
fetch("/get_announcements")
.then(r=>r.json())
.then(data=>{
let list=document.getElementById("announcementList");
list.innerHTML="";

data.forEach(a=>{
list.innerHTML+=`<li>${a[2]} - ${a[1]}</li>`;
});
});
}

// AUTO LOAD
document.addEventListener("DOMContentLoaded",function(){
setTimeout(()=>showSection("dashboard"),100);
});
}

//////////////////////////////////////////////////
// TEACHER SECTION
//////////////////////////////////////////////////
if(document.getElementById("teacherName")){

document.getElementById("teacherName").innerText =
"Hi " + localStorage.getItem("name");

// SWITCH
window.showTeacher=function(section){

document.querySelectorAll(".section").forEach(sec=>{
sec.style.display="none";
});

if(section==="dashboard"){
document.getElementById("teacherDashboard").style.display="block";
loadStatus();
}
else if(section==="students"){
document.getElementById("studentSection").style.display="block";
loadStudents();
}
else if(section==="assignments"){
document.getElementById("assignmentSection").style.display="block";
loadAssignmentsTeacher();
}
else if(section==="announcements"){
document.getElementById("announcementSection").style.display="block";
}
else if(section==="marks"){
document.getElementById("marksSection").style.display="block";
loadMarks();
}
}

// ATTENDANCE STATUS
function loadStatus(){
fetch("/attendance_status")
.then(r=>r.json())
.then(d=>{
document.getElementById("attStatus").innerText =
d.enabled ? "ON ✅" : "OFF ❌";
});
}

window.toggleAttendance=function(){
fetch("/toggle_attendance",{method:"POST"})
.then(()=>loadStatus());
}

// STUDENTS
function loadStudents(){
fetch("/get_students").then(r=>r.json()).then(students=>{
fetch("/get_attendance").then(r=>r.json()).then(att=>{

let today=new Date().toISOString().slice(0,10);

let table=document.getElementById("studentTable");
table.innerHTML="";

students.forEach(s=>{
let marked=att.some(a=>a[1]===s[0] && a[2]===today);

table.innerHTML+=`
<tr>
<td>${s[0]}</td>
<td>${s[1]}</td>
<td style="color:${marked?'green':'grey'}">
${marked?'✔':'✖'}
</td>
</tr>`;
});

});
});
}

// ASSIGNMENTS
function loadAssignmentsTeacher(){
fetch("/get_assignments?role=teacher")
.then(r=>r.json())
.then(data=>{
let list=document.getElementById("teacherAssignList");
list.innerHTML="";

data.forEach(a=>{
list.innerHTML+=`
<li>
${a[2]} - <a href="/uploads/${a[2]}" target="_blank">View</a>
</li>`;
});
});
}

window.uploadAssignment=function(){
let fd=new FormData();
fd.append("file",document.getElementById("assignFile").files[0]);
fd.append("name","teacher");

fetch("/upload",{method:"POST",body:fd})
.then(r=>r.json())
.then(d=>{
alert(d.message);
loadAssignmentsTeacher();
});
}

// ANNOUNCEMENTS
window.postAnnouncement=function(){
fetch("/add_announcement",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({
message:document.getElementById("announcementInput").value
})
})
.then(r=>r.json())
.then(d=>alert(d.message));
}

// MARKS
function loadMarks(){
fetch("/get_students").then(r=>r.json()).then(students=>{
let table=document.getElementById("marksTable");
table.innerHTML="";

students.forEach(s=>{
table.innerHTML+=`
<tr>
<td>${s[0]}</td>
<td>${s[1]}</td>
<td><input id="mid_${s[1]}" style="width:60px"></td>
<td><input id="end_${s[1]}" style="width:60px"></td>
<td><button onclick="updateMarks('${s[0]}','${s[1]}')">Update</button></td>
</tr>`;
});
});
}

window.updateMarks=function(name,enroll){
let mid=document.getElementById("mid_"+enroll).value;
let end=document.getElementById("end_"+enroll).value;

fetch("/save_marks",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({name,mid,end})
})
.then(r=>r.json())
.then(d=>alert(d.message));
}

// SEARCH
window.searchStudent=function(){
let val=document.getElementById("searchEnroll").value;

fetch("/get_students").then(r=>r.json()).then(students=>{
let s=students.find(x=>x[1]===val);

if(!s){ alert("Not found"); return; }

document.getElementById("marksTable").innerHTML=`
<tr>
<td>${s[0]}</td>
<td>${s[1]}</td>
<td><input id="mid_${s[1]}"></td>
<td><input id="end_${s[1]}"></td>
<td><button onclick="updateMarks('${s[0]}','${s[1]}')">Update</button></td>
</tr>`;
});
}

// AUTO LOAD
document.addEventListener("DOMContentLoaded",function(){
showTeacher("dashboard");
});
}