import { initializeApp } from "firebase/app";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import {
  connectAuthEmulator,
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

if (
  import.meta.env.DEV &&
  import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true"
) {
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", {
    disableWarnings: true
  });
}

setPersistence(auth, browserLocalPersistence).catch(console.error);
