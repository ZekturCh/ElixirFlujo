const headerContainer = document.getElementById("app-header");

const currentPage = window.location.pathname.split("/").pop() || "index.html";

const navItems = [
  { label: "Por Atender", href: "por-atender.html" },
  { label: "En Producción", href: "produccion.html" },
  { label: "Retornando", href: "retornando.html" },
  { label: "Resumen", href: "resumen.html" },
  { label: "Inventario", href: "inventario.html" },
  { label: "Finanza", href: "finanzas.html" },
];

if (headerContainer) {
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
        <span id="user-role-label">Admin</span>
      </div>
    </header>
  `;
}
