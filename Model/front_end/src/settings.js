// ========================
// Profile Settings Script
// ========================

document.addEventListener("DOMContentLoaded", async () => {


    
    const token = localStorage.getItem("access_token");
    const notify = (msg, isError = false) => alert(msg);
    if (!token) return;

    const capitalize = str => str.charAt(0).toUpperCase() + str.slice(1);
    const toggleEdit = section => {
        const form = document.getElementById("edit" + capitalize(section));
        if (form) {
            form.style.display = form.style.display === "block" ? "none" : "block";
            if (section === "password" && form.style.display === "block") {
                form.querySelectorAll("input").forEach(i => i.value = "");
            }
        }
    };

    // ======= Toggle Edit/Cancel Buttons =======
    ["name", "email", "password"].forEach(section => {
        const formId = "edit" + capitalize(section);
        document.querySelectorAll(".edit-btn").forEach(btn => {
            const group = btn.closest(".setting-group");
            if (group && group.nextElementSibling?.id === formId) {
                btn.addEventListener("click", () => toggleEdit(section));
            }
        });

        const cancelBtn = document.querySelector(`#${formId} .cancel-btn`);
        cancelBtn?.addEventListener("click", () => {
            document.querySelectorAll(`#${formId} input`).forEach(i => i.value = "");
            toggleEdit(section);
        });
    });

    // ======= Update Name =======
    document.querySelector("#editName .btn:not(.cancel-btn)")?.addEventListener("click", async () => {
        const nameInput = document.querySelector("#editName input").value.trim();
        if (!nameInput) return notify("Please enter a valid name.", true);

        const res = await fetch("/api/update-profile", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ new_name: nameInput })
        });

        const data = await res.json();
        if (res.ok) {
            document.getElementById("currentName").textContent = nameInput;
            toggleEdit("name");
            notify("Name updated successfully.");
        } else notify(data.detail || "Failed to update name", true);
    });

    // ======= Update Email =======
    document.querySelector("#editEmail .btn:not(.cancel-btn)")?.addEventListener("click", async () => {
        const inputs = document.querySelectorAll("#editEmail input");
        const current = inputs[0].value.trim();
        const newEmail = inputs[1].value.trim();
        const confirm = inputs[2].value.trim();

        if (!current || !newEmail || newEmail !== confirm)
            return notify("Invalid email input or confirmation doesn't match.", true);

        const res = await fetch("/api/update-profile", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ current_email: current, new_email: newEmail })
        });

        const data = await res.json();
        if (res.ok) {
            document.getElementById("currentEmail").textContent = newEmail;
            toggleEdit("email");
            notify("Email updated successfully.");
        } else notify(data.detail || "Failed to update email", true);
    });

    // ======= Update Password =======
    document.querySelector("#editPassword .btn:not(.cancel-btn)")?.addEventListener("click", async () => {
        const inputs = document.querySelectorAll("#editPassword input");
        const current = inputs[0].value.trim();
        const newPass = inputs[1].value.trim();
        const confirm = inputs[2].value.trim();

        if (!current || !newPass || newPass !== confirm)
            return notify("Invalid password input or confirmation doesn't match.", true);

        const res = await fetch("/api/update-profile", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ current_password: current, new_password: newPass })
        });

        const data = await res.json();
        if (res.ok) {
            toggleEdit("password");
            notify("Password updated successfully.");
        } else notify(data.detail || "Failed to update password", true);
    });

    // ======= Delete Account (no password needed) =======
    document.querySelector("#deleteAccountForm")?.addEventListener("submit", async e => {
        e.preventDefault();

        if (!confirm("Are you absolutely sure you want to delete your account? This action cannot be undone!")) return;

        try {
            const res = await fetch("/api/delete-account", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });

            if (res.ok) {
                localStorage.removeItem("access_token");
                alert("Account deleted successfully.");
                window.location.href = "/";
            } else {
                const data = await res.json();
                alert(data.detail || "Failed to delete account.");
            }
        } catch (err) {
            console.error("Error deleting account:", err);
            alert("Server error. Try again later.");
        }
    });

    // ======= Load User Info =======
    try {
        const res = await fetch("/users/me", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!res.ok) throw new Error("User fetch failed");

        const user = await res.json();
        const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
        document.getElementById("currentName").textContent = fullName || "Unknown User";
        document.getElementById("currentEmail").textContent = user.email || "unknown@example.com";
    } catch (err) {
        console.error("Failed to load user profile:", err);
    }
});
