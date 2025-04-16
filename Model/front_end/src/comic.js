"use strict";

// ======================
// 📚 DOM References
// ======================
const comicList = document.getElementById("comicList");

// ======================
// 📥 Load Comics
// ======================
async function loadComicsFromServer() {
    comicList.innerHTML = "Loading comics...";

    try {
        const response = await fetch("/api/user/comics", {
            method: "GET",
            credentials: "include"
        });

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
        }

    } catch (err) {
        console.error("Error loading comics:", err);
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
    const card = document.createElement("div");
    card.className = "comic-card";

    card.innerHTML = `
        <a href="${comic.pdf_path}" target="_blank">
            <img src="${thumbnailSrc}" alt="Comic Thumbnail" />
        </a>
        <div class="comic-info">
            <div class="comic-title">${comic.title}</div>
            <div class="comic-description">${comic.story_text}</div>
            <div class="card-actions">
                <a class="btn btn-download" href="${comic.pdf_path}" download>Download</a>
                <button class="btn btn-delete" onclick="deleteComic(${comic.comic_id})">Delete</button>
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
            alert("Comic deleted.");
            loadComicsFromServer();
        } else {
            const error = await response.json();
            alert("Failed to delete: " + error.detail);
        }
    } catch (err) {
        console.error("Delete error:", err);
    }
}

// ======================
// 🧹 Clear All Comics
// ======================
async function clearAllComics() {
    if (!confirm("Are you sure you want to delete ALL your comics? This cannot be undone.")) return;

    try {
        const response = await fetch("/api/user/comics", {
            method: "DELETE",
            credentials: "include"
        });

        if (response.ok) {
            alert("All comics deleted.");
            loadComicsFromServer();
        } else {
            const error = await response.json();
            alert("Failed to clear all: " + error.detail);
        }
    } catch (err) {
        console.error("Clear error:", err);
    }
}

// ======================
// 🚀 Init
// ======================
window.addEventListener("DOMContentLoaded", loadComicsFromServer);
