"use strict";

// =================== CONSTANTS ===================
const imageShapeRow = document.querySelector('#shape-row');
const imageContainer = document.querySelector('.image-container');
let shapesArray = document.querySelectorAll('.image-shape-btn:not(.active)');
let activeShape = document.querySelector('#shape-row .active');

const imageCountInput = document.querySelector(".image-count input");
const storyTextArea = document.getElementById("charStory");
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

const generateBtn = document.querySelector('.generate-btn');
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
const previewApplyBtn = document.querySelector(".preview-apply-btn");

let currentIndex = 0;
let imageCount = 4;
let inPainting = false;
const imagesPath = "../images/shassani/shassani_";

const epochsSlider = document.querySelector(".epochs-slider");
const epochsValue = document.getElementById("epochsValue");
epochsValue.textContent = epochsSlider.value;

// =================== UTILITY FUNCTIONS ===================
const MyEvents = (onWhat, element, method) => {
    if (element) element.addEventListener(onWhat, method);
};

const closeModal = () => {
    [close, descForm, overlay, downloadForm].forEach(el => el.classList.add("hidden"));
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
    imageSlider.style.transform = `translateX(${-currentIndex * 100}%)`;
}

// =================== UI EVENTS ===================
imageShapeRow.addEventListener('click', (e) => {
    e.preventDefault();
    if (e.target.matches('.active') || !e.target.matches('.image-shape-btn')) return;

    activeShape.classList.remove('active');
    e.target.classList.add('active');
    activeShape = e.target;

    imageContainer.classList.remove(`${imageContainer.classList[1]}`);
    imageContainer.classList.add(`${e.target.classList[1]}-dimensions`);
    shapesArray = document.querySelectorAll('.image-shape-btn:not(.active)');
});

// =================== IMAGE LOADING ===================
function loadImages() {
    for (let i = 1; i <= imageCount; i++) {
        const img = new Image();
        img.src = `${imagesPath}${i}.png`;
        img.alt = `Image ${i}`;
        img.classList.add("slide", `slide-${i}`);
        img.onload = () => imageSlider.appendChild(img);
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

// =================== IMAGE GENERATION ===================
generateBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    cleanImageSection(e);
    const text = storyTextArea.value.trim();
    const epochs = parseInt(epochsSlider.value) || 1;
    imageCount = parseInt(imageCountInput.value) || 1;
    // console.log("Epochs:", epochs, " InPainting:", inPainting, " Image Count:", imageCount);
    // alert("epochs: " + epochs);
    if (!text) return alert("Please enter a story before generating images.");
    if (imageCount < 1 || imageCount > 10) return alert("Enter a valid image count (1–10).");

    middleItem.innerHTML = '<span class="loader"></span>';
    middleItem.classList.remove("hidden");

    alert("Inpainting: " + inPainting);
    

    try {
        const response = await fetch("/api/generate-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ text, type: "shassani", count: imageCount, epochs: epochs, inPainting: inPainting })
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

// =================== STORAGE ===================
function StoreInLocalStore() {
    const charData = {
        name: document.getElementById("charName").value || "Unknown",
        age: document.getElementById("charAge").value || "Unknown",
        gender: document.getElementById("charGender").value || "Unspecified",
        hair: document.getElementById("charHair").value || "Unspecified",
        eyes: document.getElementById("charEyes").value || "Unspecified",
        clothes: document.getElementById("charClothes").value || "Unspecified",
        special: document.getElementById("charSpecial").value || "None",
        description: storyTextArea.value || "No story provided",
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
        const formData = new FormData();
        formData.append("pdf", pdf.output("blob"), "images.pdf");
        formData.append("title", "My Comic Title");
        formData.append("story_text", "This comic was generated from image slides...");

        const firstImage = images[0];
        const canvas = document.createElement("canvas");
        canvas.width = firstImage.naturalWidth;
        canvas.height = firstImage.naturalHeight;
        canvas.getContext("2d").drawImage(firstImage, 0, 0);
        const thumbnailBlob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
        formData.append("thumbnail", thumbnailBlob, "images.png");

        try {
            const response = await fetch("/upload-pdf", {
                method: "POST",
                body: formData,
                credentials: "include"
            });

            const result = await response.json();
            alert(response.ok ? "✅ PDF saved!" : `❌ Error: ${result.error}`);
        } catch (error) {
            console.error("Upload error:", error);
            alert("Something went wrong.");
        }
    }

    closeModal();
}

// =================== PREVIEW GENERATION ===================
async function previewGenerateImage() {
    // const fields = ["charName", "charAge", "charGender", "charHair", "charEyes", "charClothes", "charSpecial"];
    // const traits = fields.map(id => document.getElementById(id).value.trim()).filter(Boolean);
    // const prompt = "A character " + traits.join(", ");
    const fields = {
        charName: "named",
        charAge: "age",
        charGender: "gender",
        charHair: "hair style",
        charEyes: "eye color",
        charClothes: "wearing",
        charSpecial: "notable trait"
    };
    
    const traits = [];
    
    for (const [id, label] of Object.entries(fields)) {
        const value = document.getElementById(id).value.trim();
        if (value) {
            traits.push(`${label} ${value}`);
        }
    }
    
    const prompt = "A character " + traits.join(", ") + ".";
    const epochs = 12;
    document.getElementById("imagePreview").textContent = "Generating preview...";

    try {
        const res = await fetch("/api/generate-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: prompt, type: "preview", count: 1, epochs: epochs, inPainting: false })
        });

        const data = await res.json();
        if (data.image_paths?.length > 0) {
            document.getElementById("imagePreview").innerHTML = `<img src="${data.image_paths[0]}" alt="Preview" style="max-width: 100%;" />`;
            previewApplyBtn.classList.remove("hidden");
        } else {
            document.getElementById("imagePreview").textContent = "Image generation failed.";
        }
    } catch (err) {
        console.error(err);
        document.getElementById("imagePreview").textContent = "Error occurred.";
    }
}

function cleanImageSection(e) {
    e.preventDefault();
    document.querySelectorAll(".slide").forEach(img => img.remove());
    currentIndex = 0;
    [rightArrow, nextBtn, clearDownloadBtns, leftArrow, prevBtn].forEach(el => el.classList.add("hidden"));
    dotsContainer.innerHTML = "";
    dotsContainer.classList.add("hidden");
    middleItem.innerHTML = `
        <div class="upper"><i class='bx bxs-square-rounded'></i><i class='bx bxs-square-rounded'></i></div>
        <div class="lower"><i class='bx bxs-square-rounded'></i><i class='bx bxs-square-rounded'></i></div>`;
    middleItem.classList.remove("hidden");
    // inPainting = false;
}

// =================== MISC EVENTS ===================
MyEvents("click", close, closeModal);
MyEvents("click", overlay, closeModal);
MyEvents("keydown", document, closeModalOnEsc);
MyEvents("click", descBtn, openDescForm);
MyEvents("click", saveBtn, (e) => {
    e.preventDefault();
    closeModal();
    downloadForm.classList.remove("hidden");
    overlay.classList.remove("hidden");
});
MyEvents("click", clearBtn, cleanImageSection);
MyEvents("click", downloadImagesBtn, (e) => downloadImagesAsPDF(e, "download"));
MyEvents("click", saveImagesBtn, (e) => downloadImagesAsPDF(e, "saveToDB"));
MyEvents("click", previewGenBtn, previewGenerateImage);


epochsSlider.addEventListener("input", () => {
  epochsValue.textContent = epochsSlider.value;
});



previewApplyBtn.addEventListener("click", (e) => {
    e.preventDefault();
    closeModal();
    inPainting = true;
    alert("Inpainting: " + inPainting);

});
