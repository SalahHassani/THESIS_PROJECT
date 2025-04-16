"use strict";

// ======================
// 🎨 Theme Toggle
// ======================
const toggle = document.getElementById("toggleTheme");

const lightColors = {
  "--color-bg": "#fafafa",
  "--color-nav-bg": "#f0f0f0",
  "--color-sidebar-bg": "#e6e8eb",
  "--color-text": "#1a1a1a",
  "--color-input-bg": "#f5f7fa",
  "--color-input-border": "#bbb",
  "--color-placeholder": "#666",
  "--color-shadow": "rgba(100, 100, 100, 0.1)",
  "--color-shadow-toggle": "rgba(0, 0, 0, 0.15)",
  "--color-overlay": "rgba(240, 240, 240, 0.8)",
  "--color-toggle-bg": "#12151E",
  "--color-toggle-bg-hover": "#2C3E50",
  "--color-toggle-text": "#ffffff"
};

const darkColors = {
  "--color-bg": "rgb(18, 21, 30)",
  "--color-nav-bg": "rgb(28, 32, 42)",
  "--color-sidebar-bg": "rgb(35, 40, 50)",
  "--color-text": "#f5f5f5",
  "--color-input-bg": "rgb(45, 50, 60)",
  "--color-input-border": "rgb(65, 70, 80)",
  "--color-placeholder": "rgb(140, 145, 155)",
  "--color-shadow": "rgba(10, 12, 18, 0.5)",
  "--color-shadow-toggle": "rgba(235, 240, 255, 0.5)",
  "--color-overlay": "rgba(10, 12, 18, 0.7)",
  "--color-toggle-bg": "#ffffff",
  "--color-toggle-bg-hover": "#f5f5f5",
  "--color-toggle-text": "#000000"
};

function setColors(themeObj) {
  for (const [key, value] of Object.entries(themeObj)) {
    document.documentElement.style.setProperty(key, value);
  }
}

const saved = localStorage.getItem("theme-toggle");
if (saved === "light") {
  toggle.classList.add("active");
  setColors(lightColors);
}

toggle.addEventListener("click", () => {
  toggle.classList.toggle("active");
  const isLight = toggle.classList.contains("active");
  isLight ? setColors(lightColors) : setColors(darkColors);
  localStorage.setItem("theme-toggle", isLight ? "light" : "dark");
});

// ======================
// 📱 Navbar Slide Toggle
// ======================
const navBar = document.querySelector("nav");
const menuBtns = document.querySelectorAll(".menu-item");
const overlay2 = document.querySelector(".overlay2");

menuBtns.forEach((btn) => btn.addEventListener("click", () => navBar.classList.toggle("open")));
overlay2.addEventListener("click", () => navBar.classList.remove("open"));

// ======================
// 🔓 Secure Logout
// ======================
async function logoutUser() {
  try {
    const response = await fetch("/api/logout", {
      method: "POST",
      credentials: "include"
    });

    if (response.ok) {
      alert("Logged out successfully.");
      window.location.href = "/";
    } else {
      alert("Logout failed.");
    }
  } catch (error) {
    console.error("Logout error:", error);
    alert("An error occurred during logout.");
  }
}

document.querySelector("#logout-btn")?.addEventListener("click", (e) => {
  e.preventDefault();
  logoutUser();
});
