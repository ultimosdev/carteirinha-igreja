import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBaiXJ0A3JL2ZPlurY54iVMFxXRM3jmZZY",
  authDomain: "sistemaigreja-b009d.firebaseapp.com",
  projectId: "sistemaigreja-b009d",
  storageBucket: "sistemaigreja-b009d.firebasestorage.app",
  messagingSenderId: "94622794711",
  appId: "1:94622794711:web:2b835d3ee4edf83486c192",
  measurementId: "G-9908SPSQZM"
};

// Inicializa o Firebase e o Banco de Dados
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);