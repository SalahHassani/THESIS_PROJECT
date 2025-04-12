
const navBar = document.querySelector('nav');
const menuBtns = document.querySelectorAll('.menu-item');
const overlay2 = document.querySelector('.overlay2');

const imageShapeRow = document.querySelector('#shape-row');
const imageContainer = document.querySelector('.image-container');
let shapesArray = document.querySelectorAll('.image-shape-btn:not(.active)');
let activeShape = document.querySelector('#shape-row .active');

// ************** Navigation Bar **************
menuBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
        navBar.classList.toggle('open');
    });
});

overlay2.addEventListener('click', () => {
    navBar.classList.remove('open');
});


// ************** Image Shape Selection **************
imageShapeRow.addEventListener('click', (e) => {
    e.preventDefault();

    if (e.target.matches('.active') || !e.target.matches('.image-shape-btn')) {
        return;
    }

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

// **************************** Image Slider ****************************

// --------------- setting images in image-Container ---------------
let imageCount = 4;
const imagesPath = "../images/shassani/shassani_";
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

function loadImages() {
    for (let i = 1; i <= imageCount; i++) {
        let img = new Image();
        img.src = `${imagesPath}${i}.jpeg`;
        img.alt = `Image ${i}`;
        img.classList.add(`slide`);
        img.classList.add(`slide-${i}`);
        // if(i !== 1) img.classList.add('hidden');


        img.onload = () => imageSlider.appendChild(img);
        img.onerror = () => clearInterval(interval);
    }
}

// generateBtn.addEventListener('click', () => {

//     // middleItem.classList.add('hidden');
//     middleItem.innerHTML = '<span class="loader"></span>';

//     setTimeout(() => {
//         loadImages();
//         createDots();
//         middleItem.classList.add('hidden');

//         if (imageCount > 1) {
//             rightArrow.classList.remove('hidden');
//             nextBtn.classList.remove('hidden');
//             clearDownloadBtns.classList.remove('hidden');
//         }

//     }, 300);


//     StoreInLocalStore();
// });

const imageCountInput = document.querySelector(".image-count input");
const storyTextArea = document.getElementById("charStory");

generateBtn.addEventListener("click", async () => {
    const text = storyTextArea.value.trim();
    const count = parseInt(imageCountInput.value) || 1;

    if (!text) {
        alert("Please enter a story before generating images.");
        return;
    }

    if (count < 1 || count > 10) {
        alert("Please enter a valid image count (1–10).");
        return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) {
        alert("You must be logged in to generate images.");
        return;
    }

    // Show loader while waiting
    middleItem.innerHTML = '<span class="loader"></span>';
    middleItem.classList.remove("hidden");

    try {
        const response = await fetch("/api/generate-image", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                text: text,
                type: "shassani",
                count: count
            })
        });

        const data = await response.json();

        if (data.image_paths && data.image_paths.length > 0) {
            // Hide loader
            middleItem.classList.add("hidden");

            // Run your existing logic
            loadImages();
            createDots();

            if (count > 1) {
                rightArrow.classList.remove('hidden');
                nextBtn.classList.remove('hidden');
                clearDownloadBtns.classList.remove('hidden');
            }

            StoreInLocalStore();  // Optional, if you're caching prompts or user input
        } else {
            middleItem.innerHTML = "Image generation failed.";
        }

    } catch (error) {
        console.error("Image generation error:", error);
        middleItem.innerHTML = "An error occurred.";
    }
});




function createDots() {
    for (let i = 0; i < imageCount; i++) {
        let dot = document.createElement('span');

        if (i === 0)
            dot.classList.add('dot', `dot-${i + 1}`, 'active');
        else
            dot.classList.add('dot', `dot-${i + 1}`);
        dotsContainer.appendChild(dot);
    }
    dotsContainer.classList.remove('hidden');
}


// Slider functionality
let currentIndex = 0;

function checkCurrentElement(ele) {
    return ele.closest('.right-arrow')
        || ele.matches('.next-btn')
        || ele.closest('.left-arrow')
        || ele.matches('.prev-btn')
        || ele.matches('.dot')
}

function slideNext(e) {
    e.preventDefault();

    const currentElement = e.target;

    if (!currentElement.closest('.right-arrow') && !currentElement.closest('.next-btn')) {
        return;
    }

    const lastImage = document.querySelector(`.slide-${currentIndex + 1}`);
    // lastImage.classList.add('hidden');

    const lastDot = document.querySelector(`.dot-${currentIndex + 1}`).classList.remove("active");



    currentIndex = (currentIndex + 1) % imageCount;

    const currImage = document.querySelector(`.slide-${currentIndex + 1}`);
    // currImage.classList.remove('hidden');

    if (currentIndex === imageCount - 1) {
        rightArrow.classList.add('hidden');
        nextBtn.classList.add('hidden');
    }

    if (currentIndex === 1) {
        leftArrow.classList.remove('hidden');
        prevBtn.classList.remove('hidden');
    }

    document.querySelector(`.dot-${currentIndex + 1}`).classList.add("active");
    updateSlider();

}

function slidePrev(e) {

    const currentElement = e.target;

    if (!currentElement.closest('.left-arrow') && !currentElement.closest('.prev-btn')) {
        return;
    }

    const lastImage = document.querySelector(`.slide-${currentIndex + 1}`);
    // lastImage.classList.add('hidden');

    document.querySelector(`.dot-${currentIndex + 1}`).classList.remove("active");

    currentIndex = (currentIndex - 1 + imageCount) % imageCount;

    const currImage = document.querySelector(`.slide-${currentIndex + 1}`);
    // currImage.classList.remove('hidden');

    if (currentIndex === 0) {
        leftArrow.classList.add('hidden');
        prevBtn.classList.add('hidden');
    }

    if (currentIndex < imageCount - 1) {
        rightArrow.classList.remove('hidden');
        nextBtn.classList.remove('hidden');
    }

    document.querySelector(`.dot-${currentIndex + 1}`).classList.add("active");

    updateSlider();
}

function updateSlider() {
    const offset = -currentIndex * 100;
    imageSlider.style.transform = `translateX(${offset}%)`;
}

right.addEventListener('click', slideNext);
right.addEventListener('click', slidePrev);






// ......................Variables...................

const descForm = document.querySelector(".chracter-decs-form");
const body = document.querySelector("body");
const overlay = document.querySelector(".overlay");
const close = document.querySelector(".close");
const descBtn = document.querySelector(".desc-btn");

const downloadForm = document.querySelector(".download-form");
const downloadImagesBtn = document.querySelector(".download-images-btn");
const saveImagesBtn = document.querySelector(".save-images-btn");
const saveBtn = document.querySelector(".download-btn");
const clearBtn = document.querySelector(".clear-btn");

// ......................Functions...................

const openDescForm = function (e) {
    e.preventDefault();
    closeModal();
    close.classList.remove("hidden");
    descForm.classList.remove("hidden");
    overlay.classList.remove("hidden");
};

const closeModal = function () {
    close.classList.add("hidden");
    descForm.classList.add("hidden");
    overlay.classList.add("hidden");
    downloadForm.classList.add("hidden");
};

const closeModalOnEsc = function (e) {
    if (e.key === "Escape" && !close.classList.contains("hidden")) {
        closeModal();
    }
};

const MyEvents = function (onWhat, element, method) {
    try {
        element.addEventListener(onWhat, method);
    }
    catch (error) {
        console.error(element + " is not defined or not a valid element.");
    }
};




// ..........................Local Storage..........................

// function toggleForm() {
//     const form = document.getElementById("formContainer");
//     form.style.display = form.style.display === "flex" ? "none" : "flex";
// }

function StoreInLocalStore() {
    const charData = {
        name: document.getElementById("charName").value || "Unknown",
        age: document.getElementById("charAge").value || "Unknown",
        gender: document.getElementById("charGender").value || "Unspecified",
        hair: document.getElementById("charHair").value || "Unspecified",
        eyes: document.getElementById("charEyes").value || "Unspecified",
        clothes: document.getElementById("charClothes").value || "Unspecified",
        special: document.getElementById("charSpecial").value || "None",
        description: document.getElementById("charStory")?.value || "No story provided",
        createdAt: new Date().toLocaleString(),

    };

    const prompt = `A comic character named ${charData.name}, age ${charData.age}, 
    ${charData.gender}, with ${charData.hair} hair, ${charData.eyes} eyes, wearing 
    ${charData.clothes}. Features: ${charData.special}. \nDescription: ${charData.description}`;

    // document.getElementById("imagePreview").textContent = `Generating image for: ${prompt}`;

    // Store in localStorage
    let history = JSON.parse(localStorage.getItem("characterHistory")) || [];
    history.push(charData);
    localStorage.setItem("characterHistory", JSON.stringify(history));
    console.assert("Character data stored in localStorage:", charData);
}

// ......................EVENTS...................

MyEvents("click", close, closeModal);
MyEvents("click", overlay, closeModal);
MyEvents("keydown", document, closeModalOnEsc);
MyEvents("click", descBtn, openDescForm);
MyEvents("click", saveBtn, openDownloadForm);
MyEvents("click", clearBtn, cleanImageContainer);
// MyEvents("click", downloadImagesBtn, downloadImagesAsPDF);


function openDownloadForm(e) {
    e.preventDefault();
    closeModal();
    downloadForm.classList.remove("hidden");
    overlay.classList.remove("hidden");
}

function cleanImageContainer(e) {
    e.preventDefault();
    const images = document.querySelectorAll(".slide");
    images.forEach((img) => {
        img.remove();
    });
    currentIndex = 0;
    rightArrow.classList.add("hidden");
    nextBtn.classList.add("hidden");
    clearDownloadBtns.classList.add("hidden");
    leftArrow.classList.add("hidden");
    prevBtn.classList.add("hidden");

    dotsContainer.innerHTML = ""; // Clear the dots
    dotsContainer.classList.add("hidden");
    middleItem.innerHTML = `<div class="upper">
                                <i class='bx bxs-square-rounded'></i>
                                <i class='bx bxs-square-rounded'></i>
                            </div>
                            <div class="lower">
                                <i class='bx bxs-square-rounded'></i>
                                <i class='bx bxs-square-rounded'></i>
                            </div>`;
    middleItem.classList.remove('hidden');

}



// async function downloadImagesAsPDF(e) {
//     e.preventDefault();

//     const { jsPDF } = window.jspdf;
//     const images = document.querySelectorAll(".slide");
//     const pdf = new jsPDF("p", "mm", "a4");
//     const imgWidth = 210;
//     const imgHeight = (imgWidth * 297) / 210;

//     for (let i = 0; i < images.length; i++) {
//         const img = images[i];
//         const canvas = document.createElement("canvas");
//         const context = canvas.getContext("2d");

//         canvas.width = img.naturalWidth;
//         canvas.height = img.naturalHeight;
//         context.drawImage(img, 0, 0);

//         const imgData = canvas.toDataURL("image/jpeg", 1.0);
//         pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);

//         if (i < images.length - 1) {
//             pdf.addPage();
//         }
//     }

//     pdf.save("images.pdf");

//     setTimeout(() => {
//         closeModal();
//     }, 1000);
// }



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

        if (i < images.length - 1) {
            pdf.addPage();
        }
    }

    if (action === "download") {
        // Save locally
        pdf.save("images.pdf");
    } else if (action === "saveToDB") {
        // Convert PDF to Blob and send it to the backend
        const pdfBlob = pdf.output("blob");

        // const formData = new FormData();
        // formData.append("pdf", pdfBlob, "images.pdf");

        const formData = new FormData();
        formData.append("pdf", pdfBlob, "images.pdf");
        formData.append("title", "My Comic Title");
        formData.append("story_text", "This comic was generated from image slides...");


        try {
            const token = localStorage.getItem("access_token");
            console.log("Token from localStorage:", token);

            const response = await fetch("/upload-pdf", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`, // ✅ Send token
                },
                body: formData
            });

            const result = await response.json();
            if (response.ok) {
                alert("PDF saved successfully!");
            } else {
                alert("Error saving PDF: " + result.error);
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Something went wrong.");
        }
    }

    setTimeout(() => {
        closeModal();
    }, 1000);
}

// Attach event listeners for different actions
MyEvents("click", downloadImagesBtn, (e) => downloadImagesAsPDF(e, "download"));
MyEvents("click", saveImagesBtn, (e) => downloadImagesAsPDF(e, "saveToDB"));



const previewGenBtn = document.querySelector(".preview-image-btn");

MyEvents("click", previewGenBtn, previewGenerateImage);
// Function to generate image preview based on character traits

async function previewGenerateImage() {
    const name = document.getElementById("charName").value.trim();
    const age = document.getElementById("charAge").value.trim();
    const gender = document.getElementById("charGender").value;
    const hair = document.getElementById("charHair").value;
    const eyes = document.getElementById("charEyes").value;
    const clothes = document.getElementById("charClothes").value;
    const special = document.getElementById("charSpecial").value;

    // Build the prompt only from non-empty values
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
    // Send to FastAPI backend
    try {
        const res = await fetch("/api/generate-image", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                text: prompt,
                type: "preview",
                count: 1  // optional, defaults to 1 in backend
            })

        });


        const data = await res.json();

        if (data.image_paths && data.image_paths.length > 0) {
            const imageUrl = data.image_paths[0]; // take the first one
            document.getElementById("imagePreview").innerHTML = `<img src="${imageUrl}" alt="Generated Character" style="max-width: 100%;" />`;
        } else {
            document.getElementById("imagePreview").textContent = "Image generation failed.";
        }

    } catch (error) {
        console.error("Image generation error:", error);
        document.getElementById("imagePreview").textContent = "An error occurred.";
    }
}

