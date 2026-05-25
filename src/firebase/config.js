import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  getAuth,
  browserLocalPersistence,
  setPersistence
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAwpolSsXSkQ3gVKbwqcb2_ouMFBquapqM",
  authDomain: "hurricane-hearts.firebaseapp.com",
  projectId: "hurricane-hearts",
  storageBucket: "hurricane-hearts.firebasestorage.app",
  messagingSenderId: "1044048139453",
  appId: "1:1044048139453:web:e605713cee6b8e7c0993d4"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence).catch(console.error);