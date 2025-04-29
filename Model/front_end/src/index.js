"use strict";

// ======================
// 🔧 DOM Element Selectors
// ======================
const signInForm = document.querySelector(".signInForm");
const signUpForm = document.querySelector(".signUpForm");
const form = document.querySelectorAll(".form");
const overlay = document.querySelector(".overlay");
const close = document.querySelector(".close");
const showCardDetails = document.querySelector(".showCardDetails");
const signIn = document.querySelector(".signIn");
const signUp = document.querySelector(".signUp");
const loginBtn = document.querySelector(".signInForm .button-submit");
const registerBtn = document.querySelector(".signUpForm .button-submit");
const middleItem = document.querySelector(".middle-item");
const imageSlider = document.querySelector(".slider-wrapper .slider");
const imageShapeRow = document.querySelector("#shape-row");
const imageContainer = document.querySelector(".image-container");
const generateBtn = document.querySelector(".generate-btn");
const textArea = document.querySelector("#story");

let shapesArray = document.querySelectorAll(".image-shape-btn:not(.active)");
let activeShape = document.querySelector("#shape-row .active");

// ======================
// 🔐 Modal & Form Utils
// ======================
function openSignInForm(e) {
  e.preventDefault();
  closeModal();
  close.classList.remove("hidden");
  signInForm.classList.remove("hidden");
  overlay.classList.remove("hidden");
}

function openSignUpForm(e) {
  e.preventDefault();
  closeModal();
  close.classList.remove("hidden");
  signUpForm.classList.remove("hidden");
  overlay.classList.remove("hidden");
}

function closeModal() {
  close.classList.add("hidden");
  signUpForm.classList.add("hidden");
  signInForm.classList.add("hidden");
  overlay.classList.add("hidden");
  showCardDetails.innerHTML = "";
  form.forEach((ele) => ele.reset());
}

function closeModalOnEsc(e) {
  if (e.key === "Escape" && !close.classList.contains("hidden")) {
    closeModal();
  }
}

// ======================
// 🖼️ Image Generation
// ======================
function loadImages(url) {
  let img = new Image();
  img.src = url;
  img.alt = "Image not found";
  img.onload = () => imageSlider.appendChild(img);
  img.onerror = () => console.error("❌ Error loading image");
}

// ======================
// 📐 Handle Shape Change
// ======================
imageShapeRow.addEventListener("click", (e) => {
  e.preventDefault();
  if (e.target.matches(".active") || !e.target.matches(".image-shape-btn")) return;

  activeShape.classList.remove("active");
  e.target.classList.add("active");
  activeShape = e.target;

  imageContainer.classList.remove(`${imageContainer.classList[1]}`);
  imageContainer.classList.add(`${e.target.classList[1]}-dimensions`);
  shapesArray = document.querySelectorAll(".image-shape-btn:not(.active)");
});

// ======================
// 🚀 Generate Image
// ======================
generateBtn.addEventListener("click", async () => {
  const text = textArea.value.trim();
  if (!text) return alert("Please enter some text!");

  middleItem.innerHTML = '<span class="loader"></span>';
  middleItem.classList.remove("hidden");

  try {
    const res = await fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, type: "guest_user_images", count: 1, epochs: 30, inPainting: false }),
    });

    const data = await res.json();
    if (!res.ok || !data.image_paths?.length) throw new Error(data.detail || "No image returned");

    loadImages(data.image_paths[0]);
    middleItem.classList.add("hidden");
  } catch (err) {
    console.error("❌ Failed to generate:", err.message);
    alert("Image generation failed.");
  }
});

// ======================
// 📝 Register
// ======================
registerBtn.addEventListener("click", async (e) => {
  e.preventDefault();

  const firstname = document.querySelector(".signUpForm input[placeholder='First name']").value;
  const lastname = document.querySelector(".signUpForm input[placeholder='Last name']").value;
  const email = document.querySelector(".signUpForm input[placeholder='Email']").value;
  const password = document.querySelector(".signUpForm input[placeholder='Password']").value;
  const confirmPassword = document.querySelector(".signUpForm input[placeholder='Confirm Password']").value;

  if (!firstname || !lastname || !email || !password || !confirmPassword) {
    return alert("All fields are required.");
  }

  if (password !== confirmPassword) {
    return alert("Passwords do not match.");
  }

  try {
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstname, lastname, email, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Registration failed.");

    alert("✅ Registration successful!");
    window.location.href = "/user";
  } catch (err) {
    console.error("❌ Registration error:", err.message);
    alert("An error occurred. Please try again.");
  }
});

// ======================
// 🔓 Login
// ======================
loginBtn.addEventListener("click", async () => {
  const email = document.querySelector(".signInForm input[type='text']").value;
  const password = document.querySelector(".signInForm input[type='password']").value;

  if (!email || !password) return alert("Please fill in all fields.");

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Login failed.");

    alert("✅ Login successful!");
    window.location.href = data.redirect_url;
  } catch (err) {
    console.error("❌ Login error:", err.message);
    alert("Login failed. Please check credentials.");
  }
});

// ======================
// 🧠 Events
// ======================
document.addEventListener("click", function (e) {
  const ele = e.target;
  if (ele.closest(".signIn")) return openSignInForm(e);
  if (ele.closest(".signUp")) return openSignUpForm(e);
});

function MyEvents(event, element, callback) {
  if (element) {
    element.addEventListener(event, callback);
  } else {
    console.error(`Element not found for event: ${event}`);
  }
}

MyEvents("click", close, closeModal);
MyEvents("click", overlay, closeModal);
MyEvents("keydown", document, closeModalOnEsc);



