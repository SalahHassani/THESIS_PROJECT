const clearAll = document.querySelector(".clear-all");

function loadHistory() {
    const historyList = document.getElementById("historyList");
    const data = JSON.parse(localStorage.getItem("characterHistory")) || [];

    if (data == undefined || data.length === 0) {
        historyList.innerHTML = "<p>No history found.</p>";
        clearAll.classList.add("hidden");
        return;
    }

    historyList.innerHTML = "";

    data.forEach((char, index) => {
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
        <p><em>Generated at: ${char.createdAt}</em></p>
        <button class="delete-btn" onclick="deleteItem(${index})">Delete</button>
      `;
        historyList.appendChild(item);
    });

    clearAll.classList.remove("hidden");

}

function deleteItem(index) {
    let data = JSON.parse(localStorage.getItem("characterHistory")) || [];
    data.splice(index, 1);
    localStorage.setItem("characterHistory", JSON.stringify(data));
    loadHistory();
}

function clearAllHistory() {
    localStorage.removeItem("characterHistory");
    loadHistory();
}

clearAll.addEventListener("click", function () {
    if (confirm("Are you sure you want to clear all history?")) {
        clearAllHistory();
    }
});

// Load on start
loadHistory();
