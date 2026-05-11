// assets/js/login.js

import { auth } from "./firebase-config.js";

import {
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const loginForm = document.getElementById("login-form");
const loginMessage = document.getElementById("login-message");

onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.href = "./index.html";
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  if (!email || !password) {
    showMessage("Completa correo y contraseña.", "error");
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    showMessage("Ingresando...", "success");
    window.location.href = "./index.html";
  } catch (error) {
    console.error("Error iniciando sesión:", error);
    showMessage("Correo o contraseña incorrectos.", "error");
  }
});

function showMessage(text, type = "success") {
  loginMessage.textContent = text;
  loginMessage.className = `form-message ${type}`;
}
