import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  projectId: "continual-wharf-14dh4",
  appId: "1:655682692981:web:6d88571bf35a16e0fe153c",
  apiKey: "AIzaSyBdVQTTrvLVOUKN93tPvN4ck4uIAML83M8",
  authDomain: "continual-wharf-14dh4.firebaseapp.com",
  storageBucket: "continual-wharf-14dh4.firebasestorage.app",
  messagingSenderId: "655682692981"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "ai-studio-atmosphericlive-94ccf2aa-0db4-4f29-8a6e-0b295d85df00");
export const auth = getAuth(app);

// CRITICAL CONSTRAINT: Validate Connection to Firestore on startup
async function testConnection() {
  try {
    // Attempting to read a non-existent document using server query to verify connectivity
    await getDocFromServer(doc(db, "test", "connection"));
    console.log("Firestore connection test: SUCCESS");
  } catch (error) {
    if (error instanceof Error && error.message.includes("client is offline")) {
      console.error("Please check your Firebase configuration or network.");
    } else {
      console.log("Firestore connection test completed (expected error/empty if unseeded):", error);
    }
  }
}

testConnection();
