import { auth } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

// SIGN UP
export const signupUser = async (email, password) => {
  return await createUserWithEmailAndPassword(auth, email, password);
};

// LOGIN
export const loginUser = async (email, password) => {
  return await signInWithEmailAndPassword(auth, email, password);
};
