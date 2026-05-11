// assets/js/finanzas.js

import { db } from "./firebase-config.js";

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const financeStatus = document.getElementById("finance-status");
const financeSummary = document.getElementById("finance-summary");
const financeList = document.getElementById("finance-list");

const overlay = document.getElementById("finance-overlay");
const overlayContent = document.getElementById("finance-overlay-content");
const closeOverlayBtn = document.getElementById("close-finance-overlay");

const eventosRef = collection(db, "eventos");

let eventosFinanceCache = [];
let selectedEvento = null;

closeOverlayBtn.addEventListener("click", closeOverlay);

overlay.addEventListener("click", (event) => {
  if (event.target === overlay) {
    closeOverlay();
  }
});

async function init() {
  await loadEventosFinanzas();
  renderFinanceSummary();
  renderFinanceList();
}

async function loadEventosFinanzas() {
  financeList.innerHTML = `<p class="empty-text">Cargando eventos...</p>`;

  try {
    const q = query(eventosRef, orderBy("fechaEvento", "desc"));
    const snapshot = await getDocs(q);

    eventosFinanceCache = [];

    snapshot.forEach((docSnap) => {
      const evento = {
        id: docSnap.id,
        ...docSnap.data()
      };

      const tieneCosto = Number(evento.costoTotal || 0) > 0;
      const tienePagos = Array.isArray(evento.pagos) && evento.pagos.length > 0;
      const tieneGastos = Array.isArray(evento.gastos) && evento.gastos.length > 0;

      if (tieneCosto || tienePagos || tieneGastos) {
        eventosFinanceCache.push(evento);
      }
    });

    financeStatus.textContent = `${eventosFinanceCache.length} eventos con finanzas`;

  } catch (error) {
    console.error("Error cargando finanzas:", error);
    financeStatus.textContent = "Error cargando finanzas";

    financeList.innerHTML = `
      <p class="empty-text error-text">
        No se pudieron cargar las finanzas.
      </p>
    `;
  }
}

function renderFinanceSummary() {
  const totalVendido = eventosFinanceCache.reduce((sum, e) => sum + Number(e.costoTotal || 0), 0);
  const totalCobrado = eventosFinanceCache.reduce((sum, e) => sum + getTotalPagos(e), 0);
  const totalGastos = eventosFinanceCache.reduce((sum, e) => sum + getTotalGastos(e), 0);
  const totalPorCobrar = totalVendido - totalCobrado;
  const utilidad = totalCobrado - totalGastos;

  const eventosTerminados = eventosFinanceCache.filter((e) => e.estadoEvento === "Terminado").length;
  const eventosPendientesCobro = eventosFinanceCache.filter((e) => {
    const costo = Number(e.costoTotal || 0);
    const cobrado = getTotalPagos(e);
    return costo - cobrado > 0;
  }).length;

  const cards = [
    {
      label: "Vendido",
      value: money(totalVendido),
      detail: "Costo total pactado"
    },
    {
      label: "Cobrado",
      value: money(totalCobrado),
      detail: "Pagos registrados"
    },
    {
      label: "Por cobrar",
      value: money(totalPorCobrar),
      detail: "Saldo pendiente"
    },
    {
      label: "Gastos",
      value: money(totalGastos),
      detail: "Gastos registrados"
    },
    {
      label: "Utilidad real",
      value: money(utilidad),
      detail: "Cobrado menos gastos"
    },
    {
      label: "Pendientes de cobro",
      value: eventosPendientesCobro,
      detail: "Eventos con saldo"
    },
    {
      label: "Terminados",
      value: eventosTerminados,
      detail: "Eventos cerrados"
    }
  ];

  financeSummary.innerHTML = cards
    .map((card) => {
      return `
        <article class="summary-card">
          <small>${card.label}</small>
          <strong>${card.value}</strong>
          <span>${card.detail}</span>
        </article>
      `;
    })
    .join("");
}

function renderFinanceList() {
  if (eventosFinanceCache.length === 0) {
    financeList.innerHTML = `
      <p class="empty-text">
        Todavía no hay eventos con costo, pagos o gastos.
      </p>
    `;
    return;
  }

  financeList.innerHTML = "";

  eventosFinanceCache.forEach((evento) => {
    const costo = Number(evento.costoTotal || 0);
    const cobrado = getTotalPagos(evento);
    const gastos = getTotalGastos(evento);
    const porCobrar = costo - cobrado;
    const utilidad = cobrado - gastos;

    const card = document.createElement("article");
    card.className = "data-card clickable-card";

    card.innerHTML = `
      <div class="data-card-top">
        <span class="pill pill-red">${getPaymentStatus(evento)}</span>
        <span class="pill">${evento.estadoEvento || "Sin estado"}</span>
      </div>

      <h3>${evento.detalleServicio || "Evento sin detalle"}</h3>

      <p class="card-note">
        Cliente: ${evento.contactoNombre || "—"}
      </p>

      <div class="data-grid">
        <div>
          <small>Fecha</small>
          <strong>${formatDate(evento.fechaEvento)}</strong>
        </div>

        <div>
          <small>Costo</small>
          <strong>${money(costo)}</strong>
        </div>

        <div>
          <small>Cobrado</small>
          <strong>${money(cobrado)}</strong>
        </div>

        <div>
          <small>Por cobrar</small>
          <strong>${money(porCobrar)}</strong>
        </div>

        <div>
          <small>Gastos</small>
          <strong>${money(gastos)}</strong>
        </div>

        <div>
          <small>Utilidad</small>
          <strong>${money(utilidad)}</strong>
        </div>
      </div>

      <button class="secondary-btn" data-action="open-finance" data-id="${evento.id}">
        Abrir finanzas
      </button>
    `;

    financeList.appendChild(card);
  });

  document.querySelectorAll("[data-action='open-finance']").forEach((button) => {
    button.addEventListener("click", () => {
      const eventoId = button.dataset.id;
      openFinanceOverlay(eventoId);
    });
  });
}

function openFinanceOverlay(eventoId) {
  selectedEvento = eventosFinanceCache.find((evento) => evento.id === eventoId);

  if (!selectedEvento) {
    alert("No se encontró el evento.");
    return;
  }

  overlay.classList.remove("hidden");
  renderOverlay();
}

function renderOverlay() {
  if (!selectedEvento) return;

  const costo = Number(selectedEvento.costoTotal || 0);
  const cobrado = getTotalPagos(selectedEvento);
  const gastos = getTotalGastos(selectedEvento);
  const porCobrar = costo - cobrado;
  const utilidad = cobrado - gastos;

  overlayContent.innerHTML = `
    <div class="overlay-head">
      <div>
        <p class="eyebrow">Finanzas</p>
        <h2>${selectedEvento.detalleServicio || "Evento sin detalle"}</h2>
        <p class="card-note">
          ID Firebase: ${selectedEvento.id}
        </p>
      </div>

      <span class="pill pill-red">${getPaymentStatus(selectedEvento)}</span>
    </div>

    <section class="detail-summary">
      <div>
        <small>Cliente</small>
        <strong>${selectedEvento.contactoNombre || "—"}</strong>
      </div>

      <div>
        <small>Fecha</small>
        <strong>${formatDate(selectedEvento.fechaEvento)}</strong>
      </div>

      <div>
        <small>Estado evento</small>
        <strong>${selectedEvento.estadoEvento || "—"}</strong>
      </div>

      <div>
        <small>Costo total</small>
        <strong>${money(costo)}</strong>
      </div>

      <div>
        <small>Cobrado</small>
        <strong>${money(cobrado)}</strong>
      </div>

      <div>
        <small>Por cobrar</small>
        <strong>${money(porCobrar)}</strong>
      </div>

      <div>
        <small>Gastos</small>
        <strong>${money(gastos)}</strong>
      </div>

      <div>
        <small>Utilidad real</small>
        <strong>${money(utilidad)}</strong>
      </div>
    </section>

    <section class="finance-form-grid">
      <form id="payment-form" class="mini-form">
        <h3>Registrar cobro</h3>

        <label>
          Fecha de cobro
          <input type="date" id="payment-date" required />
        </label>

        <label>
          Monto cobrado
          <input type="number" id="payment-amount" min="0" step="0.01" required />
        </label>

        <label>
          Medio / nota
          <input type="text" id="payment-note" placeholder="Ej: Yape, transferencia, efectivo" />
        </label>

        <button type="submit" class="primary-btn">Guardar cobro</button>
      </form>

      <form id="expense-form" class="mini-form">
        <h3>Registrar gasto</h3>

        <label>
          Fecha de gasto
          <input type="date" id="expense-date" required />
        </label>

        <label>
          Monto gasto
          <input type="number" id="expense-amount" min="0" step="0.01" required />
        </label>

        <label>
          Detalle
          <input type="text" id="expense-detail" placeholder="Ej: transporte, comida, reparación" />
        </label>

        <button type="submit" class="primary-btn">Guardar gasto</button>
      </form>
    </section>

    <section class="finance-history-grid">
      <div class="history-box">
        <h3>Pagos registrados</h3>
        ${renderPayments(selectedEvento.pagos || [])}
      </div>

      <div class="history-box">
        <h3>Gastos registrados</h3>
        ${renderExpenses(selectedEvento.gastos || [])}
      </div>
    </section>
  `;

  document.getElementById("payment-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    await addPayment();
  });

  document.getElementById("expense-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    await addExpense();
  });
}

async function addPayment() {
  const fecha = document.getElementById("payment-date").value;
  const monto = Number(document.getElementById("payment-amount").value);
  const nota = document.getElementById("payment-note").value.trim();

  if (!fecha || !monto || monto <= 0) {
    alert("Completa fecha y monto válido.");
    return;
  }

  const pagos = selectedEvento.pagos || [];

  pagos.push({
    fecha,
    monto,
    nota,
    creadoEnTexto: new Date().toISOString()
  });

  await updateFinanceData({ pagos });
}

async function addExpense() {
  const fecha = document.getElementById("expense-date").value;
  const monto = Number(document.getElementById("expense-amount").value);
  const detalle = document.getElementById("expense-detail").value.trim();

  if (!fecha || !monto || monto <= 0) {
    alert("Completa fecha y monto válido.");
    return;
  }

  const gastos = selectedEvento.gastos || [];

  gastos.push({
    fecha,
    monto,
    detalle,
    creadoEnTexto: new Date().toISOString()
  });

  await updateFinanceData({ gastos });
}

async function updateFinanceData(data) {
  const eventoDocRef = doc(db, "eventos", selectedEvento.id);

  const nextEvento = {
    ...selectedEvento,
    ...data
  };

  const costo = Number(nextEvento.costoTotal || 0);
  const cobrado = getTotalPagos(nextEvento);
  const gastos = getTotalGastos(nextEvento);
  const porCobrar = costo - cobrado;
  const utilidad = cobrado - gastos;

  let estadoFinanza = "Sin monto";

  if (costo > 0 && cobrado <= 0) {
    estadoFinanza = "Por cobrar";
  }

  if (costo > 0 && cobrado > 0 && porCobrar > 0) {
    estadoFinanza = "Pago parcial";
  }

  if (costo > 0 && porCobrar <= 0) {
    estadoFinanza = "Pagado";
  }

  try {
    await updateDoc(eventoDocRef, {
      ...data,
      estadoFinanza,
      totalCobrado: cobrado,
      totalGastos: gastos,
      totalPorCobrar: porCobrar,
      utilidad,
      actualizadoEn: serverTimestamp()
    });

    selectedEvento = {
      ...selectedEvento,
      ...data,
      estadoFinanza,
      totalCobrado: cobrado,
      totalGastos: gastos,
      totalPorCobrar: porCobrar,
      utilidad
    };

    await loadEventosFinanzas();
    renderFinanceSummary();
    renderFinanceList();

    const refreshedEvent = eventosFinanceCache.find((evento) => evento.id === selectedEvento.id);
    selectedEvento = refreshedEvent || selectedEvento;

    renderOverlay();

  } catch (error) {
    console.error("Error actualizando finanzas:", error);
    alert("No se pudo actualizar finanzas.");
  }
}

function renderPayments(pagos) {
  if (!pagos.length) {
    return `<p class="empty-text">Sin pagos registrados.</p>`;
  }

  return pagos
    .map((pago) => {
      return `
        <article class="history-item">
          <strong>${money(pago.monto)}</strong>
          <span>${formatDate(pago.fecha)}</span>
          <small>${pago.nota || "Sin nota"}</small>
        </article>
      `;
    })
    .join("");
}

function renderExpenses(gastos) {
  if (!gastos.length) {
    return `<p class="empty-text">Sin gastos registrados.</p>`;
  }

  return gastos
    .map((gasto) => {
      return `
        <article class="history-item">
          <strong>${money(gasto.monto)}</strong>
          <span>${formatDate(gasto.fecha)}</span>
          <small>${gasto.detalle || "Sin detalle"}</small>
        </article>
      `;
    })
    .join("");
}

function getPaymentStatus(evento) {
  const costo = Number(evento.costoTotal || 0);
  const cobrado = getTotalPagos(evento);
  const porCobrar = costo - cobrado;

  if (costo <= 0) return "Sin monto";
  if (cobrado <= 0) return "Por cobrar";
  if (porCobrar > 0) return "Pago parcial";
  return "Pagado";
}

function getTotalPagos(evento) {
  const pagos = evento.pagos || [];

  return pagos.reduce((sum, pago) => {
    return sum + Number(pago.monto || 0);
  }, 0);
}

function getTotalGastos(evento) {
  const gastos = evento.gastos || [];

  return gastos.reduce((sum, gasto) => {
    return sum + Number(gasto.monto || 0);
  }, 0);
}

function money(value) {
  return `S/ ${Number(value || 0).toFixed(2)}`;
}

function formatDate(dateString) {
  if (!dateString) return "—";

  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

function closeOverlay() {
  overlay.classList.add("hidden");
  selectedEvento = null;
}

init();
