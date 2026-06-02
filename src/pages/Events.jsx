import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../components/Layout";

import { db } from "../services/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  addDoc,
  Timestamp,
} from "firebase/firestore";

import { uploadToCloudinary } from "../services/cloudinary";

export default function Events() {
  const { eventId } = useParams();

  const [event, setEvent] = useState(null);
  const [media, setMedia] = useState([]);

  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [showMediaModal, setShowMediaModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  const [viewerIndex, setViewerIndex] = useState(null);

  const [newTitle, setNewTitle] = useState("");
  const [newCover, setNewCover] = useState(null);

  useEffect(() => {
    loadEvent();
    loadMedia();
  }, [eventId]);

  const loadEvent = async () => {
    const snap = await getDoc(doc(db, "events", eventId));

    if (snap.exists()) {
      const data = { id: snap.id, ...snap.data() };
      setEvent(data);
      setNewTitle(data.title);
    }
  };

  const loadMedia = async () => {
    const q = query(
      collection(db, "eventMedia"),
      where("eventId", "==", eventId)
    );

    const snap = await getDocs(q);

    setMedia(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  /* ✅ ADD MEDIA */
  const handleUploadMedia = async () => {
    if (!selectedFile) return alert("Select media");

    setUploading(true);

    const uploaded = await uploadToCloudinary(selectedFile);

    await addDoc(collection(db, "eventMedia"), {
      eventId,
      mediaUrl: uploaded.url,
      mediaType: uploaded.type,
      caption,
      createdAt: Timestamp.now(),
    });

    await updateDoc(doc(db, "events", eventId), {
      mediaCount: (event.mediaCount || 0) + 1,
    });

    setSelectedFile(null);
    setCaption("");
    setShowMediaModal(false);

    await loadMedia();
    await loadEvent();

    setUploading(false);
  };

  /* ✅ EDIT EVENT */
  const handleSaveEdit = async () => {
    let coverUrl = event.coverUrl;

    if (newCover) {
      const uploaded = await uploadToCloudinary(newCover);
      coverUrl = uploaded.url;
    }

    await updateDoc(doc(db, "events", eventId), {
      title: newTitle,
      coverUrl,
    });

    setShowEditModal(false);
    await loadEvent();
  };

  /* ✅ DELETE EVENT */
  const handleDeleteEvent = async () => {
    if (!window.confirm("Delete this event?")) return;

    await deleteDoc(doc(db, "events", eventId));
    window.history.back();
  };

  if (!event) return null;

  const date = new Date(event.date);

  return (
    <Layout>

      {/* ✅ HEADER */}
      <div className="relative h-64 bg-white">

        <img
          src={event.coverUrl}
          className="w-full h-full object-cover"
        />

        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

        <div className="absolute bottom-6 left-6 text-white">
          <h1 className="text-2xl font-semibold">
            {event.title}
          </h1>
          <p className="text-sm opacity-90">
            {date.toDateString()}
          </p>
        </div>

        {/* THREE DOTS */}
        <div className="absolute top-4 right-4">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="bg-white/90 w-9 h-9 rounded-full shadow"
          >
            ⋯
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-2 bg-white rounded-xl shadow p-2 text-sm w-36">
              <button
                onClick={() => {
                  setShowMenu(false);
                  setShowEditModal(true);
                }}
                className="block w-full text-left px-3 py-2 hover:bg-neutral-100 rounded-lg"
              >
                Edit Event
              </button>

              <button
                onClick={handleDeleteEvent}
                className="block w-full text-left px-3 py-2 text-red-500 hover:bg-neutral-100 rounded-lg"
              >
                Delete Event
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ✅ CONTENT */}
      <div className="max-w-6xl mx-auto p-6">

        {/* ✅ PREMIUM BUTTON */}
        <button
          onClick={() => setShowMediaModal(true)}
          className="bg-black text-white px-6 py-2 rounded-full text-sm mb-6 hover:scale-105 transition"
        >
          + Add Media
        </button>

        {/* ✅ ULTRA POLISHED GRID 🔥 */}
        <div className="grid grid-cols-3 gap-4">

          {media.map((m, i) => (
            <div
              key={m.id}
              onClick={() => setViewerIndex(i)}
              className="group relative aspect-square bg-neutral-100 rounded-xl overflow-hidden cursor-pointer"
            >

              {/* IMAGE */}
              {m.mediaType === "image" && (
                <img
                  src={m.mediaUrl}
                  className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                />
              )}

              {/* VIDEO */}
              {m.mediaType === "video" && (
                <video className="w-full h-full object-cover group-hover:scale-110 transition duration-500">
                  <source src={m.mediaUrl} />
                </video>
              )}

              {/* HOVER OVERLAY */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />

            </div>
          ))}

        </div>

        {media.length === 0 && (
          <p className="text-neutral-500">
            No media yet
          </p>
        )}
      </div>

      {/* ✅ ADD MEDIA MODAL */}
      {showMediaModal && (
        <Modal title="Add Media">

          <input
            type="file"
            accept="image/*,video/*"
            onChange={(e) => setSelectedFile(e.target.files[0])}
            className="mb-3"
          />

          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write a caption..."
            className="w-full border rounded px-3 py-2 text-sm mb-4"
          />

          <ModalActions
            onCancel={() => setShowMediaModal(false)}
            onConfirm={handleUploadMedia}
            loading={uploading}
          />
        </Modal>
      )}

      {/* ✅ VIEWER 🔥🔥🔥 */}
      {viewerIndex !== null && (
        <Viewer
          media={media}
          index={viewerIndex}
          onClose={() => setViewerIndex(null)}
          onNext={() =>
            setViewerIndex((viewerIndex + 1) % media.length)
          }
          onPrev={() =>
            setViewerIndex(
              (viewerIndex - 1 + media.length) % media.length
            )
          }
        />
      )}

    </Layout>
  );
}

/* ✅ ULTRA PREMIUM VIEWER */

function Viewer({ media, index, onClose, onNext, onPrev }) {
  const item = media[index];

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50">

      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-white text-2xl"
      >
        ✕
      </button>

      <button onClick={onPrev} className="absolute left-6 text-white text-4xl">
        ‹
      </button>

      <div className="max-w-5xl">

        {item.mediaType === "image" && (
          <img
            src={item.mediaUrl}
            className="max-h-[85vh] rounded-xl shadow-2xl"
          />
        )}

        {item.mediaType === "video" && (
          <video controls className="max-h-[85vh] rounded-xl shadow-2xl">
            <source src={item.mediaUrl} />
          </video>
        )}

        {item.caption && (
          <div className="text-white text-sm mt-4 text-center">
            {item.caption}
          </div>
        )}
      </div>

      <button onClick={onNext} className="absolute right-6 text-white text-4xl">
        ›
      </button>
    </div>
  );
}

/* MODALS */

function Modal({ title, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl w-80">
        <h3 className="font-semibold mb-3">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function ModalActions({ onCancel, onConfirm, loading }) {
  return (
    <div className="flex gap-2">
      <button onClick={onCancel} className="flex-1 border rounded py-2">
        Cancel
      </button>

      <button
        onClick={onConfirm}
        className="flex-1 bg-black text-white rounded py-2"
      >
        {loading ? "Uploading..." : "Upload"}
      </button>
    </div>
  );
}

