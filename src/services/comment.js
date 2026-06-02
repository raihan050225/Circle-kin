import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { uploadToCloudinary } from "./cloudinary";

export const createComment = async (postId, userId, text, file) => {
  const ref = await addDoc(collection(db, "comments"), {
    postId,
    userId,
    text: text || "",
    imageUrl: "",
    createdAt: Date.now(),
  });

  if (file) {
    const media = await uploadToCloudinary(file);

    await updateDoc(doc(db, "comments", ref.id), {
      imageUrl: media.url,
    });
  }
};

export const getPostComments = async (postId) => {
  const snap = await getDocs(collection(db, "comments"));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((c) => c.postId === postId)
    .sort((a, b) => a.createdAt - b.createdAt);
};
/* ADD COMMENT */
export const addComment = async (postId, user, text) => {
  await addDoc(collection(db, "comments"), {
    postId,
    userId: user.uid,
    userName: user.displayName || "User",
    text,
    createdAt: Date.now(),
  });
};

/* GET COMMENTS */
export const getComments = async (postId) => {
  const q = query(
    collection(db, "comments"),
    where("postId", "==", postId)
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
};

/* DELETE COMMENT */
export const deleteComment = async (commentId) => {
  await deleteDoc(doc(db, "comments", commentId));
};