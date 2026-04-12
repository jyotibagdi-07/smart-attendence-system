// ================= LOGIN =================
function login(){
let e=document.getElementById("enrollment").value;
let p=document.getElementById("password").value;
let r=document.getElementById("role").value;

fetch("/login",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({enrollment:e,password:p,role:r})
})
.then(res=>res.json())
.then(d=>{
if(d.redirect){
localStorage.setItem("name",d.name);
location.href=d.redirect;
}else alert(d.message);
});
}


// LOGOUT
function logout(){
localStorage.clear();
location.href="/";
}

//////////////////////////////////////////////////
// STUDENT
//////////////////////////////////////////////////

if(document.getElementById("studentName")){

let name=localStorage.getItem("name");
document.getElementById("studentName").innerText=name;

// SWITCH
window.showSection=function(section){

document.getElementById("dashboardSection").style.display="none";
document.getElementById("attendanceSection").style.display="none";
document.getElementById("assignmentSection").style.display="none";

if(section==="dashboard"){
document.getElementById("dashboardSection").style.display="block";
loadDashboard();
}
else if(section==="attendance"){
document.getElementById("attendanceSection").style.display="block";
}
else{
document.getElementById("assignmentSection").style.display="block";
loadAssignments();
}
}

// DASHBOARD
// PIE CHART
new Chart(document.getElementById("pieChart"),{
type:"doughnut",
data:{
labels:["Present","Absent"],
datasets:[{
data:[present,total-present]
}]
}
});
// BAR CHART
new Chart(document.getElementById("barChart"),{
type:"bar",
data:{
labels:["Mid","End"],
datasets:[{
label:"Marks",
data:[Math.random()*30, Math.random()*60]
}]
}
});

function loadDashboard(){

fetch("/get_attendance")
.then(r=>r.json())
.then(data=>{
let my=data.filter(d=>d[1]===name);
let present=my.length;
let percent=present*10;

document.getElementById("attValue").innerText=percent+"%";

new Chart(document.getElementById("pieChart"),{
type:"doughnut",
data:{
labels:["Present","Absent"],
datasets:[{data:[present,10-present]}]
}
});
});

fetch("/get_assignments")
.then(r=>r.json())
.then(data=>{
document.getElementById("assignValue").innerText=data.length;
});

fetch("/get_marks")
.then(r=>r.json())
.then(data=>{
let my=data.find(m=>m[1]===name);

if(my){
let total=my[2]+my[3];
document.getElementById("marksValue").innerText=total;

new Chart(document.getElementById("barChart"),{
type:"bar",
data:{
labels:["Mid","End"],
datasets:[{data:[my[2],my[3]]}]
}
});
}
});
}

window.markAttendance=function(){
fetch("/mark_attendance",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({name:name})
})
.then(r=>r.json())
.then(d=>alert(d.message));
}

// ASSIGNMENT
window.uploadFile=function(){
let file=document.getElementById("fileInput").files[0];
let fd=new FormData();
fd.append("file",file);
fd.append("name",name);

fetch("/upload",{method:"POST",body:fd})
.then(r=>r.json())
.then(d=>alert(d.message));
}

loadDashboard();
}
// ATTENDANCE
window.markAttendance=function(){
fetch("/mark_attendance",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({name:name})
})
.then(r=>r.json()).then(d=>alert(d.message));
}

function loadAttendance(){
fetch("/get_attendance")
.then(r=>r.json())
.then(data=>{

let my=data.filter(d=>d[1]===name);
let percent=my.length*10;

document.getElementById("progressFill").style.width=percent+"%";
document.getElementById("percentText").innerText=percent+"%";

});
}

// ASSIGNMENTS
function loadAssignments(){
fetch("/get_assignments")
.then(r=>r.json())
.then(data=>{

let list=document.getElementById("assignmentList");
list.innerHTML="";

data.forEach(a=>{
list.innerHTML+=`
<li>
<a href="/uploads/${a[2]}" target="_blank">${a[2]}</a>
<span class="status green">Submitted</span>
</li>`;
});

});
}

// ================= TEACHER DASHBOARD =================

if(document.getElementById("teacherName")){

// show teacher name
document.getElementById("teacherName").innerText =
"Hi, " + (localStorage.getItem("name") || "Teacher");

// SWITCH
function showTeacher(section){

document.getElementById("teacherDashboard").style.display="none";
document.getElementById("studentSection").style.display="none";
document.getElementById("marksSection").style.display="none";

if(section==="dashboard"){
document.getElementById("teacherDashboard").style.display="block";
loadTeacherDashboard();
}
else if(section==="students"){
document.getElementById("studentSection").style.display="block";
loadStudents();
}
else{
document.getElementById("marksSection").style.display="block";
loadMarksTable();
}
}

// LOAD DASHBOARD
function loadTeacherDashboard(){

fetch("/get_attendance")
.then(r=>r.json())
.then(data=>{
document.getElementById("totalAttendance").innerText=data.length;
});

fetch("/get_assignments")
.then(r=>r.json())
.then(data=>{
document.getElementById("totalAssignments").innerText=data.length;
});

fetch("/get_students")
.then(r=>r.json())
.then(data=>{
document.getElementById("totalStudents").innerText=data.length;
});

}

// LOAD STUDENTS
function loadStudents(){

fetch("/get_students")
.then(r=>r.json())
.then(data=>{

let html="";
data.forEach(s=>{
html+=`<tr>
<td>${s[1]}</td>
<td>${s[2]}</td>
</tr>`;
});

document.getElementById("studentTable").innerHTML=html;

});

}

// SAVE MARKS
window.saveMarks=function(){

let name=document.getElementById("studentNameInput").value;
let mid=document.getElementById("midMarksInput").value;
let end=document.getElementById("endMarksInput").value;

fetch("/save_marks",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({name,mid,end})
})
.then(r=>r.json())
.then(d=>{
alert(d.message);
loadMarksTable();
});

}

// LOAD MARKS
function loadMarksTable(){

fetch("/get_marks")
.then(r=>r.json())
.then(data=>{

let html="";
data.forEach(m=>{
html+=`<tr>
<td>${m[1]}</td>
<td>${m[2]}</td>
<td>${m[3]}</td>
<td>${m[2]+m[3]}</td>
</tr>`;
});

document.getElementById("marksTable").innerHTML=html;

});

}

// AUTO LOAD
loadTeacherDashboard();

}