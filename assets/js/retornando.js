// assets/js/retornando.js

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

const returnList = document.getElementById("return-list");
const returnCount = document.getElementById("return-count");

const overlay = document.getElementById("return-overlay");
const overlayContent = document.getElementById("return-overlay-content");
const closeOverlayBtn = document.getElementById("close-return-overlay");

const eventosRef = collection(db, "eventos");

let eventosRetornoCache = [];
let selectedEvento = null;
let currentUser = null;
let userIsBasic = false;

if (closeOverlayBtn) {
  closeOverlayBtn.addEventListener("click", closeOverlay);
}

if (overlay) {
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeOverlay();
    }
  });
}

async function init() {
  await loadEventosRetorno();
}

async function loadEventosRetorno() {
  returnList.innerHTML = `<p class="empty-text">Cargando eventos...</p>`;

  try {
    const q = query(eventosRef, orderBy("fechaEvento", "asc"));
    const snapshot = await getDocs(q);

    eventosRetornoCache = [];

    snapshot.forEach((docSnap) => {
      const evento = {
        id: docSnap.id,
        ...docSnap.data()
      };

      const debeAparecerEnRetorno =
        evento.produccionNotificada === true &&
        evento.estadoRetorno !== "Retorno completado" &&
        evento.estadoEvento !== "Terminado";

      if (debeAparecerEnRetorno) {
        eventosRetornoCache.push(evento);
      }
    });

    returnCount.textContent = `${eventosRetornoCache.length} eventos en retorno`;
    renderEventosRetorno();

  } catch (error) {
    console.error("Error cargando eventos de retorno:", error);

    returnList.innerHTML = `
      <p class="empty-text error-text">
        No se pudieron cargar los eventos de retorno.
      </p>
    `;

    returnCount.textContent = "Error cargando retornos";
  }
}

function renderEventosRetorno() {
  if (eventosRetornoCache.length === 0) {
    returnList.innerHTML = `
      <p class="empty-text">
        No hay eventos pendientes de retorno por ahora.
      </p>
    `;
    return;
  }

  returnList.innerHTML = "";

  eventosRetornoCache.forEach((evento) => {
    const materiales = evento.materialesProduccion || [];
    const totalMateriales = materiales.length;

    const materialesRetornados = materiales.filter((item) => {
      return item.estadoRetornoItem === "Retornado";
    }).length;

    const materialesConProblema = materiales.filter((item) => {
      return item.estadoRetornoItem === "Faltante" || item.estadoRetornoItem === "Dañado";
    }).length;

    const card = document.createElement("article");
    card.className = "data-card clickable-card";

    card.innerHTML = `
      <div class="data-card-top">
        <span class="pill pill-red">Retorno pendiente</span>
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
          <small>Retornados</small>
          <strong>${materialesRetornados}/${totalMateriales}</strong>
        </div>

        <div>
          <small>Problemas</small>
          <strong>${materialesConProblema}</strong>
        </div>
      </div>

      <p class="card-note">
        Ubicación: ${evento.ubicacion || "Sin ubicación"}
        ${
          evento.ubicacionMapsUrl
            ? `<br><a class="text-link" href="${evento.ubicacionMapsUrl}" target="_blank" rel="noopener noreferrer">Abrir en Google Maps</a>`
            : ""
        }
      </p>

      <button class="secondary-btn" data-action="open-return" data-id="${evento.id}">
        ${userIsBasic ? "Ver retorno" : "Revisar retorno"}
      </button>
    `;

    returnList.appendChild(card);
  });

  document.querySelectorAll("[data-action='open-return']").forEach((button) => {
    button.addEventListener("click", () => {
      const eventoId = button.dataset.id;
      openEventoRetorno(eventoId);
    });
  });
}

function openEventoRetorno(eventoId) {
  selectedEvento = eventosRetornoCache.find((evento) => evento.id === eventoId);

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

  const todosRevisados =
    materiales.length > 0 &&
    materiales.every((item) => item.estadoRetornoItem);

  const hayProblemas = materiales.some((item) => {
    return item.estadoRetornoItem === "Faltante" || item.estadoRetornoItem === "Dañado";
  });

  overlayContent.innerHTML = `
    <div class="overlay-head">
      <div>
        <p class="eyebrow">Retornando</p>
        <h2>${selectedEvento.detalleServicio || "Evento sin detalle"}</h2>
        <p class="card-note">
          ID Firebase: ${selectedEvento.id}
        </p>
      </div>

      <span class="pill pill-red">
        ${hayProblemas ? "Con observaciones" : "Pendiente de revisión"}
      </span>
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
        ${
          selectedEvento.ubicacionMapsUrl
            ? `<br><a class="text-link" href="${selectedEvento.ubicacionMapsUrl}" target="_blank" rel="noopener noreferrer">Abrir Maps</a>`
            : ""
        }
      </div>

      <div>
        <small>Encargado</small>
        <strong>${selectedEvento.encargado || "—"}</strong>
      </div>
    </section>

    <section class="checklist-box">
      <div class="section-head">
        <div>
          <p class="eyebrow">Checklist</p>
          <h3>Validación de retorno</h3>
        </div>
      </div>

      <div id="return-materials-list">
        ${renderMaterialesRetorno(materiales)}
      </div>

      ${
        userIsBasic
          ? `
            <p class="card-note">
              Modo visualización: solo un supervisor puede validar y cerrar retorno.
            </p>
          `
          : `
            <button 
              id="confirm-return-btn" 
              class="primary-btn ${todosRevisados ? "" : "disabled-btn"}"
              ${todosRevisados ? "" : "disabled"}
            >
              Confirmar retorno y cerrar evento
            </button>

            <p class="card-note">
              Para cerrar el evento, todos los materiales deben tener estado de retorno.
            </p>
          `
      }
    </section>
  `;

  if (!userIsBasic) {
    document.querySelectorAll("[data-action='return-status']").forEach((select) => {
      select.addEventListener("change", async () => {
        const index = Number(select.dataset.index);
        await updateMaterialReturnStatus(index, select.value);
      });
    });

    document.querySelectorAll("[data-action='return-note']").forEach((input) => {
      input.addEventListener("change", async () => {
        const index = Number(input.dataset.index);
        await updateMaterialReturnNote(index, input.value.trim());
      });
    });

    const confirmReturnBtn = document.getElementById("confirm-return-btn");

    if (confirmReturnBtn) {
      confirmReturnBtn.addEventListener("click", async () => {
        await confirmReturnAndCloseEvent();
      });
    }
  }
}

function renderMaterialesRetorno(materiales) {
  if (!materiales || materiales.length === 0) {
    return `
      <p class="empty-text">
        Este evento no tiene materiales cargados desde producción.
      </p>
    `;
  }

  return materiales
    .map((material, index) => {
      const estado = material.estadoRetornoItem || "";

      return `
        <article class="return-item">
          <div>
            <strong>${material.nombre}</strong>
            <small>
              Cantidad: ${material.cantidad} | Categoría: ${material.categoria || "—"}
            </small>
          </div>

          ${
            userIsBasic
              ? `
                <div class="return-controls">
                  <span class="pill">
                    ${estado || "Pendiente"}
                  </span>
                </div>
              `
              : `
                <div class="return-controls">
                  <select data-action="return-status" data-index="${index}">
                    <option value="" ${estado === "" ? "selected" : ""}>Pendiente</option>
                    <option value="Retornado" ${estado === "Retornado" ? "selected" : ""}>Retornado</option>
                    <option value="Faltante" ${estado === "Faltante" ? "selected" : ""}>Faltante</option>
                    <option value="Dañado" ${estado === "Dañado" ? "selected" : ""}>Dañado</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Nota opcional"
                    value="${material.notaRetorno || ""}"
                    data-action="return-note"
                    data-index="${index}"
                  />
                </div>
              `
          }
        </article>
      `;
    })
    .join("");
}

async function updateMaterialReturnStatus(index, estado) {
  const materiales = selectedEvento.materialesProduccion || [];

  if (!materiales[index]) return;

  materiales[index].estadoRetornoItem = estado;
  materiales[index].checkedRetorno = estado === "Retornado";

  await updateEventoMaterialesRetorno(materiales);
}

async function updateMaterialReturnNote(index, nota) {
  const materiales = selectedEvento.materialesProduccion || [];

  if (!materiales[index]) return;

  materiales[index].notaRetorno = nota;

  await updateEventoMaterialesRetorno(materiales, false);
}

async function updateEventoMaterialesRetorno(materiales, rerender = true) {
  const eventoDocRef = doc(db, "eventos", selectedEvento.id);

  try {
    await updateDoc(eventoDocRef, {
      materialesProduccion: materiales,
      estadoRetorno: "En revisión",
      actualizadoEn: serverTimestamp()
    });

    selectedEvento.materialesProduccion = materiales;
    selectedEvento.estadoRetorno = "En revisión";

    await loadEventosRetorno();

    const refreshedEvent = eventosRetornoCache.find((evento) => evento.id === selectedEvento.id);
    selectedEvento = refreshedEvent || selectedEvento;

    if (rerender) {
      renderOverlay();
    }

  } catch (error) {
    console.error("Error actualizando retorno:", error);
    alert("No se pudo actualizar el retorno.");
  }
}

async function confirmReturnAndCloseEvent() {
  const materiales = selectedEvento.materialesProduccion || [];

  if (materiales.length === 0) {
    alert("Este evento no tiene materiales cargados.");
    return;
  }

  const todosRevisados = materiales.every((item) => item.estadoRetornoItem);

  if (!todosRevisados) {
    alert("Primero revisa todos los materiales.");
    return;
  }

  const hayProblemas = materiales.some((item) => {
    return item.estadoRetornoItem === "Faltante" || item.estadoRetornoItem === "Dañado";
  });

  const mensaje = hayProblemas
    ? "Hay materiales faltantes o dañados. ¿Igual deseas cerrar el evento?"
    : "¿Confirmar retorno completo y cerrar evento?";

  const confirmar = confirm(mensaje);

  if (!confirmar) return;

  const eventoDocRef = doc(db, "eventos", selectedEvento.id);

  try {
    await updateDoc(eventoDocRef, {
      estadoRetorno: hayProblemas ? "Retorno con observaciones" : "Retorno completado",
      estadoEvento: "Terminado",
      terminadoEn: serverTimestamp(),
      actualizadoEn: serverTimestamp()
    });

    alert("Evento cerrado correctamente.");

    closeOverlay();
    await loadEventosRetorno();

  } catch (error) {
    console.error("Error cerrando evento:", error);
    alert("No se pudo cerrar el evento.");
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
