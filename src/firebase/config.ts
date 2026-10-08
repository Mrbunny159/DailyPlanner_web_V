import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';


// Import the functions you need from the SDKs you need
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCDFih2R0iKJeq0PWEgf5WU0pyvVD7XIS8",
  authDomain: "dailyplanner-35be0.firebaseapp.com",
  projectId: "dailyplanner-35be0",
  storageBucket: "dailyplanner-35be0.firebasestorage.app",
  messagingSenderId: "120242945903",
  appId: "1:120242945903:web:691e347b592636c06ff29a"
};

// Initialize Firebase

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();