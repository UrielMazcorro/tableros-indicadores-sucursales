import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, getDocs, onSnapshot, writeBatch, deleteDoc } from 'firebase/firestore';

// Configuración de Firebase usando variables de entorno nativas de Vite con fallbacks de seguridad
const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "coral-shoreline-482216-t9",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:951887548540:web:4438ad1afdacc3d005b9f9",
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDpPS-QBT6KS55nG1MOu5295hYfjaulCLE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "coral-shoreline-482216-t9.firebaseapp.com",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "coral-shoreline-482216-t9.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "951887548540",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
// Use the specific databaseId for this applet
const db = getFirestore(app, "ai-studio-94b00839-1c6b-46a7-b8a3-317625e881bc");
const provider = new GoogleAuthProvider();

export { auth, db, provider, signInWithPopup, signOut, doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, getDocs, onSnapshot, writeBatch, deleteDoc };
