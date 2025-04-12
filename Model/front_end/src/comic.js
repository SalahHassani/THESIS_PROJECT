const token = localStorage.getItem("access_token");

async function loadComicsFromServer() {
    const comicList = document.getElementById("comicList");
    comicList.innerHTML = "Loading comics...";

    try {
        const response = await fetch("/api/user/comics", {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const comics = await response.json();

        if (!comics.length) {
            comicList.innerHTML = "<p>No comics found. Start creating!</p>";
            return;
        }

        comicList.innerHTML = "";

        for (const comic of comics) {

            if (!comic.pdf_path) continue;



            const pdfPath = comic.pdf_path;
            const basePath = pdfPath.replace(/\.pdf$/, "");
            const thumbJpg = `${basePath}.jpg`;
            const thumbPng = `${basePath}.png`;
            const fallbackThumb = "/uploads/defaultThumbnail.png";

            let thumbSrc = await checkImageExists(thumbPng)
                ? thumbPng
                : (await checkImageExists(thumbJpg) ? thumbJpg : fallbackThumb);

            renderComicCard(comic, thumbSrc);
        }

    } catch (err) {
        comicList.innerHTML = "<p>Error loading comics.</p>";
        console.error(err);
    }
}

async function checkImageExists(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
    });
}

function renderComicCard(comic, thumbnailSrc) {
    console.log("Rendering comic:", comic.title, "with thumbnail:", thumbnailSrc);
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
                    <a class="btn btn-download" href="${comic.pdf_path}" target="_blank">Open</a>
                    <button class="btn btn-delete" onclick="deleteComic(${comic.comic_id})">Delete</button>
                    </div>
                </div>
            `;


    document.getElementById("comicList").appendChild(card);
}

async function deleteComic(comicId) {
    if (!confirm("Delete this comic permanently?")) return;

    try {
        const response = await fetch(`/api/user/comics/${comicId}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`
            }
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

async function clearAllComics() {
    if (!confirm("Are you sure you want to delete ALL your comics? This cannot be undone.")) return;

    try {
        const response = await fetch("/api/user/comics", {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`
            }
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

// load comics when the page is loaded
window.addEventListener("DOMContentLoaded", loadComicsFromServer);
