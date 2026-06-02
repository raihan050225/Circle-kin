import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  onSnapshot, // Added for real-time profile sync
} from "firebase/firestore";

import { auth, db } from "../services/firebase";
import Layout from "../components/Layout";

// Icons matching Home UI
import { 
  Heart, MessageCircle, Send, MoreHorizontal, 
  Image as ImageIcon, Trash2, Calendar, Plus, Camera, User 
} from "lucide-react";

import {
  createPost,
  getCirclePosts,
  toggleLike,
  deletePost,
} from "../services/post";

import {
  createComment,
  getPostComments,
  deleteComment,
} from "../services/comment";

import { uploadToCloudinary } from "../services/cloudinary";

export default function Circle() {
  const { circleId } = useParams();
  const navigate = useNavigate();
  
  const [user, setUser] = useState(null);
  const [profileData, setProfileData] = useState(null); // ✅ Real-time profile state
  const [circle, setCircle] = useState(null);
  const [posts, setPosts] = useState([]);
  const [events, setEvents] = useState([]);

  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [copied, setCopied] = useState(false);

  /* EVENT MODAL STATE */
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventCover, setEventCover] = useState(null);
  const [creatingEvent, setCreatingEvent] = useState(false);

  /* ✅ AUTH & REAL-TIME PROFILE SYNC */
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u) {
        // Listen for profile changes (name/photo) from Settings
        const unsubProfile = onSnapshot(doc(db, "users", u.uid), (doc) => {
          if (doc.exists()) {
            setProfileData(doc.data());
          }
        });
        return () => unsubProfile();
      }
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    loadData();
  }, [circleId]);

  const loadData = async () => {
    const snap = await getDoc(doc(db, "circles", circleId));

    if (!snap.exists()) {
      navigate("/home");
      return;
    }

    setCircle({ id: snap.id, ...snap.data() });
    setPosts(await getCirclePosts(circleId));

    const q = query(
      collection(db, "events"),
      where("circleId", "==", circleId)
    );

    const eventSnap = await getDocs(q);
    setEvents(eventSnap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const handleCoverChange = async (file) => {
    if (!file) return;
    const uploaded = await uploadToCloudinary(file);
    await updateDoc(doc(db, "circles", circleId), {
      coverUrl: uploaded.url,
    });
    setCircle({ ...circle, coverUrl: uploaded.url });
  };

  const handleCopyInvite = async () => {
    await navigator.clipboard.writeText(circle.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteCircle = async () => {
    if (!window.confirm("Delete this circle permanently?")) return;
    await deleteDoc(doc(db, "circles", circleId));
    navigate("/home");
  };

  const handleCreateEvent = async () => {
    if (!eventName.trim() || !eventDate || !eventCover) return alert("Fill all fields");
    setCreatingEvent(true);
    const uploaded = await uploadToCloudinary(eventCover);
    await addDoc(collection(db, "events"), {
      circleId,
      title: eventName,
      date: eventDate,
      coverUrl: uploaded.url,
      mediaCount: 0,
      createdAt: Timestamp.now(),
    });
    setEventName(""); setEventDate(""); setEventCover(null);
    setShowEventModal(false);
    await loadData();
    setCreatingEvent(false);
  };

  const handlePost = async () => {
    if (!text.trim() && !file) return;
    
    // ✅ Updated to include latest profile details in the post
    const authorName = profileData?.displayName || user.displayName || "User";
    const authorPhoto = profileData?.photoURL || null;

    await addDoc(collection(db, "posts"), {
      text,
      circleId,
      authorId: user.uid,
      authorName,
      authorPhoto,
      createdAt: Timestamp.now(),
      // handle file upload logic inside createPost service if needed, 
      // otherwise add mediaUrl here after cloudinary upload
    });

    setText(""); setFile(null);
    setPosts(await getCirclePosts(circleId));
  };

  const isAdmin = circle?.adminId === user?.uid || circle?.creatorId === user?.uid;

  return (
    <Layout>
      {/* HERO SECTION */}
      <div className="relative h-64 bg-neutral-900 group overflow-hidden">
        {circle?.coverUrl ? (
          <img src={circle.coverUrl} className="w-full h-full object-cover opacity-70" alt="" />
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-orange-100 to-orange-50" />
        )}

        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all" />

        <label className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center text-white gap-2">
          <Camera size={32} />
          <span className="text-xs font-bold uppercase tracking-widest">Change Cover</span>
          <input type="file" hidden accept="image/*" onChange={(e) => handleCoverChange(e.target.files[0])} />
        </label>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 max-w-6xl w-full px-6 text-white text-center md:text-left md:left-auto md:translate-x-0">
          <h1 className="text-4xl font-serif font-bold mb-1 drop-shadow-md">{circle?.name}</h1>
          <p className="text-sm font-medium opacity-90 uppercase tracking-widest">{circle?.type} Community</p>
        </div>

        {isAdmin && (
          <div className="absolute top-6 right-6 flex gap-3">
            <button onClick={handleCopyInvite} className="bg-white/90 backdrop-blur px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-white transition-all">
              {copied ? "COPIED!" : `CODE: ${circle?.inviteCode}`}
            </button>
            <button onClick={handleDeleteCircle} className="bg-red-500/90 backdrop-blur text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-600 transition-all">
              DELETE
            </button>
          </div>
        )}
      </div>

      {/* CONTENT GRID */}
      <div className="max-w-[1000px] mx-auto p-6 grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">

          {/* CREATE POST (SYNCED PROFILE) */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex gap-3 mb-4">
               <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center font-bold text-orange-600 border overflow-hidden shrink-0 shadow-inner">
                  {profileData?.photoURL ? (
                    <img src={profileData.photoURL} className="w-full h-full object-cover" />
                  ) : (
                    (profileData?.displayName?.[0] || user?.email?.[0] || "U").toUpperCase()
                  )}
               </div>
               <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`Share something with ${circle?.name}...`}
                className="w-full outline-none resize-none text-sm placeholder-gray-400 mt-2"
                rows="3"
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <label className="flex items-center gap-2 text-gray-500 hover:text-black cursor-pointer transition">
                <ImageIcon size={20} />
                <span className="text-xs font-bold">Media</span>
                <input type="file" hidden accept="image/*,video/*" onChange={(e) => setFile(e.target.files[0])} />
              </label>
              <button onClick={handlePost} className="bg-black text-white px-6 py-2 rounded-full text-xs font-bold hover:bg-neutral-800 transition-all">Post</button>
            </div>
          </div>

          {/* POSTS LIST (FIXED "MEMBER" BADGE) */}
          {posts.map((p) => {
            const liked = p.likes?.includes(user?.uid);
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between border-b border-gray-50">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-[10px] border overflow-hidden shrink-0">
                        {p.authorPhoto ? (
                          <img src={p.authorPhoto} className="w-full h-full object-cover" />
                        ) : (
                          (p.authorName?.[0] || "?").toUpperCase()
                        )}
                      </div>
                      <p className="text-xs font-bold">{p.authorName || "Circle Member"}</p>
                   </div>
                   <MoreHorizontal size={18} className="text-gray-300" />
                </div>

                {p.mediaUrl && (
                  <div className="bg-black flex items-center justify-center">
                    {p.mediaType === "image" ? (
                      <img src={p.mediaUrl} className="max-h-[500px] w-full object-contain" alt="" />
                    ) : (
                      <video controls className="max-h-[500px] w-full"><source src={p.mediaUrl} /></video>
                    )}
                  </div>
                )}

                <div className="p-4">
                  <div className="flex gap-4 mb-4">
                    <button onClick={async () => {
                        await toggleLike(p.id, user.uid, liked);
                        setPosts(await getCirclePosts(circleId));
                      }}>
                      <Heart size={24} className={liked ? "fill-red-500 text-red-500" : "text-gray-700 hover:text-red-500"} />
                    </button>
                    <MessageCircle size={24} className="text-gray-700" />
                    <Send size={24} className="text-gray-700" />
                    {p.authorId === user?.uid && (
                      <button className="ml-auto text-gray-300 hover:text-red-500 transition-colors"
                        onClick={async () => {
                          await deletePost(p.id);
                          setPosts(posts.filter(x => x.id !== p.id));
                        }}>
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>
                  <p className="text-xs font-bold mb-2">{p.likes?.length || 0} likes</p>
                  {p.text && <p className="text-sm text-gray-800 leading-relaxed mb-4">{p.text}</p>}
                  <CommentSection postId={p.id} profileData={profileData} />
                </div>
              </div>
            );
          })}
        </div>

        {/* SIDEBAR */}
        <aside className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm sticky top-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold text-sm uppercase tracking-tighter flex items-center gap-2">
                <Calendar size={18} className="text-orange-500" /> Circle Events
              </h2>
              <button onClick={() => setShowEventModal(true)} className="p-1 hover:bg-neutral-100 rounded-full transition-colors text-orange-500">
                <Plus size={20} />
              </button>
            </div>
            <div className="space-y-4">
              {events.length === 0 ? (
                <p className="text-xs text-neutral-400 italic text-center py-4">No events scheduled yet.</p>
              ) : (
                events.map((e) => (
                  <div key={e.id} onClick={() => navigate(`/events/${circleId}/${e.id}`)} className="group cursor-pointer">
                    <div className="relative rounded-xl overflow-hidden mb-2">
                      <img src={e.coverUrl} className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                      <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-lg font-bold">
                        📷 {e.mediaCount || 0} Photos
                      </div>
                    </div>
                    <p className="font-bold text-sm group-hover:text-orange-600 transition-colors">{e.title}</p>
                    <p className="text-[11px] text-neutral-500 italic lowercase">{new Date(e.date).toDateString()}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* EVENT MODAL */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-serif font-bold mb-6">Schedule Event</h3>
            <input value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="Event Title" className="w-full border-2 border-neutral-100 rounded-xl px-4 py-3 text-sm mb-4 outline-none focus:border-black transition-all" />
            <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="w-full border-2 border-neutral-100 rounded-xl px-4 py-3 text-sm mb-4 outline-none focus:border-black transition-all" />
            <label className="block w-full border-2 border-dashed border-neutral-200 rounded-xl py-6 text-center cursor-pointer hover:bg-neutral-50 transition-colors mb-6">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">{eventCover ? eventCover.name : "Upload Event Cover"}</span>
              <input type="file" hidden accept="image/*" onChange={(e) => setEventCover(e.target.files[0])} />
            </label>
            <div className="flex gap-3">
              <button onClick={() => setShowEventModal(false)} className="flex-1 border-2 border-black rounded-xl py-3 text-sm font-bold hover:bg-neutral-50 transition-colors">Cancel</button>
              <button onClick={handleCreateEvent} className="flex-1 bg-black text-white rounded-xl py-3 text-sm font-bold hover:bg-neutral-800 transition-colors">
                {creatingEvent ? "..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

function CommentSection({ postId, profileData }) {
  const user = auth.currentUser;
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");

  useEffect(() => {
    getPostComments(postId).then(setComments);
  }, [postId]);

  const submit = async () => {
    if (!text.trim()) return;
    // ✅ Uses real-time profile data for comments
    await createComment(postId, { ...user, displayName: profileData?.displayName || user.displayName }, text);
    setText("");
    setComments(await getPostComments(postId));
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-50">
      <div className="space-y-2 mb-4">
        {comments.map((c) => (
          <div key={c.id} className="text-xs flex justify-between group">
            <p><span className="font-bold mr-2">{c.userName || "Member"}</span><span className="text-gray-600">{c.text}</span></p>
            {c.userId === user?.uid && (
              <button onClick={async () => {
                await deleteComment(c.id);
                setComments(comments.filter(x => x.id !== c.id));
              }} className="text-[10px] text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">Delete</button>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a comment…" className="flex-1 text-xs outline-none bg-transparent placeholder-gray-300" />
        <button onClick={submit} className="text-xs font-bold text-orange-500">Post</button>
      </div>
    </div>
  );
}