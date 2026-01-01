import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDk33nyJStLroL0mslnqBScfJp4r90K0M0",
  authDomain: "vaccine-tracker-pupicci.firebaseapp.com",
  projectId: "vaccine-tracker-pupicci",
  storageBucket: "vaccine-tracker-pupicci.firebasestorage.app",
  messagingSenderId: "167738804252",
  appId: "1:167738804252:web:b857fa33bc390c8a4f77d9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);