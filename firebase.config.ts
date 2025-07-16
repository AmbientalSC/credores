
import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

// Your web app's Firebase configuration provided by the user.
// In a production app, these should be managed via environment variables.
const firebaseConfig = {
  apiKey: "AIzaSyAOwUu8Tuho3CquNcTaMfaHDVWtsSjKTo4",
  authDomain: "credores-1ea6f.firebaseapp.com",
  projectId: "credores-1ea6f",
  storageBucket: "credores-1ea6f.firebasestorage.app",
  messagingSenderId: "996837564068",
  appId: "1:996837564068:web:965180de6c3aedb1959031"
};

// Initialize Firebase
const app: FirebaseApp = initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

export { app, auth, db, storage };
