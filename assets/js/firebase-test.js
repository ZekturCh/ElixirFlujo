import { testFirebaseConnection } from "./firebase-config.js";

const statusBox = document.getElementById("firebase-status");

async function checkFirebase() {
  if (!statusBox) return;

  statusBox.classList.remove("success", "error");
  statusBox.innerHTML = `
    <span class="status-dot warning"></span>
    <span>Conectando con Firebase...</span>
  `;

  try {
    await testFirebaseConnection();

    statusBox.classList.add("success");
    statusBox.innerHTML = `
      <span class="status-dot"></span>
      <span>Firebase conectado correctamente</span>
    `;
  } catch (error) {
    console.error("Error conectando con Firebase:", error);

    statusBox.classList.add("error");
    statusBox.innerHTML = `
      <span class="status-dot error-dot"></span>
      <span>Error de conexión con Firebase</span>
    `;
  }
}

checkFirebase();
