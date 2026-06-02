import { doc, setDoc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Ensure user doc exists
 */
export const ensureUserExists = async (user) => {
  if (!user) return;
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      email: user.email,
      circles: [],
      createdAt: Date.now(),
    });
  }
};

/**
 * THIS IS THE MISSING FUNCTION
 * Ensure 'export' is written exactly like this:
 */
export const updateUserProfile = async (userId, data) => {
  const ref = doc(db, "users", userId);
  await updateDoc(ref, data);
};

/**
 * Add circle to user
 */
export const addCircleToUser = async (userId, circleId) => {
  const ref = doc(db, "users", userId);
  await updateDoc(ref, {
    circles: arrayUnion(circleId),
  });
};