//////////////////////////////////////////////////
// LOGIN FUNCTION (FIXED CLEAN)
//////////////////////////////////////////////////
function login(){

let e = document.getElementById("enrollment").value.trim();
let p = document.getElementById("password").value.trim();
let r = document.getElementById("role").value;

if(!e || !p){
alert("Please fill all fields ❌");
return;
}

fetch("/login",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({
enrollment:e,
password:p,
role:r
})
})
.then(res=>res.json())
.then(data=>{

if(data.redirect){

// ✅ STORE USER DATA
localStorage.setItem("name", data.name);
localStorage.setItem("enrollment", e);
localStorage.setItem("role", r);

// ✅ REDIRECT
window.location.href = data.redirect;

}else{
alert(data.message);
}

})
.catch(err=>{
console.error(err);
alert("Server error ❌");
});
}

//////////////////////////////////////////////////
// ENTER KEY SUPPORT
//////////////////////////////////////////////////
document.addEventListener("keydown", function(e){
if(e.key === "Enter"){
login();
}
});