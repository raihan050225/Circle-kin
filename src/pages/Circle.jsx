import { useEffect, useState, useRef } from "react";
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
  onSnapshot,
  orderBy,
} from "firebase/firestore";

import { auth, db } from "../services/firebase";
import Layout from "../components/Layout";

import { 
  Heart, MessageCircle, Send, MoreHorizontal, 
  Image as ImageIcon, Trash2, Calendar, Plus, Camera, Users, 
  MessageSquare, LayoutGrid, Hash, Link as LinkIcon, CheckCircle2 
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
  const [profileData, setProfileData] = useState(null);
  const [circle, setCircle] = useState(null);
  const [posts, setPosts] = useState([]);
  const [events, setEvents] = useState([]);
  const [membersList, setMembersList] = useState([]);

  // UI State
  const [activeTab, setActiveTab] = useState("feed"); // 'feed', 'chat', 'members'
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  // Post State
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [posting, setPosting] = useState(false);

  // Event Modal State
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventCover, setEventCover] = useState(null);
  const [creatingEvent, setCreatingEvent] = useState(false);

  /* AUTH & REAL-TIME PROFILE SYNC */
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u) {
        const unsubProfile = onSnapshot(doc(db, "users", u.uid), (doc) => {
          if (doc.exists()) setProfileData(doc.data());
        });
        return () => unsubProfile();
      }
    });
    return () => unsubAuth();
  }, []);

  /* LOAD CIRCLE DATA */
  useEffect(() => {
    loadData();
  }, [circleId]);

  const loadData = async () => {
    setLoading(true);
    const snap = await getDoc(doc(db, "circles", circleId));

    if (!snap.exists()) {
      navigate("/home");
      return;
    }

    const circleData = { id: snap.id, ...snap.data() };
    setCircle(circleData);
    setPosts(await getCirclePosts(circleId));

    // Fetch Events
    const qEvents = query(collection(db, "events"), where("circleId", "==", circleId));
    const eventSnap = await getDocs(qEvents);
    setEvents(eventSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    // Fetch Members (Basic info)
    if (circleData.members?.length > 0) {
      const loadedMembers = [];
      for (const uid of circleData.members) {
        const mSnap = await getDoc(doc(db, "users", uid));
        if (mSnap.exists()) loadedMembers.push({ id: mSnap.id, ...mSnap.data() });
      }
      setMembersList(loadedMembers);
    }
    setLoading(false);
  };

  /* ACTIONS */
  const handleCoverChange = async (file) => {
    if (!file) return;
    const uploaded = await uploadToCloudinary(file);
    await updateDoc(doc(db, "circles", circleId), { coverUrl: uploaded.url });
    setCircle({ ...circle, coverUrl: uploaded.url });
  };

  const handleCopyInvite = async () => {
    await navigator.clipboard.writeText(circle.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteCircle = async () => {
    if (!window.confirm("Are you sure you want to delete this circle? This cannot be undone.")) return;
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
    setPosting(true);
    
    let mediaUrl = null;
    let mediaType = null;

    if (file) {
      const uploaded = await uploadToCloudinary(file);
      mediaUrl = uploaded.url;
      mediaType = uploaded.type; // image or video
    }

    const authorName = profileData?.displayName || user.displayName || "User";
    const authorPhoto = profileData?.photoURL || null;

    await addDoc(collection(db, "posts"), {
      text,
      circleId,
      authorId: user.uid,
      authorName,
      authorPhoto,
      mediaUrl,
      mediaType,
      likes: [],
      createdAt: Timestamp.now(),
      type: "post"
    });

    setText(""); setFile(null);
    setPosts(await getCirclePosts(circleId));
    setPosting(false);
  };

  const isAdmin = circle?.adminId === user?.uid || circle?.creatorId === user?.uid;
  const circleMedia = posts.filter(p => p.mediaUrl && p.mediaType === 'image').slice(0, 4);

  if (loading || !circle) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50/50 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-50/40 via-slate-50/50 to-white pb-20">
        
        {/* PREMIUM HERO SECTION */}
        <div className="relative h-[250px] md:h-[320px] w-full max-w-[1200px] mx-auto md:mt-6 md:rounded-[32px] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.06)] group">
          {circle.coverUrl ? (
            <img src={circle.coverUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-indigo-200 via-purple-200 to-orange-100" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent pointer-events-none" />

          {/* Admin Cover Change Overlay */}
          {isAdmin && (
            <label className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center bg-black/40 backdrop-blur-md px-6 py-4 rounded-2xl text-white gap-2 shadow-xl border border-white/20">
              <Camera size={28} />
              <span className="text-xs font-bold uppercase tracking-widest">Update Cover</span>
              <input type="file" hidden accept="image/*" onChange={(e) => handleCoverChange(e.target.files[0])} />
            </label>
          )}

          {/* Circle Info */}
          <div className="absolute bottom-6 left-6 md:left-10 text-white">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-[10px] font-bold uppercase tracking-widest mb-3">
              {circle.type} Community
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight drop-shadow-lg">{circle.name}</h1>
          </div>
        </div>

        {/* MAIN LAYOUT GRID */}
        <div className="max-w-[1200px] mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: TABS & CONTENT */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* TABS */}
            <div className="bg-white/80 backdrop-blur-xl p-1.5 rounded-2xl border border-white shadow-[0_4px_20px_rgb(0,0,0,0.03)] inline-flex w-full md:w-auto">
              <button 
                onClick={() => setActiveTab("feed")}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === "feed" ? "bg-white shadow-sm text-indigo-600" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}
              >
                <LayoutGrid size={18} /> Feed
              </button>
              <button 
                onClick={() => setActiveTab("chat")}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === "chat" ? "bg-white shadow-sm text-indigo-600" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}
              >
                <MessageSquare size={18} /> Live Chat
              </button>
              <button 
                onClick={() => setActiveTab("members")}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === "members" ? "bg-white shadow-sm text-indigo-600" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}
              >
                <Users size={18} /> Members
              </button>
            </div>

            {/* TAB CONTENT: FEED */}
            {activeTab === "feed" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* CREATE POST */}
                <div className="bg-white/80 backdrop-blur-xl border border-white rounded-[24px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] focus-within:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-orange-100 to-orange-50 shrink-0 flex items-center justify-center font-bold text-orange-600 shadow-inner overflow-hidden border border-orange-100">
                      {profileData?.photoURL ? <img src={profileData.photoURL} className="w-full h-full object-cover" /> : (profileData?.displayName?.[0] || user?.email?.[0] || "U").toUpperCase()}
                    </div>
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder={`What's happening in ${circle.name}?`}
                      className="w-full mt-2 outline-none resize-none text-base bg-transparent text-slate-800 placeholder-slate-400"
                      rows="2"
                    />
                  </div>
                  
                  {file && (
                    <div className="mt-2 ml-16 relative w-20 h-20 rounded-xl overflow-hidden shadow-sm border border-slate-200">
                      <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="preview" />
                      <button onClick={() => setFile(null)} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 backdrop-blur-sm">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <label className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-indigo-50 text-slate-400 hover:text-indigo-500 cursor-pointer transition-colors">
                      <ImageIcon size={22} />
                      <input type="file" hidden accept="image/*,video/*" onChange={(e) => setFile(e.target.files[0])} />
                    </label>
                    <button 
                      onClick={handlePost} 
                      disabled={posting || (!text.trim() && !file)}
                      className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-8 py-2.5 rounded-full text-sm font-bold hover:shadow-lg hover:shadow-slate-900/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {posting ? "Posting..." : "Share"}
                    </button>
                  </div>
                </div>

                {/* POSTS LIST */}
                {posts.length === 0 ? (
                  <div className="text-center py-10">
                     <p className="text-slate-400 font-medium">It's quiet here. Be the first to post!</p>
                  </div>
                ) : (
                  posts.map((p) => {
                    const liked = p.likes?.includes(user?.uid);
                    return (
                      <div key={p.id} className="bg-white/80 backdrop-blur-xl border border-slate-100 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.03)] overflow-hidden">
                        <div className="px-5 py-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400 border border-slate-200 overflow-hidden shrink-0">
                              {p.authorPhoto ? <img src={p.authorPhoto} className="w-full h-full object-cover" /> : (p.authorName?.[0] || "?").toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800 flex items-center gap-1">
                                {p.authorName || "Circle Member"}
                                {p.type === 'announcement' && <CheckCircle2 size={14} className="text-blue-500" />}
                              </p>
                             <p className="text-[10px] text-slate-400 font-medium">
  {p.createdAt?.toDate 
    ? p.createdAt.toDate().toLocaleString() 
    : new Date(p.createdAt || Date.now()).toLocaleString()}
</p>
                            </div>
                          </div>
                          {p.authorId === user?.uid && (
                            <button onClick={async () => {
                                await deletePost(p.id);
                                setPosts(posts.filter(x => x.id !== p.id));
                              }} 
                              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>

                        {p.mediaUrl && (
                          <div className="bg-slate-50 border-y border-slate-100 flex items-center justify-center">
                            {p.mediaType === "image" ? (
                              <img src={p.mediaUrl} className="max-h-[600px] w-full object-cover" alt="" />
                            ) : (
                              <video controls className="max-h-[600px] w-full"><source src={p.mediaUrl} /></video>
                            )}
                          </div>
                        )}

                        <div className="px-5 py-4">
                          <div className="flex gap-4 mb-3">
                            <button onClick={async () => {
                                await toggleLike(p.id, user.uid, liked);
                                setPosts(await getCirclePosts(circleId));
                              }}
                              className="group active:scale-75 transition-transform"
                            >
                              <Heart size={26} className={liked ? "fill-red-500 text-red-500" : "text-slate-700 group-hover:text-slate-400 transition-colors"} />
                            </button>
                            <MessageCircle size={26} className="text-slate-700 hover:text-slate-400 cursor-pointer transition-colors" />
                            <Send size={26} className="text-slate-700 hover:text-slate-400 cursor-pointer transition-colors" />
                          </div>
                          <p className="text-sm font-bold text-slate-800 mb-2">{p.likes?.length || 0} likes</p>
                          {p.text && (
                            <p className="text-sm text-slate-800 leading-relaxed mb-2">
                              <span className="font-bold mr-2">{p.authorName}</span>{p.text}
                            </p>
                          )}
                          <CommentSection postId={p.id} profileData={profileData} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB CONTENT: CHAT */}
            {activeTab === "chat" && (
               <CircleChat circleId={circleId} user={user} profileData={profileData} />
            )}

            {/* TAB CONTENT: MEMBERS */}
            {activeTab === "members" && (
              <div className="bg-white/80 backdrop-blur-xl border border-white rounded-[24px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] animate-in fade-in duration-300">
                <h2 className="text-xl font-bold text-slate-800 mb-6">Circle Members ({membersList.length})</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {membersList.map(member => (
                    <div key={member.id} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white transition-colors">
                      <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-600 overflow-hidden shrink-0">
                         {member.photoURL ? <img src={member.photoURL} className="w-full h-full object-cover" /> : (member.displayName?.[0] || "?").toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{member.displayName || "Unknown Member"}</p>
                        <p className="text-xs text-slate-500 font-medium">{circle.adminId === member.id ? "Admin" : "Member"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* RIGHT COLUMN: WIDGETS */}
          <aside className="lg:col-span-4 space-y-6">
            
            {/* Invite Widget */}
            {isAdmin && (
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[24px] p-6 text-white shadow-lg shadow-indigo-500/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform"><Hash size={80} /></div>
                <h3 className="font-bold text-lg mb-1 relative z-10">Invite Friends</h3>
                <p className="text-indigo-100 text-sm mb-4 relative z-10">Share this code to let others join.</p>
                <div 
                  onClick={handleCopyInvite}
                  className="bg-white/20 backdrop-blur-md border border-white/30 rounded-xl p-3 flex items-center justify-between cursor-pointer hover:bg-white/30 transition-all relative z-10"
                >
                  <span className="font-mono font-bold text-lg tracking-widest">{circle.inviteCode}</span>
                  {copied ? <CheckCircle2 size={20} className="text-green-300" /> : <LinkIcon size={18} />}
                </div>
              </div>
            )}

            {/* Events Widget */}
            <div className="bg-white/80 backdrop-blur-xl p-6 rounded-[24px] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-bold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Calendar size={16} className="text-indigo-500" /> Upcoming Events
                </h2>
                {isAdmin && (
                  <button onClick={() => setShowEventModal(true)} className="p-1.5 hover:bg-indigo-50 rounded-full text-indigo-500 transition-colors">
                    <Plus size={18} strokeWidth={2.5} />
                  </button>
                )}
              </div>
              <div className="space-y-4">
                {events.length === 0 ? (
                  <div className="text-center py-6 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                    <p className="text-xs text-slate-400 font-medium">No events scheduled.</p>
                  </div>
                ) : (
                  events.slice(0,3).map((e) => (
                    <div key={e.id} onClick={() => navigate(`/events/${circleId}/${e.id}`)} className="group cursor-pointer flex gap-3 items-center p-2 -mx-2 rounded-xl hover:bg-slate-50 transition-colors">
                      <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-slate-200">
                        <img src={e.coverUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-1">{e.title}</p>
                        <p className="text-[11px] text-slate-500 font-medium mt-1">{new Date(e.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Media Gallery Widget */}
            {circleMedia.length > 0 && (
              <div className="bg-white/80 backdrop-blur-xl p-6 rounded-[24px] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.03)] hidden md:block">
                <h2 className="font-bold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4">
                  <ImageIcon size={16} className="text-pink-500" /> Recent Media
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {circleMedia.map((m, i) => (
                    <div key={i} className="aspect-square rounded-xl overflow-hidden border border-slate-100">
                      <img src={m.mediaUrl} className="w-full h-full object-cover hover:scale-105 transition-transform" alt="Gallery" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Danger Zone */}
            {isAdmin && (
              <div className="pt-4 text-right">
                <button onClick={handleDeleteCircle} className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors">
                  Delete Circle
                </button>
              </div>
            )}

          </aside>
        </div>
      </div>

      {/* EVENT MODAL */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setShowEventModal(false)} />
          <div className="relative bg-white/90 backdrop-blur-2xl w-full max-w-sm rounded-[32px] p-8 shadow-[0_20px_60px_rgb(0,0,0,0.1)] border border-white animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold mb-6 text-slate-800 text-center tracking-tight">Create Event</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">Event Name</label>
                <input value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="e.g. Weekend Trip" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-800" />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">Date</label>
                <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-800" />
              </div>

              <label className="block w-full border-2 border-dashed border-slate-200 rounded-xl py-8 text-center cursor-pointer hover:bg-slate-50 hover:border-indigo-300 transition-all mb-2">
                <ImageIcon size={24} className="mx-auto mb-2 text-slate-400" />
                <span className="text-xs font-bold text-slate-500">{eventCover ? eventCover.name : "Upload Cover Image"}</span>
                <input type="file" hidden accept="image/*" onChange={(e) => setEventCover(e.target.files[0])} />
              </label>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowEventModal(false)} className="flex-1 bg-white border border-slate-200 rounded-xl py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
                <button onClick={handleCreateEvent} disabled={creatingEvent} className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl py-3 text-sm font-bold hover:shadow-lg hover:shadow-indigo-500/20 transition-all active:scale-[0.98] disabled:opacity-50">
                  {creatingEvent ? "Saving..." : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

// --- NEW COMPONENT: Real-time Circle Chat ---
function CircleChat({ circleId, user, profileData }) {
  const [messages, setMessages] = useState([]);
  const [msgText, setMsgText] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    const q = query(collection(db, "circles", circleId, "messages"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return () => unsub();
  }, [circleId]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!msgText.trim()) return;
    
    const text = msgText;
    setMsgText(""); // Optimistic clear

    await addDoc(collection(db, "circles", circleId, "messages"), {
      text,
      userId: user.uid,
      userName: profileData?.displayName || user.displayName || "User",
      userPhoto: profileData?.photoURL || null,
      createdAt: Timestamp.now()
    });
  };

  return (
    <div className="bg-white/80 backdrop-blur-xl border border-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-[600px] flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300 overflow-hidden">
      {/* Chat Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-between">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Live Chat
        </h3>
      </div>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <MessageSquare size={32} className="mb-2 opacity-50" />
            <p className="font-medium text-sm">Start the conversation!</p>
          </div>
        ) : (
          messages.map((m, i) => {
            const isMe = m.userId === user.uid;
            const showAvatar = !isMe && (i === 0 || messages[i-1].userId !== m.userId);

            return (
              <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} gap-2`}>
                {!isMe && (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 shrink-0 overflow-hidden border border-white shadow-sm mt-auto">
                    {showAvatar && (m.userPhoto ? <img src={m.userPhoto} className="w-full h-full object-cover" /> : <span className="w-full h-full flex items-center justify-center text-[10px] font-bold text-indigo-500">{m.userName?.[0]?.toUpperCase()}</span>)}
                  </div>
                )}
                
                <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                  {!isMe && showAvatar && <span className="text-[10px] font-semibold text-slate-400 mb-1 ml-1">{m.userName}</span>}
                  <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                    isMe 
                      ? 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white rounded-br-none' 
                      : 'bg-white border border-slate-100 text-slate-800 rounded-bl-none'
                  }`}>
                    {m.text}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Chat Input */}
      <div className="p-4 bg-white/50 border-t border-slate-100">
        <form onSubmit={sendMessage} className="flex gap-2 items-center bg-white border border-slate-200 rounded-full pl-4 pr-1.5 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-300 transition-all shadow-sm">
          <input
            value={msgText}
            onChange={(e) => setMsgText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 text-sm bg-transparent outline-none text-slate-800 placeholder-slate-400"
          />
          <button 
            type="submit"
            disabled={!msgText.trim()}
            className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center disabled:opacity-50 disabled:bg-slate-300 transition-colors"
          >
            <Send size={14} className="ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
}

// --- UPDATED COMPONENT: Premium Comment Section ---
function CommentSection({ postId, profileData }) {
  const user = auth.currentUser;
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");

  useEffect(() => {
    getPostComments(postId).then(setComments);
  }, [postId]);

  const submit = async () => {
    if (!text.trim()) return;
    await createComment(postId, { ...user, displayName: profileData?.displayName || user.displayName }, text);
    setText("");
    setComments(await getPostComments(postId));
  };

  return (
    <div className="mt-4 pt-4 border-t border-slate-100">
      <div className="space-y-3 mb-4 max-h-40 overflow-y-auto no-scrollbar pr-2">
        {comments.map((c) => (
          <div key={c.id} className="flex justify-between items-start group">
            <p className="text-sm leading-snug">
              <span className="font-bold text-slate-800 mr-2">{c.userName || "Member"}</span>
              <span className="text-slate-700">{c.text}</span>
            </p>
            {c.userId === user?.uid && (
              <button 
                onClick={async () => {
                  await deleteComment(c.id);
                  setComments(comments.filter((x) => x.id !== c.id));
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded text-red-400 mt-0.5"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2 items-center bg-slate-50 border border-slate-200 rounded-full px-4 py-2 focus-within:ring-2 focus-within:ring-slate-200 focus-within:bg-white transition-all">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a comment…"
          className="flex-1 text-sm bg-transparent outline-none placeholder-slate-400 text-slate-800"
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <button 
          onClick={submit} 
          disabled={!text.trim()}
          className="text-sm font-bold text-indigo-600 disabled:opacity-40 hover:text-indigo-800 transition-colors"
        >
          Post
        </button>
      </div>
    </div>
  );
}