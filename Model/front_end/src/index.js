"use strict";

// ......................Variables...................
const signInForm = document.querySelector(".signInForm");
const signUpForm = document.querySelector(".signUpForm");
const form = document.querySelectorAll(".form");
const body = document.querySelector("body");
const overlay = document.querySelector(".overlay");
const close = document.querySelector(".close");
const signIn = document.querySelector(".signIn");
const signUp = document.querySelector(".signUp");
const showCardDetails = document.querySelector(".showCardDetails");

// ......................Functions...................

const openSignInForm = function (e) {
  e.preventDefault();
  closeModal();
  close.classList.remove("hidden");
  signInForm.classList.remove("hidden");
  overlay.classList.remove("hidden");
};

const openSignUpForm = function (e) {
  e.preventDefault();
  closeModal();
  close.classList.remove("hidden");
  signUpForm.classList.remove("hidden");
  overlay.classList.remove("hidden");
};

const closeModal = function () {
  close.classList.add("hidden");
  signUpForm.classList.add("hidden");
  signInForm.classList.add("hidden");
  overlay.classList.add("hidden");
  showCardDetails.innerHTML = "";
  form.forEach((ele) => ele.reset());
};

const closeModalOnEsc = function (e) {
  if (e.key === "Escape" && !close.classList.contains("hidden")) {
    closeModal();
  }
};

const MyEvents = function (onWhat, element, method) {
  element.addEventListener(onWhat, method);
};

// ......................EVENTS...................

MyEvents("click", close, closeModal);
MyEvents("click", overlay, closeModal);
MyEvents("keydown", document, closeModalOnEsc);

document.addEventListener("click", function (e) {
  e.preventDefault();

  const ele = e.target;
  if (ele.closest(".signIn")) {
    openSignInForm(e);
    return;
  }

  if (!ele.closest(".signUp")) return;

  openSignUpForm(e);
});

const imageCount = 1;
const imagesPath = "./images/guest_user_images/";
const middleItem = document.querySelector('.middle-item');
const imageSlider = document.querySelector('.slider-wrapper .slider');
const imageShapeRow = document.querySelector('#shape-row');
const imageContainer = document.querySelector('.image-container');
let shapesArray = document.querySelectorAll('.image-shape-btn:not(.active)');
let activeShape = document.querySelector('#shape-row .active');

const generateBtn = document.querySelector('.generate-btn');
const textArea = document.querySelector("#story");

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

// ************** Image Loading **************
function loadImages(url) {
  let img = new Image();
  img.src = `${url}`;
  img.alt = `Image not found`;

  img.onload = () => imageSlider.appendChild(img);
  img.onerror = () => clearInterval(interval);
}

// ************** Image Generation **************
// ************** Guest User Image Generation **************
generateBtn.addEventListener("click", async () => {
  const text = textArea.value.trim();
  if (!text) {
    alert("Please enter some text before generating!");
    return;
  }

  console.log("📤 Sending request to /api/generate-image with text:", text);

  try {
    const response = await fetch("http://127.0.0.1:8001/api/generate-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: text,
        type: "guest_user_images",
        count: 1
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log("✅ Response:", data);

    if (data.image_paths && data.image_paths.length > 0) {
      const imgUrl = data.image_paths[0];
      loadImages(imgUrl); 
    } else {
      console.error("❌ No image path received");
    }

    middleItem.classList.add('hidden');
  } catch (error) {
    console.error("❌ Error:", error);
  }
});




// ************** Login and Registration **************
// ************** Login and Registration **************

// Select form buttons
const loginBtn = document.querySelector(".signInForm .button-submit");
const registerBtn = document.querySelector(".signUpForm .button-submit");

loginBtn.addEventListener("click", async () => {
  const email = document.querySelector(".signInForm input[type='text']").value;
  const password = document.querySelector(".signInForm input[type='password']").value;

  if (!email || !password) {
    alert("Please fill in all fields.");
    return;
  }

  try {
    const response = await fetch("http://127.0.0.1:8001/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    console.log("Login Response:", data);

    if (response.ok && data.access_token) {
      localStorage.setItem("access_token", data.access_token);
      window.location.href = "/user";
    } else {
      alert("Login failed: " + (data.detail || "Invalid credentials."));
    }
  } catch (error) {
    console.error("Error during login:", error);
    alert("An error occurred. Please try again.");
  }
});


registerBtn.addEventListener("click", register);

// Register function
async function register(event) {
  event.preventDefault();

  const firstname = document.querySelector(".signUpForm input[placeholder='First name']").value;
  const lastname = document.querySelector(".signUpForm input[placeholder='Last name']").value;
  const email = document.querySelector(".signUpForm input[placeholder='Email']").value;
  const password = document.querySelector(".signUpForm input[placeholder='Password']").value;
  const confirmPassword = document.querySelector(".signUpForm input[placeholder='Confirm Password']").value;

  if (!firstname || !lastname || !email || !password || !confirmPassword) {
    alert("Please fill in all fields.");
    return;
  }

  if (password !== confirmPassword) {
    alert("Passwords do not match.");
    return;
  }

  try {
    const response = await fetch("http://127.0.0.1:8001/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstname, lastname, email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem("access_token", data.access_token); // save token
      alert("Registration successful!");
      window.location.href = "/user";
    } else {
      alert("Registration failed: " + (data.detail || "Try again later."));
    }
  } catch (error) {
    console.error("Error during registration:", error);
    alert("An error occurred. Please try again.");
  }
}
