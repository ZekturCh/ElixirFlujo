// assets/js/resumen.js

import { db } from "./firebase-config.js";

import {
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const summaryStatus = document.getElementById("summary-status");
const summaryGrid = document.getElementById("summary-grid");
const nextEventsList = document.getElementById("next-events-list");
const stockAlertsList = document.getElementById("stock-alerts-list");

const eventosRef = collection(db, "eventos");
const inventarioRef = collection(db, "inventario");

let eventosCache = [];
let inventarioCache = [];

async function init() {
  await loadData();
  renderSummary();
  renderNextEvents();
  renderStockAlerts();
}

async function loadData() {
  try {
    const eventosQuery = query(eventosRef, orderBy("fechaEvento", "asc"));
    const inventarioQuery = query(inventarioRef, orderBy("nombre", "asc"));

    const [eventosSnapshot, inventarioSnapshot] = await Promise.all([
      getDocs(eventosQuery),
      getDocs(inventarioQuery)
    ]);

    eventosCache = [];
    inventarioCache = [];

    eventosSnapshot.forEach((docSnap) => {
      eventosCache.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });

    inventarioSnapshot.forEach((docSnap) => {
      inventarioCache.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });

    summaryStatus.textContent = "Resumen actualizado";

  } catch (error) {
    console.error("Error cargando resumen:", error);
    summaryStatus.textContent = "Error cargando resumen";

    summaryGrid.innerHTML = `
      <p class="empty-text error-text">
        No se pudo cargar el resumen.
      </p>
    `;
  }
}

function renderSummary() {
  const totalEventos = eventosCache.length;

  const porCotizar = eventosCache.filter((e) => e.estadoEvento === "Por Cotizar").length;
  const cotizados = eventosCache.filter((e) => e.estadoEvento === "Cotizado").length;
  const conAnticipo = eventosCache.filter((e) => e.estadoEvento === "Ya dio anticipo").length;
  const terminados = eventosCache.filter((e) => e.estadoEvento === "Terminado").length;
  const noVa = eventosCache.filter((e) => e.estadoEvento === "No va").length;

  const produccionLista = eventosCache.filter((e) => e.estadoProduccion === "Producción lista").length;
  const retornoObservado = eventosCache.filter((e) => e.estadoRetorno === "Retorno con observaciones").length;

  const totalVendido = eventosCache.reduce((sum, e) => sum + Number(e.costoTotal || 0), 0);
  const totalCobrado = eventosCache.reduce((sum, e) => sum + getTotalCobrado(e), 0);
  const totalPorCobrar = totalVendido - totalCobrado;

  const itemsInventario = inventarioCache.length;
  const itemsBajoStock = inventarioCache.filter((i) => Number(i.cantidadDisponible || 0) <= 2).length;

  const cards = [
    {
      label: "Eventos",
      value: totalEventos,
      detail: "Total registrados"
    },
    {
      label: "Por cotizar",
      value: porCotizar,
      detail: "Pendientes comerciales"
    },
    {
      label: "Cotizados",
      value: cotizados,
      detail: "Listos para producción"
    },
    {
      label: "Con anticipo",
      value: conAnticipo,
      detail: "Confirmados"
    },
    {
      label: "Producción lista",
      value: produccionLista,
      detail: "Notificados"
    },
    {
      label: "Terminados",
      value: terminados,
      detail: "Eventos cerrados"
    },
    {
      label: "No va",
      value: noVa,
      detail: "Descartados"
    },
    {
      label: "Retorno observado",
      value: retornoObservado,
      detail: "Faltante o dañado"
    },
    {
      label: "Inventario",
      value: itemsInventario,
      detail: "Items registrados"
    },
    {
      label: "Stock bajo",
      value: itemsBajoStock,
      detail: "Disponible menor o igual a 2"
    },
    {
      label: "Vendido",
      value: money(totalVendido),
      detail: "Costo total eventos"
    },
    {
      label: "Por cobrar",
      value: money(totalPorCobrar),
      detail: "Saldo pendiente"
    }
  ];

  summaryGrid.innerHTML = cards
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

function renderNextEvents() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextEvents = eventosCache
    .filter((evento) => {
      if (!evento.fechaEvento) return false;
      if (evento.estadoEvento === "No va") return false;
      if (evento.estadoEvento === "Terminado") return false;

      const eventDate = new Date(`${evento.fechaEvento}T00:00:00`);
      return eventDate >= today;
    })
    .slice(0, 6);

  if (nextEvents.length === 0) {
    nextEventsList.innerHTML = `
      <p class="empty-text">No hay próximos eventos activos.</p>
    `;
    return;
  }

  nextEventsList.innerHTML = nextEvents
    .map((evento) => {
      return `
        <article class="data-card">
          <div class="data-card-top">
            <span class="pill pill-red">${evento.estadoEvento || "Sin estado"}</span>
            <span class="pill">${evento.tipoServicio || "Sin servicio"}</span>
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
              <small>Hora</small>
              <strong>${evento.horaShow || "—"}</strong>
            </div>

            <div>
              <small>Costo</small>
              <strong>${money(evento.costoTotal || 0)}</strong>
            </div>

            <div>
              <small>Encargado</small>
              <strong>${evento.encargado || "—"}</strong>
            </div>
          </div>

          <p class="card-note">
            Ubicación: ${evento.ubicacion || "Sin ubicación"}
          </p>
        </article>
      `;
    })
    .join("");
}

function renderStockAlerts() {
  const lowStock = inventarioCache
    .filter((item) => Number(item.cantidadDisponible || 0) <= 2)
    .slice(0, 6);

  if (lowStock.length === 0) {
    stockAlertsList.innerHTML = `
      <p class="empty-text">No hay alertas de stock bajo.</p>
    `;
    return;
  }

  stockAlertsList.innerHTML = lowStock
    .map((item) => {
      return `
        <article class="data-card">
          <div class="data-card-top">
            <span class="pill pill-red">Stock bajo</span>
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
          </div>
        </article>
      `;
    })
    .join("");
}

function getTotalCobrado(evento) {
  const pagos = evento.pagos || [];

  return pagos.reduce((sum, pago) => {
    return sum + Number(pago.monto || 0);
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

init();
