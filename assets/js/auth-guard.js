// assets/js/auth-guard.js

import { auth } from "./firebase-config.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const currentPage = window.location.pathname.split("/").pop() || "index.html";

onAuthStateChanged(auth, (user) => {
  if (!user && currentPage !== "login.html") {
    window.location.href = "./login.html";
  }
});
