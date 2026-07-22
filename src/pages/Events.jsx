import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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

// Premium Icons
import { 
  ArrowLeft, MoreVertical, Image as ImageIcon, Film, 
  Upload, X, ChevronLeft, ChevronRight, Calendar, 
  Edit2, Trash2, Loader2, Plus
} from "lucide-react";

export default function Events() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals & Menus
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);

  // Upload State
  const [selectedFile, setSelectedFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  // Edit State
  const [newTitle, setNewTitle] = useState("");
  const [newCover, setNewCover] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Viewer State
  const [viewerIndex, setViewerIndex] = useState(null);

  useEffect(() => {
    Promise.all([loadEvent(), loadMedia()]).then(() => setLoading(false));
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
    const q = query(collection(db, "eventMedia"), where("eventId", "==", eventId));
    const snap = await getDocs(q);
    setMedia(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis()));
  };

  /* ✅ ADD MEDIA */
  const handleUploadMedia = async () => {
    if (!selectedFile) return alert("Please select a photo or video first.");
    setUploading(true);

    try {
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
    } catch (error) {
      console.error("Upload failed", error);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  /* ✅ EDIT EVENT */
  const handleSaveEdit = async () => {
    setSavingEdit(true);
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
    setSavingEdit(false);
  };

  /* ✅ DELETE EVENT */
  const handleDeleteEvent = async () => {
    if (!window.confirm("Are you sure you want to delete this event? This will remove all associated media forever.")) return;
    await deleteDoc(doc(db, "events", eventId));
    navigate(-1);
  };

  if (loading || !event) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
        </div>
      </Layout>
    );
  }

  const date = event.date ? new Date(event.date) : new Date();

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50/50 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-50/40 via-slate-50/50 to-white pb-20">
        
        {/* ✅ CINEMATIC HEADER */}
        <div className="relative h-[300px] md:h-[400px] w-full max-w-[1200px] mx-auto md:mt-6 md:rounded-[32px] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.06)] group">
          <img src={event.coverUrl} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="Event Cover" />
          
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-slate-900/10 pointer-events-none" />

          {/* Top Nav Controls */}
          <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-10">
            <button 
              onClick={() => navigate(-1)} 
              className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/40 transition-all border border-white/30 shadow-sm"
            >
              <ArrowLeft size={20} />
            </button>

            <div className="relative">
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/40 transition-all border border-white/30 shadow-sm"
              >
                <MoreVertical size={20} />
              </button>

              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 mt-2 bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl p-2 text-sm w-48 z-20 border border-white animate-in zoom-in-95 duration-200">
                    <button 
                      onClick={() => { setShowMenu(false); setShowEditModal(true); }} 
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-100 rounded-xl flex items-center gap-2 font-medium text-slate-700 transition-colors"
                    >
                      <Edit2 size={16} /> Edit Details
                    </button>
                    <div className="h-px w-full bg-slate-100 my-1" />
                    <button 
                      onClick={handleDeleteEvent} 
                      className="w-full text-left px-4 py-2.5 hover:bg-red-50 rounded-xl flex items-center gap-2 font-medium text-red-500 transition-colors"
                    >
                      <Trash2 size={16} /> Delete Event
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Title Info */}
          <div className="absolute bottom-8 left-8 right-8 text-white z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-xs font-bold uppercase tracking-widest mb-3">
              <Calendar size={14} /> {date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight drop-shadow-lg mb-2">{event.title}</h1>
            <p className="text-indigo-200 font-medium">{event.mediaCount || 0} Memories Captured</p>
          </div>
        </div>

        {/* ✅ CONTENT SECTION */}
        <div className="max-w-[1200px] mx-auto px-4 mt-8">
          
          {/* Action Bar */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800">Gallery</h2>
            <button
              onClick={() => setShowMediaModal(true)}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all active:scale-95 flex items-center gap-2"
            >
              <Plus size={18} /> Add Memory
            </button>
          </div>

          {/* ✅ ULTRA POLISHED GRID 🔥 */}
          {media.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white/50 backdrop-blur-sm border-2 border-dashed border-slate-200 rounded-[32px]">
              <ImageIcon size={48} className="text-slate-300 mb-4" />
              <p className="text-slate-500 font-medium">No media uploaded yet.</p>
              <p className="text-sm text-slate-400 mt-1">Be the first to share a memory!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {media.map((m, i) => (
                <div
                  key={m.id}
                  onClick={() => setViewerIndex(i)}
                  className="group relative aspect-square bg-slate-100 rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300 ring-1 ring-slate-900/5"
                >
                  {/* IMAGE */}
                  {m.mediaType === "image" && (
                    <img src={m.mediaUrl} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" alt="Memory" />
                  )}

                  {/* VIDEO */}
                  {m.mediaType === "video" && (
                    <>
                      <video className="w-full h-full object-cover group-hover:scale-110 transition duration-700">
                        <source src={m.mediaUrl} />
                      </video>
                      <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md p-1.5 rounded-full text-white">
                        <Film size={14} />
                      </div>
                    </>
                  )}

                  {/* HOVER OVERLAY */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                    <p className="text-white text-sm font-medium line-clamp-2 drop-shadow-md">
                      {m.caption || (m.mediaType === 'image' ? 'Photo' : 'Video')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ✅ ADD MEDIA MODAL */}
      {showMediaModal && (
        <ModernModal title="Add to Gallery" onClose={() => !uploading && setShowMediaModal(false)}>
          <label className="block w-full border-2 border-dashed border-slate-200 rounded-2xl py-10 text-center cursor-pointer hover:bg-slate-50 hover:border-indigo-300 transition-all mb-4 group">
            {selectedFile ? (
               <div className="text-indigo-600 font-bold flex flex-col items-center">
                 <ImageIcon size={32} className="mb-2" />
                 {selectedFile.name}
               </div>
            ) : (
               <div className="flex flex-col items-center text-slate-400 group-hover:text-indigo-400 transition-colors">
                 <Upload size={32} className="mb-2" />
                 <span className="text-sm font-bold uppercase tracking-widest">Select File</span>
               </div>
            )}
            <input type="file" hidden accept="image/*,video/*" onChange={(e) => setSelectedFile(e.target.files[0])} disabled={uploading} />
          </label>

          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write a caption (optional)..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-800 resize-none mb-6"
            rows="3"
            disabled={uploading}
          />

          <div className="flex gap-3">
            <button onClick={() => setShowMediaModal(false)} disabled={uploading} className="flex-1 bg-white border border-slate-200 rounded-xl py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">
              Cancel
            </button>
            <button onClick={handleUploadMedia} disabled={uploading || !selectedFile} className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl py-3 text-sm font-bold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2">
              {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
              {uploading ? "Uploading..." : "Upload Media"}
            </button>
          </div>
        </ModernModal>
      )}

      {/* ✅ EDIT EVENT MODAL */}
      {showEditModal && (
        <ModernModal title="Edit Event" onClose={() => !savingEdit && setShowEditModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">Event Title</label>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-800"
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">Update Cover Image (Optional)</label>
              <label className="block w-full border-2 border-dashed border-slate-200 rounded-xl py-6 text-center cursor-pointer hover:bg-slate-50 hover:border-indigo-300 transition-all">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{newCover ? newCover.name : "Select New Cover"}</span>
                <input type="file" hidden accept="image/*" onChange={(e) => setNewCover(e.target.files[0])} disabled={savingEdit} />
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowEditModal(false)} disabled={savingEdit} className="flex-1 bg-white border border-slate-200 rounded-xl py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleSaveEdit} disabled={savingEdit || !newTitle.trim()} className="flex-1 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl py-3 text-sm font-bold hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                {savingEdit ? <Loader2 size={18} className="animate-spin" /> : <Edit2 size={18} />}
                Save Changes
              </button>
            </div>
          </div>
        </ModernModal>
      )}

      {/* ✅ ULTRA PREMIUM VIEWER 🔥🔥🔥 */}
      {viewerIndex !== null && (
        <Viewer
          media={media}
          index={viewerIndex}
          onClose={() => setViewerIndex(null)}
          onNext={() => setViewerIndex((viewerIndex + 1) % media.length)}
          onPrev={() => setViewerIndex((viewerIndex - 1 + media.length) % media.length)}
        />
      )}

    </Layout>
  );
}

/* ✅ ULTRA PREMIUM VIEWER COMPONENT */
function Viewer({ media, index, onClose, onNext, onPrev }) {
  const item = media[index];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-200">
      
      {/* Controls */}
      <button onClick={onClose} className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-50">
        <X size={24} />
      </button>

      <button onClick={onPrev} className="absolute left-4 md:left-10 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-50 hidden sm:flex">
        <ChevronLeft size={32} />
      </button>

      <button onClick={onNext} className="absolute right-4 md:right-10 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-50 hidden sm:flex">
        <ChevronRight size={32} />
      </button>

      {/* Main Content Box */}
      <div className="relative w-full max-w-5xl max-h-[85vh] flex flex-col items-center justify-center px-4 animate-in zoom-in-95 duration-300">
        
        {item.mediaType === "image" ? (
          <img src={item.mediaUrl} className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl object-contain border border-white/10" alt="Gallery View" />
        ) : (
          <video controls autoPlay className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl border border-white/10">
            <source src={item.mediaUrl} />
          </video>
        )}

        {/* Caption */}
        {item.caption && (
          <div className="absolute bottom-6 mx-auto bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 text-white text-sm font-medium shadow-2xl max-w-[90%] text-center">
            {item.caption}
          </div>
        )}
      </div>
      
      {/* Mobile Swipe Areas (Transparent) */}
      <div className="absolute inset-y-0 left-0 w-1/3 sm:hidden z-40" onClick={onPrev} />
      <div className="absolute inset-y-0 right-0 w-1/3 sm:hidden z-40" onClick={onNext} />
    </div>
  );
}

/* REUSABLE MODERN MODAL */
function ModernModal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-white/95 backdrop-blur-2xl w-full max-w-md rounded-[32px] p-8 shadow-[0_20px_60px_rgb(0,0,0,0.1)] border border-white animate-in zoom-in-95 duration-200">
        <h3 className="text-xl font-bold mb-6 text-slate-800 text-center tracking-tight">{title}</h3>
        {children}
      </div>
    </div>
  );
}