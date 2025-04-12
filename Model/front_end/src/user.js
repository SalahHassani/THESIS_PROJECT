// =================== CONSTANTS ===================
const navBar = document.querySelector('nav');
const menuBtns = document.querySelectorAll('.menu-item');
const overlay2 = document.querySelector('.overlay2');

const imageShapeRow = document.querySelector('#shape-row');
const imageContainer = document.querySelector('.image-container');
let shapesArray = document.querySelectorAll('.image-shape-btn:not(.active)');
let activeShape = document.querySelector('#shape-row .active');

const imageCountInput = document.querySelector(".image-count input");
const storyTextArea = document.getElementById("charStory");

const generateBtn = document.querySelector('.generate-btn');
const imageSlider = document.querySelector('.slider-wrapper .slider');
const middleItem = document.querySelector('.middle-item');
const rightArrow = document.querySelector('.right-arrow');
const leftArrow = document.querySelector('.left-arrow');
const nextPrevBtns = document.querySelector('.next-prev-btns');
const clearDownloadBtns = document.querySelector('.clear-download-btns');
const nextBtn = document.querySelector('.next-btn');
const prevBtn = document.querySelector('.prev-btn');
const right = document.querySelector('.right');
const dotsContainer = document.querySelector('.dot-container');

const descForm = document.querySelector(".chracter-decs-form");
const overlay = document.querySelector(".overlay");
const close = document.querySelector(".close");
const descBtn = document.querySelector(".desc-btn");

const downloadForm = document.querySelector(".download-form");
const downloadImagesBtn = document.querySelector(".download-images-btn");
const saveImagesBtn = document.querySelector(".save-images-btn");
const saveBtn = document.querySelector(".download-btn");
const clearBtn = document.querySelector(".clear-btn");
const previewGenBtn = document.querySelector(".preview-image-btn");

let currentIndex = 0;
let imageCount = 4;
const imagesPath = "../images/shassani/shassani_";

// =================== UTILITY FUNCTIONS ===================
const MyEvents = (onWhat, element, method) => {
    try {
        element.addEventListener(onWhat, method);
    } catch (error) {
        console.error(element + " is not defined or not a valid element.");
    }
};

const closeModal = () => {
    close.classList.add("hidden");
    descForm.classList.add("hidden");
    overlay.classList.add("hidden");
    downloadForm.classList.add("hidden");
};

const openDescForm = (e) => {
    e.preventDefault();
    closeModal();
    close.classList.remove("hidden");
    descForm.classList.remove("hidden");
    overlay.classList.remove("hidden");
};

const closeModalOnEsc = (e) => {
    if (e.key === "Escape" && !close.classList.contains("hidden")) closeModal();
};

function updateSlider() {
    const offset = -currentIndex * 100;
    imageSlider.style.transform = `translateX(${offset}%)`;
}

// =================== UI EVENTS ===================
menuBtns.forEach((btn) => btn.addEventListener('click', () => navBar.classList.toggle('open')));
overlay2.addEventListener('click', () => navBar.classList.remove('open'));

imageShapeRow.addEventListener('click', (e) => {
    e.preventDefault();
    if (e.target.matches('.active') || !e.target.matches('.image-shape-btn')) return;

    shapesArray.forEach((shape) => {
        if (e.target === shape) {
            activeShape.classList.remove('active');
            e.target.classList.add('active');
            activeShape = e.target;
        }
    });

    imageContainer.classList.remove(`${imageContainer.classList[1]}`);
    imageContainer.classList.add(`${e.target.classList[1]}-dimensions`);
    shapesArray = document.querySelectorAll('.image-shape-btn:not(.active)');
});

// =================== IMAGE LOGIC ===================
function loadImages() {
    for (let i = 1; i <= imageCount; i++) {
        const img = new Image();
        img.src = `${imagesPath}${i}.png`;
        img.alt = `Image ${i}`;
        img.classList.add(`slide`, `slide-${i}`);
        img.onload = () => imageSlider.appendChild(img);
        img.onerror = () => clearInterval(interval);
    }
}

function createDots() {
    dotsContainer.innerHTML = "";
    for (let i = 0; i < imageCount; i++) {
        const dot = document.createElement('span');
        dot.classList.add('dot', `dot-${i + 1}`);
        if (i === 0) dot.classList.add('active');
        dotsContainer.appendChild(dot);
    }
    dotsContainer.classList.remove('hidden');
}

function slideNext(e) {
    e.preventDefault();
    if (!e.target.closest('.right-arrow') && !e.target.closest('.next-btn')) return;

    document.querySelector(`.dot-${currentIndex + 1}`).classList.remove("active");
    currentIndex = (currentIndex + 1) % imageCount;
    document.querySelector(`.dot-${currentIndex + 1}`).classList.add("active");

    if (currentIndex === imageCount - 1) {
        rightArrow.classList.add('hidden');
        nextBtn.classList.add('hidden');
    }
    if (currentIndex === 1) {
        leftArrow.classList.remove('hidden');
        prevBtn.classList.remove('hidden');
    }

    updateSlider();
}

function slidePrev(e) {
    if (!e.target.closest('.left-arrow') && !e.target.closest('.prev-btn')) return;

    document.querySelector(`.dot-${currentIndex + 1}`).classList.remove("active");
    currentIndex = (currentIndex - 1 + imageCount) % imageCount;
    document.querySelector(`.dot-${currentIndex + 1}`).classList.add("active");

    if (currentIndex === 0) {
        leftArrow.classList.add('hidden');
        prevBtn.classList.add('hidden');
    }
    if (currentIndex < imageCount - 1) {
        rightArrow.classList.remove('hidden');
        nextBtn.classList.remove('hidden');
    }

    updateSlider();
}

right.addEventListener('click', slideNext);
right.addEventListener('click', slidePrev);

// =================== BACKEND IMAGE GENERATION ===================
generateBtn.addEventListener("click", async () => {
    const text = storyTextArea.value.trim();
    imageCount = parseInt(imageCountInput.value) || 1;

    if (!text) return alert("Please enter a story before generating images.");
    if (imageCount < 1 || imageCount > 10) return alert("Enter a valid image count (1–10).");

    const token = localStorage.getItem("access_token");
    if (!token) return alert("You must be logged in to generate images.");

    middleItem.innerHTML = '<span class="loader"></span>';
    middleItem.classList.remove("hidden");

    try {
        const response = await fetch("/api/generate-image", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ text, type: "shassani", count:imageCount })
        });

        const data = await response.json();

        if (data.image_paths?.length > 0) {
            middleItem.classList.add("hidden");
            loadImages();
            createDots();

            if (imageCount > 1) {
                rightArrow.classList.remove('hidden');
                nextBtn.classList.remove('hidden');
                clearDownloadBtns.classList.remove('hidden');
            }

            StoreInLocalStore();
        } else {
            middleItem.innerHTML = "Image generation failed.";
        }
    } catch (error) {
        console.error("Image generation error:", error);
        middleItem.innerHTML = "An error occurred.";
    }
});

// =================== FORM & STORAGE ===================
function StoreInLocalStore() {
    const charData = {
        name: document.getElementById("charName").value || "Unknown",
        age: document.getElementById("charAge").value || "Unknown",
        gender: document.getElementById("charGender").value || "Unspecified",
        hair: document.getElementById("charHair").value || "Unspecified",
        eyes: document.getElementById("charEyes").value || "Unspecified",
        clothes: document.getElementById("charClothes").value || "Unspecified",
        special: document.getElementById("charSpecial").value || "None",
        description: storyTextArea?.value || "No story provided",
        createdAt: new Date().toLocaleString(),
    };

    const history = JSON.parse(localStorage.getItem("characterHistory")) || [];
    history.push(charData);
    localStorage.setItem("characterHistory", JSON.stringify(history));
}

// =================== PDF DOWNLOAD / SAVE ===================
async function downloadImagesAsPDF(e, action) {
    e.preventDefault();

    const { jsPDF } = window.jspdf;
    const images = document.querySelectorAll(".slide");
    const pdf = new jsPDF("p", "mm", "a4");
    const imgWidth = 210;
    const imgHeight = (imgWidth * 297) / 210;

    for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        context.drawImage(img, 0, 0);

        const imgData = canvas.toDataURL("image/jpeg", 1.0);
        pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
        if (i < images.length - 1) pdf.addPage();
    }

    if (action === "download") {
        pdf.save("images.pdf");
    } else if (action === "saveToDB") {
        const pdfBlob = pdf.output("blob");
        const formData = new FormData();
        formData.append("pdf", pdfBlob, "images.pdf");
        formData.append("title", "My Comic Title");
        formData.append("story_text", "This comic was generated from image slides...");

        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch("/upload-pdf", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            });

            const result = await response.json();
            alert(response.ok ? "PDF saved successfully!" : `Error: ${result.error}`);
        } catch (error) {
            console.error("Error:", error);
            alert("Something went wrong.");
        }
    }

    setTimeout(closeModal, 1000);
}

// =================== PREVIEW GENERATION ===================
async function previewGenerateImage() {
    const name = document.getElementById("charName").value.trim();
    const age = document.getElementById("charAge").value.trim();
    const gender = document.getElementById("charGender").value;
    const hair = document.getElementById("charHair").value;
    const eyes = document.getElementById("charEyes").value;
    const clothes = document.getElementById("charClothes").value;
    const special = document.getElementById("charSpecial").value;

    const traits = [];
    if (name) traits.push(`named ${name}`);
    if (age) traits.push(`${age}-year-old`);
    if (gender) traits.push(gender);
    if (hair) traits.push(`with ${hair} hair`);
    if (eyes) traits.push(`${eyes} eyes`);
    if (clothes) traits.push(`wearing ${clothes}`);
    if (special) traits.push(`with ${special}`);

    const prompt = `A character ${traits.join(', ')}`.replace(/ ,/g, ',').trim();

    document.getElementById("imagePreview").textContent = "Image Generation in progress...";

    try {
        const res = await fetch("/api/generate-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: prompt, type: "preview", count: 1 })
        });

        const data = await res.json();
        if (data.image_paths?.length > 0) {
            document.getElementById("imagePreview").innerHTML = `<img src="${data.image_paths[0]}" alt="Generated Character" style="max-width: 100%;" />`;
        } else {
            document.getElementById("imagePreview").textContent = "Image generation failed.";
        }
    } catch (error) {
        console.error("Image generation error:", error);
        document.getElementById("imagePreview").textContent = "An error occurred.";
    }
}

// =================== MISC EVENTS ===================
MyEvents("click", close, closeModal);
MyEvents("click", overlay, closeModal);
MyEvents("keydown", document, closeModalOnEsc);
MyEvents("click", descBtn, openDescForm);
MyEvents("click", saveBtn, openDownloadForm);
MyEvents("click", clearBtn, cleanImageContainer);
MyEvents("click", downloadImagesBtn, (e) => downloadImagesAsPDF(e, "download"));
MyEvents("click", saveImagesBtn, (e) => downloadImagesAsPDF(e, "saveToDB"));
MyEvents("click", previewGenBtn, previewGenerateImage);

function openDownloadForm(e) {
    e.preventDefault();
    closeModal();
    downloadForm.classList.remove("hidden");
    overlay.classList.remove("hidden");
}

function cleanImageContainer(e) {
    e.preventDefault();
    document.querySelectorAll(".slide").forEach((img) => img.remove());
    currentIndex = 0;
    [rightArrow, nextBtn, clearDownloadBtns, leftArrow, prevBtn].forEach(el => el.classList.add("hidden"));

    dotsContainer.innerHTML = "";
    dotsContainer.classList.add("hidden");

    middleItem.innerHTML = `
        <div class="upper"><i class='bx bxs-square-rounded'></i><i class='bx bxs-square-rounded'></i></div>
        <div class="lower"><i class='bx bxs-square-rounded'></i><i class='bx bxs-square-rounded'></i></div>`;
    middleItem.classList.remove('hidden');
}
