import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBhXzDsZleZc66GVauwlYiCaUeiHMwIAQs",
  authDomain: "circlekin-02.firebaseapp.com",
  projectId: "circlekin-02",
  storageBucket: "circlekin-02.firebasestorage.app",
  messagingSenderId: "407374839491",
  appId: "1:407374839491:web:464117132b34e6e6d6ac76"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
