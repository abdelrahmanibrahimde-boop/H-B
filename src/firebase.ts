import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCdBNsO3bUgN02HKNbBospRfgbCwIl5xPc",
  authDomain: "mydc-102e6.firebaseapp.com",
  projectId: "mydc-102e6",
  storageBucket: "mydc-102e6.appspot.com", // ✅ FIXED
  messagingSenderId: "124831674686",
  appId: "1:124831674686:web:287e83c59c7c0e4453fc6f"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);