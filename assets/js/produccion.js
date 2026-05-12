import { db, auth } from "./firebase-config.js";
import { isBasic } from "./roles.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const productionList = document.getElementById("production-list");
const productionCount = document.getElementById("production-count");

const overlay = document.getElementById("production-overlay");
const overlayContent = document.getElementById("overlay-content");
const closeOverlayBtn = document.getElementById("close-overlay");

const eventosRef = collection(db, "eventos");
const inventarioRef = collection(db, "inventario");

let eventosCache = [];
let inventarioCache = [];
let selectedEvento = null;
let currentUser = null;
let userIsBasic = false;

const estadosProduccionVisibles = [
  "Cotizado",
  "Ya dio anticipo",
  "En Producción"
];

closeOverlayBtn.addEventListener("click", closeOverlay);

overlay.addEventListener("click", (event) => {
  if (event.target === overlay) {
    closeOverlay();
  }
});

async function init() {
  await loadInventario();
  await loadEventosProduccion();
}

async function loadInventario() {
  try {
    const q = query(inventarioRef, orderBy("nombre", "asc"));
    const snapshot = await getDocs(q);

    inventarioCache = [];

    snapshot.forEach((docSnap) => {
      inventarioCache.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });

  } catch (error) {
    console.error("Error cargando inventario:", error);
  }
}

async function loadEventosProduccion() {
  productionList.innerHTML = `<p class="empty-text">Cargando eventos...</p>`;

  try {
    const q = query(eventosRef, orderBy("fechaEvento", "asc"));
    const snapshot = await getDocs(q);

    eventosCache = [];

    snapshot.forEach((docSnap) => {
      const evento = {
        id: docSnap.id,
        ...docSnap.data()
      };

      if (estadosProduccionVisibles.includes(evento.estadoEvento)) {
        eventosCache.push(evento);
      }
    });

    productionCount.textContent = `${eventosCache.length} eventos en producción`;
    renderEventosProduccion();

  } catch (error) {
    console.error("Error cargando eventos de producción:", error);

    productionList.innerHTML = `
      <p class="empty-text error-text">
        No se pudieron cargar los eventos de producción.
      </p>
    `;

    productionCount.textContent = "Error cargando producción";
  }
}

function renderEventosProduccion() {
  if (eventosCache.length === 0) {
    productionList.innerHTML = `
      <p class="empty-text">
        No hay eventos cotizados o con anticipo por ahora.
      </p>
    `;
    return;
  }

  productionList.innerHTML = "";

  eventosCache.forEach((evento) => {
    const materiales = evento.materialesProduccion || [];
    const totalMateriales = materiales.length;
    const materialesListos = materiales.filter((item) => item.checkedSalida).length;

    const card = document.createElement("article");
    card.className = "data-card clickable-card";

    card.innerHTML = `
      <div class="data-card-top">
        <span class="pill pill-red">${evento.estadoEvento || "Sin estado"}</span>
        <span class="pill">${evento.tipoServicio || "Sin servicio"}</span>
      </div>

      <h3>${evento.detalleServicio || "Evento sin detalle"}</h3>

      <p class="card-note">
        Cliente: ${evento.contactoNombre || "Sin contacto"}
      </p>

      <div class="data-grid">
        <div>
          <small>Fecha</small>
          <strong>${formatDate(evento.fechaEvento)}</strong>
        </div>

        <div>
          <small>Hora</small>
          <strong>${evento.horaShow || "—"}</strong>
        </div>

        <div>
          <small>Checklist</small>
          <strong>${materialesListos}/${totalMateriales}</strong>
        </div>

        <div>
          <small>Encargado</small>
          <strong>${evento.encargado || "—"}</strong>
        </div>
      </div>

      <p class="card-note">
        Ubicación: ${evento.ubicacion || "Sin ubicación"}
      </p>

      <button class="secondary-btn" data-action="open" data-id="${evento.id}">
        Abrir producción
      </button>
    `;

    productionList.appendChild(card);
  });

  document.querySelectorAll("[data-action='open']").forEach((button) => {
    button.addEventListener("click", () => {
      const eventoId = button.dataset.id;
      openEventoProduccion(eventoId);
    });
  });
}

function openEventoProduccion(eventoId) {
  selectedEvento = eventosCache.find((evento) => evento.id === eventoId);

  if (!selectedEvento) {
    alert("No se encontró el evento.");
    return;
  }

  overlay.classList.remove("hidden");
  renderOverlay();
}

function renderOverlay() {
  if (!selectedEvento) return;

  const materiales = selectedEvento.materialesProduccion || [];
  const todosListos = materiales.length > 0 && materiales.every((item) => item.checkedSalida);

  overlayContent.innerHTML = `
    <div class="overlay-head">
      <div>
        <p class="eyebrow">Producción</p>
        <h2>${selectedEvento.detalleServicio || "Evento sin detalle"}</h2>
        <p class="card-note">
          ID Firebase: ${selectedEvento.id}
        </p>
      </div>

      <span class="pill pill-red">${selectedEvento.estadoEvento || "Sin estado"}</span>
    </div>

    <section class="detail-summary">
      <div>
        <small>Cliente</small>
        <strong>${selectedEvento.contactoNombre || "—"}</strong>
      </div>

      <div>
        <small>Tipo de servicio</small>
        <strong>${selectedEvento.tipoServicio || "—"}</strong>
      </div>

      <div>
        <small>Fecha</small>
        <strong>${formatDate(selectedEvento.fechaEvento)}</strong>
      </div>

      <div>
        <small>Hora</small>
        <strong>${selectedEvento.horaShow || "—"}</strong>
      </div>

      <div>
        <small>Ubicación</small>
        <strong>${selectedEvento.ubicacion || "—"}</strong>
      </div>

      <div>
        <small>Encargado</small>
        <strong>${selectedEvento.encargado || "—"}</strong>
      </div>
    </section>

    ${
  userIsBasic
    ? ""
    : `
      <section class="material-add-box">
        <h3>Agregar material desde inventario</h3>

        <div class="material-add-grid">
          <select id="material-select">
            <option value="">Seleccionar item</option>
            ${inventarioCache
              .map((item) => {
                return `
                  <option value="${item.id}">
                    ${item.nombre} | Disponible: ${item.cantidadDisponible ?? 0}
                  </option>
                `;
              })
              .join("")}
          </select>

          <input 
            type="number" 
            id="material-qty" 
            min="1" 
            value="1"
          />

          <button id="add-material-btn" class="primary-btn">
            Agregar
          </button>
        </div>
      </section>
    `
}

    <section class="checklist-box">
      <div class="section-head">
        <div>
          <p class="eyebrow">Checklist</p>
          <h3>Materiales para salida</h3>
        </div>
      </div>

      <div id="materials-list">
        ${renderMateriales(materiales)}
      </div>

      <button 
        id="notify-btn" 
        class="primary-btn ${todosListos ? "" : "disabled-btn"}"
        ${todosListos ? "" : "disabled"}
      >
        Notificar producción lista
      </button>
    </section>
  `;
const addMaterialBtn = document.getElementById("add-material-btn");

if (addMaterialBtn && !userIsBasic) {
  addMaterialBtn.addEventListener("click", addMaterialToEvento);
}
  document.querySelectorAll("[data-action='toggle-material']").forEach((checkbox) => {
    checkbox.addEventListener("change", async () => {
      const index = Number(checkbox.dataset.index);
      await toggleMaterial(index, checkbox.checked);
    });
  });

  document.querySelectorAll("[data-action='remove-material']").forEach((button) => {
    button.addEventListener("click", async () => {
      const index = Number(button.dataset.index);
      await removeMaterial(index);
    });
  });

  const notifyBtn = document.getElementById("notify-btn");

  notifyBtn.addEventListener("click", async () => {
    await notifyProductionReady();
  });
}

function renderMateriales(materiales) {
  if (!materiales || materiales.length === 0) {
    return `
      <p class="empty-text">
        Todavía no hay materiales agregados para este evento.
      </p>
    `;
  }

  return materiales
    .map((material, index) => {
      return `
        <article class="check-item">
          <label class="check-line">
            <input
              type="checkbox"
              data-action="toggle-material"
              data-index="${index}"
              ${material.checkedSalida ? "checked" : ""}
            />

            <span>
              <strong>${material.nombre}</strong>
              <small>
                Cantidad: ${material.cantidad} | Categoría: ${material.categoria || "—"}
              </small>
            </span>
          </label>

          ${
              userIsBasic
                ? ""
                : `
                  <button 
                    class="mini-danger-btn" 
                    data-action="remove-material"
                    data-index="${index}"
                  >
                    Quitar
                  </button>
                `
            }
        </article>
      `;
    })
    .join("");
}

async function addMaterialToEvento() {
  const select = document.getElementById("material-select");
  const qtyInput = document.getElementById("material-qty");

  const inventarioId = select.value;
  const cantidad = Number(qtyInput.value);

  if (!inventarioId) {
    alert("Selecciona un item del inventario.");
    return;
  }

  if (!cantidad || cantidad <= 0) {
    alert("Coloca una cantidad válida.");
    return;
  }

  const inventarioItem = inventarioCache.find((item) => item.id === inventarioId);

  if (!inventarioItem) {
    alert("No se encontró el item en inventario.");
    return;
  }

  const disponible = Number(inventarioItem.cantidadDisponible || 0);

  if (cantidad > disponible) {
    const confirmar = confirm(
      `Solo hay ${disponible} disponibles. ¿Igual quieres agregar ${cantidad}?`
    );

    if (!confirmar) return;
  }

  const materiales = selectedEvento.materialesProduccion || [];

  const nuevoMaterial = {
    inventarioId,
    nombre: inventarioItem.nombre,
    categoria: inventarioItem.categoria,
    cantidad,
    checkedSalida: false,
    checkedRetorno: false,
    agregadoManual: true
  };

  materiales.push(nuevoMaterial);

  await updateEventoMateriales(materiales, {
    estadoProduccion: "En preparación"
  });
}

async function toggleMaterial(index, checked) {
  const materiales = selectedEvento.materialesProduccion || [];

  if (!materiales[index]) return;

  materiales[index].checkedSalida = checked;

  await updateEventoMateriales(materiales);
}

async function removeMaterial(index) {
  const materiales = selectedEvento.materialesProduccion || [];

  if (!materiales[index]) return;

  const confirmar = confirm(`¿Quitar ${materiales[index].nombre} del checklist?`);

  if (!confirmar) return;

  materiales.splice(index, 1);

  await updateEventoMateriales(materiales);
}

async function notifyProductionReady() {
  const materiales = selectedEvento.materialesProduccion || [];

  if (materiales.length === 0) {
    alert("Agrega materiales antes de notificar.");
    return;
  }

  const todosListos = materiales.every((item) => item.checkedSalida);

  if (!todosListos) {
    alert("Primero marca todos los materiales del checklist.");
    return;
  }

  const eventoDocRef = doc(db, "eventos", selectedEvento.id);

  try {
    await updateDoc(eventoDocRef, {
      estadoProduccion: "Producción lista",
      produccionNotificada: true,
      produccionNotificadaEn: serverTimestamp(),
      actualizadoEn: serverTimestamp()
    });

    alert("Producción notificada correctamente.");

    selectedEvento.estadoProduccion = "Producción lista";
    selectedEvento.produccionNotificada = true;

    await loadEventosProduccion();

    const refreshedEvent = eventosCache.find((evento) => evento.id === selectedEvento.id);
    selectedEvento = refreshedEvent || selectedEvento;

    renderOverlay();

  } catch (error) {
    console.error("Error notificando producción:", error);
    alert("No se pudo notificar producción.");
  }
}

async function updateEventoMateriales(materiales, extraData = {}) {
  const eventoDocRef = doc(db, "eventos", selectedEvento.id);

  try {
    await updateDoc(eventoDocRef, {
      materialesProduccion: materiales,
      actualizadoEn: serverTimestamp(),
      ...extraData
    });

    selectedEvento.materialesProduccion = materiales;

    Object.assign(selectedEvento, extraData);

    await loadEventosProduccion();

    const refreshedEvent = eventosCache.find((evento) => evento.id === selectedEvento.id);
    selectedEvento = refreshedEvent || selectedEvento;

    renderOverlay();

  } catch (error) {
    console.error("Error actualizando materiales:", error);
    alert("No se pudo actualizar el checklist.");
  }
}

function closeOverlay() {
  overlay.classList.add("hidden");
  selectedEvento = null;
}

function formatDate(dateString) {
  if (!dateString) return "—";

  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  userIsBasic = isBasic(user);

  await init();
});
