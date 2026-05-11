// assets/js/contactos.js

import { db } from "./firebase-config.js";

import {
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const contactsCount = document.getElementById("contacts-count");
const contactsList = document.getElementById("contacts-list");

const contactosRef = collection(db, "contactos");
const eventosRef = collection(db, "eventos");

let contactosCache = [];
let eventosCache = [];

async function init() {
  await loadData();
  renderContactos();
}

async function loadData() {
  try {
    const contactosQuery = query(contactosRef, orderBy("nombre", "asc"));
    const eventosQuery = query(eventosRef, orderBy("fechaEvento", "desc"));

    const [contactosSnapshot, eventosSnapshot] = await Promise.all([
      getDocs(contactosQuery),
      getDocs(eventosQuery)
    ]);

    contactosCache = [];
    eventosCache = [];

    contactosSnapshot.forEach((docSnap) => {
      contactosCache.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });

    eventosSnapshot.forEach((docSnap) => {
      eventosCache.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });

    contactsCount.textContent = `${contactosCache.length} contactos registrados`;

  } catch (error) {
    console.error("Error cargando contactos:", error);

    contactsCount.textContent = "Error cargando contactos";

    contactsList.innerHTML = `
      <p class="empty-text error-text">
        No se pudieron cargar los contactos.
      </p>
    `;
  }
}

function renderContactos() {
  if (contactosCache.length === 0) {
    contactsList.innerHTML = `
      <p class="empty-text">
        Todavía no hay contactos registrados.
      </p>
    `;
    return;
  }

  contactsList.innerHTML = "";

  contactosCache.forEach((contacto) => {
    const eventosDelContacto = eventosCache.filter((evento) => {
      return evento.contactoId === contacto.id || evento.contactoNombre === contacto.nombre;
    });

    const totalEventos = eventosDelContacto.length;

    const ultimoEvento = eventosDelContacto[0];

    const card = document.createElement("article");
    card.className = "data-card";

    card.innerHTML = `
      <div class="data-card-top">
        <span class="pill pill-red">${contacto.tipoCliente || "Sin tipo"}</span>
        <span class="pill">${totalEventos} eventos</span>
      </div>

      <h3>${contacto.nombre || "Sin nombre"}</h3>

      <div class="data-grid">
        <div>
          <small>Teléfono</small>
          <strong>${contacto.telefono || "—"}</strong>
        </div>

        <div>
          <small>Tipo</small>
          <strong>${contacto.tipoCliente || "—"}</strong>
        </div>

        <div>
          <small>Último evento</small>
          <strong>${ultimoEvento ? formatDate(ultimoEvento.fechaEvento) : "—"}</strong>
        </div>

        <div>
          <small>Último estado</small>
          <strong>${ultimoEvento ? ultimoEvento.estadoEvento : "—"}</strong>
        </div>
      </div>

      <p class="card-note">
        ID contacto: ${contacto.id}
      </p>
    `;

    contactsList.appendChild(card);
  });
}

function formatDate(dateString) {
  if (!dateString) return "—";

  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

init();
