// assets/js/inventario.js

import { db } from "./firebase-config.js";

import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const form = document.getElementById("inventory-form");
const list = document.getElementById("inventory-list");
const formMessage = document.getElementById("form-message");
const inventoryCount = document.getElementById("inventory-count");

const inventarioRef = collection(db, "inventario");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const nombre = document.getElementById("item-nombre").value.trim();
  const categoria = document.getElementById("item-categoria").value;
  const cantidadTotal = Number(document.getElementById("item-cantidad").value);
  const tienePrecio = document.getElementById("item-tiene-precio").value === "si";
  const precioRenta = Number(document.getElementById("item-precio-renta").value);
  const precioPreferencial = Number(document.getElementById("item-precio-preferencial").value);
  const observaciones = document.getElementById("item-observaciones").value.trim();

  if (!nombre || !categoria) {
    showMessage("Completa nombre y categoría.", "error");
    return;
  }

  const nuevoItem = {
    nombre,
    categoria,
    cantidadTotal,
    cantidadDisponible: cantidadTotal,
    cantidadReservada: 0,
    cantidadMantenimiento: 0,
    tienePrecio,
    precioRenta: tienePrecio ? precioRenta : 0,
    precioPreferencial: tienePrecio ? precioPreferencial : 0,
    observaciones,
    estado: "Activo",
    creadoEn: serverTimestamp(),
    actualizadoEn: serverTimestamp()
  };

  try {
    await addDoc(inventarioRef, nuevoItem);

    form.reset();
    document.getElementById("item-cantidad").value = 1;
    document.getElementById("item-precio-renta").value = 0;
    document.getElementById("item-precio-preferencial").value = 0;

    showMessage("Item guardado correctamente.", "success");
    await loadInventory();
  } catch (error) {
    console.error("Error guardando inventario:", error);
    showMessage("No se pudo guardar. Revisa reglas de Firebase o consola.", "error");
  }
});

async function loadInventory() {
  list.innerHTML = `<p class="empty-text">Cargando items...</p>`;

  try {
    const q = query(inventarioRef, orderBy("creadoEn", "desc"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      list.innerHTML = `<p class="empty-text">Todavía no hay items registrados.</p>`;
      inventoryCount.textContent = "0 items registrados";
      return;
    }

    inventoryCount.textContent = `${snapshot.size} items registrados`;

    list.innerHTML = "";

    snapshot.forEach((doc) => {
      const item = doc.data();

      const card = document.createElement("article");
      card.className = "data-card";

      card.innerHTML = `
        <div class="data-card-top">
          <span class="pill">${item.categoria || "Sin categoría"}</span>
          <span class="pill ${item.tienePrecio ? "pill-red" : ""}">
            ${item.tienePrecio ? "Con precio" : "Incluido"}
          </span>
        </div>

        <h3>${item.nombre || "Sin nombre"}</h3>

        <div class="data-grid">
          <div>
            <small>Total</small>
            <strong>${item.cantidadTotal ?? 0}</strong>
          </div>

          <div>
            <small>Disponible</small>
            <strong>${item.cantidadDisponible ?? 0}</strong>
          </div>

          <div>
            <small>Renta</small>
            <strong>S/ ${(item.precioRenta ?? 0).toFixed(2)}</strong>
          </div>

          <div>
            <small>Preferencial</small>
            <strong>S/ ${(item.precioPreferencial ?? 0).toFixed(2)}</strong>
          </div>
        </div>

        <p class="card-note">
          ${item.observaciones || "Sin observaciones."}
        </p>
      `;

      list.appendChild(card);
    });

  } catch (error) {
    console.error("Error leyendo inventario:", error);
    list.innerHTML = `
      <p class="empty-text error-text">
        No se pudo cargar inventario. Revisa reglas de Firebase.
      </p>
    `;
    inventoryCount.textContent = "Error cargando inventario";
  }
}

function showMessage(text, type = "success") {
  formMessage.textContent = text;
  formMessage.className = `form-message ${type}`;

  setTimeout(() => {
    formMessage.textContent = "";
    formMessage.className = "form-message";
  }, 3500);
}

loadInventory();
