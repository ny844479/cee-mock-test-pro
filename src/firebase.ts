/// <reference types="vite/client" />
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Environment variables approach for flexibility
const firebaseConfig = {
  apiKey: "AIzaSyBLjI9IeN8GCbpAWgVGty96hmNatN4n07c",
  authDomain: "ceemocktestpro.firebaseapp.com",
  projectId: "ceemocktestpro",
  storageBucket: "ceemocktestpro.firebasestorage.app",
  messagingSenderId: "996734152868",
  appId: "1:996734152868:web:c51f48dc8ca5aa2a677631"
};

const app = initializeApp(firebaseConfig);
console.log("Firebase initialized with project:", firebaseConfig.projectId);
export const db = getFirestore(app);
export const auth = getAuth(app);
