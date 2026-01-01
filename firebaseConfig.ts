import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyDk33nyJStLroL0mslnqBScfJp4r90K0M0",
  authDomain: "vaccine-tracker-pupicci.firebaseapp.com",
  // Specific URL for europe-west1 region is required
  databaseURL: "https://vaccine-tracker-pupicci-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "vaccine-tracker-pupicci",
  storageBucket: "vaccine-tracker-pupicci.firebasestorage.app",
  messagingSenderId: "167738804252",
  appId: "1:167738804252:web:b857fa33bc390c8a4f77d9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const functions = getFunctions(app, "europe-west1"); // Matching database region