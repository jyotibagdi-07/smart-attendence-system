//////////////////////////////////////////////////
// LOGIN UI FEEDBACK
//////////////////////////////////////////////////
function showMsg(msg, color = "green") {
    let box = document.getElementById("sideMessage");

    if (!box) {
        box = document.createElement("div");
        box.id = "sideMessage";
        box.className = "side-message";
        document.body.appendChild(box);
    }

    box.innerText = msg;
    box.style.background = color === "red" ? "#e74c3c" : "#2ecc71";
    box.classList.add("show");

    setTimeout(() => {
        box.classList.remove("show");
    }, 4000);
}

//////////////////////////////////////////////////
// LOGIN FUNCTION
//////////////////////////////////////////////////
function login() {
    let e = document.getElementById("enrollment").value.trim();
    let p = document.getElementById("password").value.trim();
    let r = document.getElementById("role").value;

    if (!e || !p) {
        showMsg("Please fill all fields ❌", "red");
        return;
    }

    fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollment: e, password: p, role: r })
    })
    .then(res => res.json())
    .then(data => {
        if (data.redirect) {
            localStorage.setItem("name", data.name);
            localStorage.setItem("enrollment", e);
            localStorage.setItem("role", r);
            window.location.href = data.redirect;
        } else {
            showMsg(data.message || "Invalid credentials ❌", "red");
        }
    })
    .catch(err => {
        console.error(err);
        showMsg("Server error ❌", "red");
    });
}

//////////////////////////////////////////////////
// ENTER KEY SUPPORT
//////////////////////////////////////////////////
document.addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
        login();
    }
});