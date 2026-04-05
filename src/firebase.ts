// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics"; <-- Auskommentiert, macht nur Probleme!
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB6WkMShyBgaT4tchkCergnzd65y763oMw",
  authDomain: "ersatz-zu-mc.firebaseapp.com",
  projectId: "ersatz-zu-mc",
  storageBucket: "ersatz-zu-mc.firebasestorage.app",
  messagingSenderId: "1075773230311",
  appId: "1:1075773230311:web:59b2021cdf93dc9683a642",
  measurementId: "G-JYC0GFDJ31"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app); <-- Auch auskommentiert!

// Das hier fehlte und hat den weißen Bildschirm verursacht:
export const auth = getAuth(app);
export const db = getFirestore(app);