document.addEventListener("DOMContentLoaded", async () => {
    const tableBody = document.getElementById("userTableBody");

    try {
        const res = await fetch("/api/admin/users", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch users");

        const users = await res.json();

        users.forEach(user => {
            const row = document.createElement("tr");
            row.innerHTML = `
          <td>${user.first_name || ""}</td>
          <td>${user.last_name || ""}</td>
          <td>${user.email || ""}</td>
          <td>${user.credits ?? 0}</td>
          <td>${user.comics_count ?? 0}</td>
          <td>${user.role || "Unknown"}</td>
          <td><button class="delete-btn" data-id="${user.user_id}">Delete</button></td>
        `;
            tableBody.appendChild(row);
        });

        // Delegate delete button actions
        tableBody.addEventListener("click", async (e) => {
            if (!e.target.classList.contains("delete-btn")) return;
            const userId = e.target.dataset.id;
            if (!userId) return;

            const confirmed = confirm("Are you sure you want to delete this user?");
            if (!confirmed) return;

            try {
                const res = await fetch(`/api/admin/users/${userId}`, {
                    method: "DELETE",
                    credentials: "include"
                });

                if (res.ok) {
                    alert("User deleted successfully.");
                    e.target.closest("tr").remove();
                } else {
                    const err = await res.json();
                    alert("Failed: " + err.detail);
                }
            } catch (err) {
                console.error("Error deleting user:", err);
                alert("Server error.");
            }
        });

    } catch (err) {
        console.error("Error loading users:", err);
        tableBody.innerHTML = `<tr><td colspan="7">Error loading users</td></tr>`;
    }
});
