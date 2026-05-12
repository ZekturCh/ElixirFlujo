// assets/js/roles.js

export const BASIC_USERS = [
  "wil@lms.com",
  "sebas@lms.com"
];

export function getUserRole(user) {
  if (!user || !user.email) return "guest";

  const email = user.email.toLowerCase();

  if (BASIC_USERS.includes(email)) {
    return "basic";
  }

  return "admin";
}

export function isBasic(user) {
  return getUserRole(user) === "basic";
}

export function isAdmin(user) {
  return getUserRole(user) === "admin";
}

export function canAccessPage(user, pageName) {
  const role = getUserRole(user);

  if (role === "admin") return true;

  if (role === "basic") {
    const allowedPages = [
      "produccion.html",
      "retornando.html",
      "inventario.html",
      "index.html"
    ];

    return allowedPages.includes(pageName);
  }

  return false;
}
