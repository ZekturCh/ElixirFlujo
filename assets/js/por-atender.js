// assets/js/por-atender.js

import { db } from "./firebase-config.js";

import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const contactForm = document.getElementById("contact-form");
const eventForm = document.getElementById("event-form");

const contactMessage = document.getElementById("contact-message");
const eventMessage = document.getElementById("event-message");

const contactoSelect = document.getElementById("evento-contacto");
const eventsList = document.getElementById("events-list");
const eventsCount = document.getElementById("events-count");

const contactosRef = collection(db, "contactos");
const eventosRef = collection(db, "eventos");

let contactosCache = [];
let eventosCache = [];

contactForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const nombre = document.getElementById("contacto-nombre").value.trim();
  const tipoCliente = document.getElementById("contacto-tipo").value;
  const telefono = document.getElementById("contacto-telefono").value.trim();

  if (!nombre || !tipoCliente) {
    showMessage(contactMessage, "Completa nombre y tipo de cliente.", "error");
    return;
  }

  const nuevoContacto = {
    nombre,
    tipoCliente,
    telefono,
    creadoEn: serverTimestamp(),
    actualizadoEn: serverTimestamp()
  };

  try {
    await addDoc(contactosRef, nuevoContacto);

    contactForm.reset();
    showMessage(contactMessage, "Contacto guardado correctamente.", "success");

    await loadContactos();
  } catch (error) {
    console.error("Error guardando contacto:", error);
    showMessage(contactMessage, "No se pudo guardar el contacto.", "error");
  }
});

eventForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const contactoId = contactoSelect.value;
  const contacto = contactosCache.find((item) => item.id === contactoId);

  const fechaEvento = document.getElementById("evento-fecha").value;
  const horaShow = document.getElementById("evento-hora").value;
  const ubicacion = document.getElementById("evento-ubicacion").value.trim();
  const tipoServicio = document.getElementById("evento-tipo-servicio").value;
  const detalleServicio = document.getElementById("evento-detalle").value.trim();
  const estadoEvento = document.getElementById("evento-estado").value;
  const costoTotal = Number(document.getElementById("evento-costo").value);
  const encargado = document.getElementById("evento-encargado").value.trim();

  if (!contacto || !fechaEvento || !tipoServicio || !estadoEvento) {
    showMessage(eventMessage, "Completa contacto, fecha, servicio y estado.", "error");
    return;
  }

  const mesEvento = fechaEvento.slice(0, 7);

  const nuevoEvento = {
    contactoId,
    contactoNombre: contacto.nombre,
    contactoTipoCliente: contacto.tipoCliente,
    ubicacion,
    fechaEvento,
    mesEvento,
    horaShow,
    tipoServicio,
    detalleServicio,
    costoTotal,
    encargado,
    estadoEvento,

    // Estados internos para siguientes módulos
    estadoProduccion: "Pendiente",
    estadoRetorno: "Pendiente",
    estadoFinanza: costoTotal > 0 ? "Por cobrar" : "Sin monto",

    creadoEn: serverTimestamp(),
    actualizadoEn: serverTimestamp()
  };

  try {
    await addDoc(eventosRef, nuevoEvento);

    eventForm.reset();
    showMessage(eventMessage, "Evento guardado correctamente.", "success");

    await loadEventos();
  } catch (error) {
    console.error("Error guardando evento:", error);
    showMessage(eventMessage, "No se pudo guardar el evento.", "error");
  }
});

async function loadContactos() {
  contactoSelect.innerHTML = `<option value="">Cargando contactos...</option>`;

  try {
    const q = query(contactosRef, orderBy("nombre", "asc"));
    const snapshot = await getDocs(q);

    contactosCache = [];

    snapshot.forEach((docSnap) => {
      contactosCache.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });

    renderContactos();
  } catch (error) {
    console.error("Error cargando contactos:", error);
    contactoSelect.innerHTML = `<option value="">Error cargando contactos</option>`;
  }
}

function renderContactos() {
  if (contactosCache.length === 0) {
    contactoSelect.innerHTML = `<option value="">Primero agrega un contacto</option>`;
    return;
  }

  contactoSelect.innerHTML = `
    <option value="">Seleccionar contacto</option>
    ${contactosCache
      .map((contacto) => {
        return `
          <option value="${contacto.id}">
            ${contacto.nombre} - ${contacto.tipoCliente}
          </option>
        `;
      })
      .join("")}
  `;
}

async function loadEventos() {
  eventsList.innerHTML = `<p class="empty-text">Cargando eventos...</p>`;

  try {
    const q = query(eventosRef, orderBy("creadoEn", "desc"));
    const snapshot = await getDocs(q);

    eventosCache = [];

    snapshot.forEach((docSnap) => {
      eventosCache.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });

    eventsCount.textContent = `${eventosCache.length} eventos registrados`;
    renderEventos();
  } catch (error) {
    console.error("Error cargando eventos:", error);
    eventsList.innerHTML = `
      <p class="empty-text error-text">
        No se pudieron cargar los eventos.
      </p>
    `;
    eventsCount.textContent = "Error cargando eventos";
  }
}

function renderEventos() {
  if (eventosCache.length === 0) {
    eventsList.innerHTML = `<p class="empty-text">Todavía no hay eventos registrados.</p>`;
    return;
  }

  eventsList.innerHTML = "";

  eventosCache.forEach((evento) => {
    const card = document.createElement("article");
    card.className = "data-card";

    const costo = Number(evento.costoTotal || 0);

    card.innerHTML = `
      <div class="data-card-top">
        <span class="pill pill-red">${evento.estadoEvento || "Sin estado"}</span>
        <span class="pill">${evento.tipoServicio || "Sin servicio"}</span>
      </div>

      <h3>${evento.contactoNombre || "Sin contacto"}</h3>

      <p class="card-note">
        ${evento.detalleServicio || "Sin detalle de servicio."}
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
          <small>Costo</small>
          <strong>S/ ${costo.toFixed(2)}</strong>
        </div>

        <div>
          <small>Encargado</small>
          <strong>${evento.encargado || "—"}</strong>
        </div>
      </div>

      <p class="card-note">
        Ubicación: ${evento.ubicacion || "Sin ubicación"}
      </p>

      <p class="card-note">
        ID Firebase: ${evento.id}
      </p>
    `;

    eventsList.appendChild(card);
  });
}

function formatDate(dateString) {
  if (!dateString) return "—";

  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

function showMessage(element, text, type = "success") {
  element.textContent = text;
  element.className = `form-message ${type}`;

  setTimeout(() => {
    element.textContent = "";
    element.className = "form-message";
  }, 3500);
}

loadContactos();
loadEventos();
