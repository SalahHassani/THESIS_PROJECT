"use strict";

// ======================
// 📚 DOM References
// ======================
const clearAll = document.querySelector(".clear-all");
const historyList = document.getElementById("historyList");

// ======================
// 📥 Load History
// ======================
async function loadHistoryFromBackend() {
    try {
        const res = await fetch("/api/get-history", { credentials: "include" });
        const data = await res.json();

        if (!data || data.length === 0) {
            historyList.innerHTML = "<p>No history found.</p>";
            clearAll.classList.add("hidden");
            return;
        }

        historyList.innerHTML = "";

        data.forEach((char) => {
            const item = document.createElement("div");
            item.className = "history-item";

            item.innerHTML = `
                <p><strong>Name:</strong> ${char.name}</p>
                <p><strong>Age:</strong> ${char.age}</p>
                <p><strong>Gender:</strong> ${char.gender}</p>
                <p><strong>Hair:</strong> ${char.hair}</p>
                <p><strong>Eyes:</strong> ${char.eyes}</p>
                <p><strong>Clothes:</strong> ${char.clothes}</p>
                <p><strong>Special Features:</strong> ${char.special}</p>
                <p><strong>Description:</strong> ${char.description}</p>
                <p><em>Generated at: ${new Date(char.created_at).toLocaleString()}</em></p>
                <button class="delete-btn" onclick="deleteHistoryItem(${char.id})">Delete</button>
            `;

            historyList.appendChild(item);
        });

        clearAll.classList.remove("hidden");

    } catch (err) {
        console.error("Error fetching character history:", err);
        historyList.innerHTML = "<p>Error loading history.</p>";
    }
}

// ======================
// 🗑️ Delete One Entry
// ======================
async function deleteHistoryItem(id) {
    try {
        const res = await fetch(`/api/delete-history/${id}`, {
            method: "DELETE",
            credentials: "include"
        });

        const result = await res.json();
        alert(result.message);
        loadHistoryFromBackend();
    } catch (err) {
        console.error("Error deleting item:", err);
        alert("Failed to delete history item.");
    }
}

// ======================
// 🧹 Clear All
// ======================
async function clearAllHistory() {
    if (!confirm("Are you sure you want to clear all history?")) return;

    try {
        const res = await fetch("/api/clear-history", {
            method: "DELETE",
            credentials: "include"
        });

        const result = await res.json();
        alert(result.message);
        loadHistoryFromBackend();
    } catch (err) {
        console.error("Error clearing history:", err);
        alert("Something went wrong.");
    }
}

// ======================
// 🔗 Bind Events
// ======================
clearAll.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear all history?")) {
        clearAllHistory();
    }
});

// ======================
// 🚀 Init
// ======================
loadHistoryFromBackend();
