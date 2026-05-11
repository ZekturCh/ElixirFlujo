// assets/js/inventario.js

import { db } from "./firebase-config.js";

import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const form = document.getElementById("inventory-form");
const list = document.getElementById("inventory-list");
const formMessage = document.getElementById("form-message");
const inventoryCount = document.getElementById("inventory-count");

const inventarioRef = collection(db, "inventario");
const movimientosRef = collection(db, "movimientosInventario");

let inventarioCache = [];

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const nombre = document.getElementById("item-nombre").value.trim();
  const categoria = document.getElementById("item-categoria").value;
  const cantidadTotal = Number(document.getElementById("item-cantidad").value);
  const precioRenta = Number(document.getElementById("item-precio-renta").value);
  const precioPreferencial = Number(document.getElementById("item-precio-preferencial").value);

  if (!nombre || !categoria) {
    showMessage("Completa nombre y categoría.", "error");
    return;
  }

  const nuevoItem = {
    nombre,
    categoria,
    cantidadTotal,
    cantidadDisponible: cantidadTotal,
    precioRenta,
    precioPreferencial,
    activo: true,
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
    showMessage("No se pudo guardar. Revisa Firebase.", "error");
  }
});

async function loadInventory() {
  list.innerHTML = `<p class="empty-text">Cargando items...</p>`;

  try {
    const q = query(inventarioRef, orderBy("creadoEn", "desc"));
    const snapshot = await getDocs(q);

    inventarioCache = [];

    if (snapshot.empty) {
      list.innerHTML = `<p class="empty-text">Todavía no hay items registrados.</p>`;
      inventoryCount.textContent = "0 items registrados";
      return;
    }

    snapshot.forEach((docSnap) => {
      inventarioCache.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });

    inventoryCount.textContent = `${inventarioCache.length} items registrados`;
    renderInventory();

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

function renderInventory() {
  list.innerHTML = "";

  inventarioCache.forEach((item) => {
    const precioRenta = Number(item.precioRenta || 0);
    const precioPreferencial = Number(item.precioPreferencial || 0);

    const card = document.createElement("article");
    card.className = "data-card";

    card.innerHTML = `
      <div class="data-card-top">
        <span class="pill">${item.categoria || "Sin categoría"}</span>
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

        ${
          precioRenta > 0
            ? `
              <div>
                <small>Renta</small>
                <strong>S/ ${precioRenta.toFixed(2)}</strong>
              </div>
            `
            : ""
        }

        ${
          precioPreferencial > 0
            ? `
              <div>
                <small>Preferencial</small>
                <strong>S/ ${precioPreferencial.toFixed(2)}</strong>
              </div>
            `
            : ""
        }
      </div>

      <div class="movement-box">
        <h4>Movimiento</h4>

        <div class="movement-grid">
          <select data-field="tipo" data-id="${item.id}">
            <option value="ingreso">Ingreso</option>
            <option value="venta">Venta</option>
            <option value="perdida">Pérdida</option>
          </select>

          <input 
            type="number" 
            min="1" 
            value="1" 
            data-field="cantidad" 
            data-id="${item.id}"
          />
        </div>

        <input 
          type="text" 
          placeholder="Motivo opcional. Ej: venta evento UPC"
          data-field="motivo" 
          data-id="${item.id}"
        />

        <button class="secondary-btn" data-action="movement" data-id="${item.id}">
          Registrar movimiento
        </button>
      </div>
    `;

    list.appendChild(card);
  });

  const movementButtons = document.querySelectorAll("[data-action='movement']");

  movementButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const itemId = button.dataset.id;
      await registrarMovimiento(itemId);
    });
  });
}

async function registrarMovimiento(itemId) {
  const item = inventarioCache.find((inv) => inv.id === itemId);

  if (!item) {
    alert("No se encontró el item.");
    return;
  }

  const tipoInput = document.querySelector(`[data-field="tipo"][data-id="${itemId}"]`);
  const cantidadInput = document.querySelector(`[data-field="cantidad"][data-id="${itemId}"]`);
  const motivoInput = document.querySelector(`[data-field="motivo"][data-id="${itemId}"]`);

  const tipoMovimiento = tipoInput.value;
  const cantidad = Number(cantidadInput.value);
  const motivo = motivoInput.value.trim();

  if (!cantidad || cantidad <= 0) {
    alert("Coloca una cantidad válida.");
    return;
  }

  const stockActual = Number(item.cantidadDisponible || 0);

  if ((tipoMovimiento === "venta" || tipoMovimiento === "perdida") && cantidad > stockActual) {
    alert("No puedes descontar más de lo disponible.");
    return;
  }

  const itemDocRef = doc(db, "inventario", itemId);

  try {
    await runTransaction(db, async (transaction) => {
      const itemDoc = await transaction.get(itemDocRef);

      if (!itemDoc.exists()) {
        throw new Error("El item ya no existe.");
      }

      const data = itemDoc.data();
      const stockAntes = Number(data.cantidadDisponible || 0);
      const totalAntes = Number(data.cantidadTotal || 0);

      let stockDespues = stockAntes;
      let totalDespues = totalAntes;

      if (tipoMovimiento === "ingreso") {
        stockDespues = stockAntes + cantidad;
        totalDespues = totalAntes + cantidad;
      }

      if (tipoMovimiento === "venta" || tipoMovimiento === "perdida") {
        if (cantidad > stockAntes) {
          throw new Error("Stock insuficiente.");
        }

        stockDespues = stockAntes - cantidad;
        totalDespues = totalAntes - cantidad;
      }

      transaction.update(itemDocRef, {
        cantidadDisponible: stockDespues,
        cantidadTotal: totalDespues,
        actualizadoEn: serverTimestamp()
      });

      const movimientoDocRef = doc(movimientosRef);

      transaction.set(movimientoDocRef, {
        inventarioId: itemId,
        itemNombre: data.nombre,
        itemCategoria: data.categoria,
        tipoMovimiento,
        cantidad,
        stockAntes,
        stockDespues,
        totalAntes,
        totalDespues,
        motivo,
        creadoEn: serverTimestamp()
      });
    });

    alert("Movimiento registrado correctamente.");
    await loadInventory();

  } catch (error) {
    console.error("Error registrando movimiento:", error);
    alert(error.message || "No se pudo registrar el movimiento.");
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
