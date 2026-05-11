import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getFirestore,
  collection,
  getDocs,
  limit,
  query
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  getAuth
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
      apiKey: "AIzaSyAkWPKlXPf-1PoCOPr-WxEeei04JmOYo1w",
      authDomain: "elixir-a7fe8.firebaseapp.com",
      projectId: "elixir-a7fe8",
      storageBucket: "elixir-a7fe8.appspot.com",
      messagingSenderId: "638327915376",
      appId: "1:638327915376:web:094d13b75d5c94ac76c5b5",
      measurementId: "G-Q368B5R9J5",
    };

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

/**
 * Prueba simple para saber si Firestore responde.
 * No importa si la colección está vacía.
 */
export async function testFirebaseConnection() {
  const testRef = collection(db, "inventario");
  const testQuery = query(testRef, limit(1));
  await getDocs(testQuery);
  return true;
}
