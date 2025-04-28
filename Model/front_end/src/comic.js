"use strict";

// ======================
// 📚 DOM References
// ======================
const comicList = document.getElementById("comicList");
alert("Loading comics... ");

// ======================
// 📥 Load Comics
// ======================
async function loadComicsFromServer() {
    alert("Loading comics... ");
    console.log("🔄 Loading comics...");
    comicList.innerHTML = "<p>Loading comics...</p>";

    try {
        const response = await fetch("/api/user/comics", {
            method: "GET",
            credentials: "include"
        });

        if (!response.ok) throw new Error("Failed to load comics");

        const comics = await response.json();

        if (!comics.length) {
            comicList.innerHTML = "<p>No comics found. Start creating!</p>";
            return;
        }

        comicList.innerHTML = "";

        for (const comic of comics) {
            if (!comic.pdf_path) continue;

            const pdfFileName = comic.pdf_path.split("/").pop().replace(/\.pdf$/, "");
            const thumbPath = `/uploads/thumbnails/${pdfFileName}.png`;
            const fallbackThumb = "/uploads/defaultThumbnail.png";

            const thumbSrc = await checkImageExists(thumbPath) ? thumbPath : fallbackThumb;

            renderComicCard(comic, thumbSrc);

            console.log("Comics loaded into UI");
            alert("This alert proves script is running");

        }

    } catch (err) {
        console.error("❌ Error loading comics:", err);
        comicList.innerHTML = "<p>Error loading comics.</p>";
    }
}

// ======================
// 🔎 Helpers
// ======================
async function checkImageExists(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
    });
}

function renderComicCard(comic, thumbnailSrc) {
    alert("Rendering comic card... ");
    const card = document.createElement("div");
    card.className = "comic-card";
    card.dataset.comicId = comic.id;

    card.innerHTML = `
        <a href="${comic.pdf_path}" target="_blank">
            <img src="${thumbnailSrc}" alt="Comic Thumbnail" />
        </a>
        <div class="comic-info">
            <div class="comic-title">${comic.title}</div>
            <div class="comic-description">${comic.description}</div>
            <div class="card-actions">
                <a class="btn btn-download" href="${comic.pdf_path}" download>Download</a>
                <button class="btn btn-delete">Delete</button>
            </div>
        </div>
    `;

    comicList.appendChild(card);
}

// ======================
// 🗑️ Delete Comic
// ======================
async function deleteComic(comicId) {
    if (!confirm("Delete this comic permanently?")) return;

    try {
        const response = await fetch(`/api/user/comics/${comicId}`, {
            method: "DELETE",
            credentials: "include"
        });

        if (response.ok) {
            alert("✅ Comic deleted.");
            loadComicsFromServer();
        } else {
            const error = await response.json();
            alert("❌ Failed to delete: " + error.detail);
        }
    } catch (err) {
        console.error("❌ Delete error:", err);
    }
}

// ======================
// 🔗 Event Delegation for Buttons
// ======================
comicList.addEventListener("click", (event) => {
    if (event.target.classList.contains("btn-delete")) {
        const card = event.target.closest(".comic-card");
        const comicId = card?.dataset?.comicId;
        if (comicId) deleteComic(comicId);
    }
});

loadComicsFromServer();
