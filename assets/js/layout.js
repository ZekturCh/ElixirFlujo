// assets/js/layout.js

import { auth } from "./firebase-config.js";
import { getUserRole } from "./roles.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const headerContainer = document.getElementById("app-header");
const currentPage = window.location.pathname.split("/").pop() || "index.html";

const allNavItems = [
  { label: "Por Atender", href: "por-atender.html", roles: ["admin"] },
  { label: "En Producción", href: "produccion.html", roles: ["admin", "basic"] },
  { label: "Retornando", href: "retornando.html", roles: ["admin", "basic"] },
  { label: "Resumen", href: "resumen.html", roles: ["admin"] },
  { label: "Inventario", href: "inventario.html", roles: ["admin", "basic"] },
  { label: "Contactos", href: "contactos.html", roles: ["admin"] },
  { label: "Finanza", href: "finanzas.html", roles: ["admin"] },
];

onAuthStateChanged(auth, (user) => {
  if (!headerContainer) return;

  const role = getUserRole(user);
  const navItems = allNavItems.filter((item) => item.roles.includes(role));

  headerContainer.innerHTML = `
    <header class="main-header">
      <a class="brand" href="./index.html">
        <span class="brand-mark">L</span>
        <span>
          <strong>Lightman</strong>
          <small>Admin Panel</small>
        </span>
      </a>

      <nav class="main-nav">
        ${navItems
          .map((item) => {
            const isActive = currentPage === item.href;
            return `
              <a 
                href="./${item.href}" 
                class="${isActive ? "active" : ""}"
              >
                ${item.label}
              </a>
            `;
          })
          .join("")}
      </nav>

      <div class="user-chip">
        <span class="user-dot"></span>
        <span id="user-role-label">
          ${user ? user.email : "Sin sesión"} · ${role === "basic" ? "marronazo neto" : "admin"}
        </span>
        <button id="logout-btn" class="logout-btn">Salir</button>
      </div>
    </header>
  `;

  const logoutBtn = document.getElementById("logout-btn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await signOut(auth);
        window.location.href = "./login.html";
      } catch (error) {
        console.error("Error cerrando sesión:", error);
        alert("No se pudo cerrar sesión.");
      }
    });
  }
});
