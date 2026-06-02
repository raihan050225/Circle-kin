import {
  addDoc,
  collection,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  deleteDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { uploadToCloudinary } from "./cloudinary";

export const createPost = async (circleId, userId, text, file) => {
  const postRef = await addDoc(collection(db, "posts"), {
    circleId: String(circleId),
    userId,
    text: text || "",
    mediaUrl: "",
    mediaType: "",
    likes: [],
    createdAt: Date.now(),
  });

  if (file) {
    const media = await uploadToCloudinary(file);

    await updateDoc(doc(db, "posts", postRef.id), {
      mediaUrl: media.url,
      mediaType: media.type === "video" ? "video" : "image",
    });
  }
};

export const getCirclePosts = async (circleId) => {
  const snap = await getDocs(collection(db, "posts"));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((p) => p.circleId === String(circleId))
    .sort((a, b) => b.createdAt - a.createdAt);
};
/* TOGGLE LIKE */
export const toggleLike = async (postId, userId, liked) => {
  const ref = doc(db, "posts", postId);

  await updateDoc(ref, {
    likes: liked
      ? arrayRemove(userId)
      : arrayUnion(userId),
  });
};

/* DELETE POST */
export const deletePost = async (postId) => {
  await deleteDoc(doc(db, "posts", postId));
};