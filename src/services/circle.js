import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { db } from "./firebase";

// CREATE CIRCLE
export const createCircle = async (data) => {
  const ref = await addDoc(collection(db, "circles"), data);
  return ref.id;
};

// JOIN CIRCLE
export const joinCircleByCode = async (code, userId) => {
  const snap = await getDocs(collection(db, "circles"));

  const circle = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .find((c) => c.inviteCode === code);

  if (!circle) throw new Error("Invalid invite code");

  await updateDoc(doc(db, "circles", circle.id), {
    members: arrayUnion(userId),
  });

  return circle;
};




