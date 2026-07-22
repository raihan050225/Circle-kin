import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";

import { auth, db } from "../services/firebase";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  addDoc,
  Timestamp,
  onSnapshot,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";

import { ensureUserExists } from "../services/user";
import { deletePost } from "../services/post";
import { addComment, getComments, deleteComment } from "../services/comment";
import { uploadToCloudinary } from "../services/cloudinary";

import { 
  Heart, MessageCircle, Send, 
  Image as ImageIcon, Trash2, Megaphone, PlusCircle, CheckCircle2 
} from "lucide-react";

export default function Home() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [circles, setCircles] = useState([]);
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  /* CREATE POST STATE */
  const [postText, setPostText] = useState("");
  const [postType, setPostType] = useState("post");
  const [postCircle, setPostCircle] = useState("");
  const [mediaFile, setMediaFile] = useState(null);
  const [posting, setPosting] = useState(false);

  /* AUTH & REAL-TIME PROFILE SYNC */
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u) {
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

  /* LOAD FEED & CIRCLES */
  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setLoading(true);
      await ensureUserExists(user);

      const userSnap = await getDoc(doc(db, "users", user.uid));
      const circleIds = userSnap.data()?.circles || [];

      const loadedCircles = [];
      for (const id of circleIds) {
        const snap = await getDoc(doc(db, "circles", id));
        if (snap.exists()) {
          loadedCircles.push({ id: snap.id, ...snap.data() });
        }
      }
      setCircles(loadedCircles);

      const postSnap = await getDocs(collection(db, "posts"));
      const posts = postSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((p) => circleIds.includes(p.circleId))
        .sort((a, b) => b.createdAt?.toMillis?.() - a.createdAt?.toMillis?.());

      setFeed(posts);
      setLoading(false);
    };

    load();
  }, [user]);

  /* CREATE POST OR ANNOUNCEMENT */
  const handleCreatePost = async () => {
    if (!postCircle) return alert("Select a circle");
    if (!postText.trim() && !mediaFile) return alert("Add content");

    setPosting(true);

    let mediaUrl = null;
    let mediaType = null;

    if (mediaFile) {
      const uploaded = await uploadToCloudinary(mediaFile);
      mediaUrl = uploaded.url;
      mediaType = uploaded.type;
    }

    const postData = {
      text: postText,
      type: postType,
      circleId: postCircle,
      mediaUrl,
      mediaType,
      authorId: user.uid,
      authorName: profileData?.displayName || user.email.split('@')[0] || "User",
      authorPhoto: profileData?.photoURL || null,
      likes: [],
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, "posts"), postData);
    setFeed([{ id: docRef.id, ...postData }, ...feed]);

    setPostText("");
    setPostCircle("");
    setPostType("post");
    setMediaFile(null);
    setPosting(false);
  };

  /* TOGGLE LIKE */
  const handleLike = async (postId, currentLikes = []) => {
    const isLiked = currentLikes.includes(user.uid);
    const postRef = doc(db, "posts", postId);

    await updateDoc(postRef, {
      likes: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
    });

    setFeed(feed.map(p => 
      p.id === postId 
        ? { ...p, likes: isLiked ? p.likes.filter(id => id !== user.uid) : [...(p.likes || []), user.uid] } 
        : p
    ));
  };

  /* DELETE POST */
  const handleDeletePost = async (post) => {
    if (post.authorId !== user.uid) return;
    if (!window.confirm("Delete this post?")) return;
    await deletePost(post.id);
    setFeed(feed.filter((p) => p.id !== post.id));
  };

  if (!user || loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
          <p className="font-medium text-slate-400 tracking-wide">Loading your circles...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      {/* Ambient Light Background */}
      <div className="min-h-screen bg-slate-50/50 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-50/40 via-slate-50/50 to-white flex justify-center overflow-y-auto selection:bg-orange-200">
        
        <div className="max-w-[1000px] w-full grid grid-cols-1 lg:grid-cols-12 gap-8 px-4 py-8">
          
          <div className="lg:col-span-8 space-y-8">
            
            {/* STORIES BAR */}
            <div className="bg-white/80 backdrop-blur-xl border border-white rounded-3xl p-5 flex gap-5 overflow-x-auto no-scrollbar shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              {circles.map((c) => (
                <div key={c.id} className="flex flex-col items-center gap-2 shrink-0 cursor-pointer group" onClick={() => navigate(`/circle/${c.id}`)}>
                  {/* Modern Gradient Ring */}
                  <div className="w-[72px] h-[72px] rounded-full p-[3px] bg-gradient-to-tr from-amber-300 via-orange-500 to-rose-500 group-hover:scale-105 transition-transform duration-300 shadow-sm">
                    <div className="w-full h-full rounded-full bg-white p-[2px]">
                      <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400 overflow-hidden">
                        {c.photoUrl ? <img src={c.photoUrl} className="w-full h-full object-cover" /> : c.name?.[0]}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-slate-700 truncate w-16 text-center">{c.name}</span>
                </div>
              ))}
            </div>

            {/* CREATE POST BOX */}
            <div className="bg-white/80 backdrop-blur-xl border border-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all focus-within:shadow-[0_8px_30px_rgb(0,0,0,0.08)] focus-within:bg-white relative">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-orange-100 to-orange-50 shrink-0 flex items-center justify-center font-bold text-orange-600 shadow-inner overflow-hidden border border-orange-100">
                   {profileData?.photoURL ? (
                     <img src={profileData.photoURL} className="w-full h-full object-cover" />
                   ) : (
                     (profileData?.displayName?.[0] || user.email?.[0] || "U").toUpperCase()
                   )}
                </div>
                <textarea
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                  placeholder={postType === 'announcement' ? "📢 Broadcast an announcement..." : "What's happening in your circles?"}
                  className={`w-full mt-2 outline-none resize-none text-base placeholder-slate-400 bg-transparent ${postType === 'announcement' ? 'font-medium text-slate-800' : 'text-slate-700'}`}
                  rows="2"
                />
              </div>

              {/* Media Preview Thumbnail */}
              {mediaFile && (
                <div className="mt-2 ml-16 relative w-20 h-20 rounded-xl overflow-hidden shadow-sm border border-slate-200">
                  <img src={URL.createObjectURL(mediaFile)} className="w-full h-full object-cover" alt="preview" />
                  <button onClick={() => setMediaFile(null)} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 backdrop-blur-sm">
                    <Trash2 size={12} />
                  </button>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <label className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-orange-50 text-slate-400 hover:text-orange-500 cursor-pointer transition-colors">
                    <ImageIcon size={22} />
                    <input type="file" hidden accept="image/*,video/*" onChange={(e) => setMediaFile(e.target.files[0])} />
                  </label>
                  
                  <div className="h-6 w-px bg-slate-200 mx-1" /> {/* Divider */}

                  <select 
                    value={postCircle} 
                    onChange={(e) => setPostCircle(e.target.value)}
                    className="text-sm font-semibold bg-slate-50 border border-slate-200 text-slate-600 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-orange-500/20 cursor-pointer appearance-none pr-8 relative bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_8px_center]"
                  >
                    <option value="">Select Circle</option>
                    {circles.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>

                  <select 
                    value={postType} 
                    onChange={(e) => setPostType(e.target.value)}
                    className={`text-sm font-semibold rounded-lg px-3 py-1.5 outline-none cursor-pointer appearance-none pr-8 bg-no-repeat bg-[position:right_8px_center] ${
                      postType === 'announcement' 
                        ? 'text-red-600 bg-red-50 border border-red-100 bg-[url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23dc2626%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")]' 
                        : 'text-indigo-600 bg-indigo-50 border border-indigo-100 bg-[url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%234f46e5%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")]'
                    }`}
                  >
                    <option value="post">Standard</option>
                    <option value="announcement">Announcement</option>
                    <option value="reminder">Reminder</option>
                  </select>
                </div>

                <button
                  onClick={handleCreatePost}
                  disabled={posting}
                  className={`px-8 py-2.5 rounded-full text-sm font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 ${
                    postType === 'announcement' 
                      ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-red-500/20 hover:shadow-red-500/40' 
                      : 'bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-slate-900/20 hover:shadow-slate-900/40'
                  }`}
                >
                  {posting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : postType === 'announcement' ? (
                    <><Megaphone size={16} /> Announce</>
                  ) : (
                    "Share"
                  )}
                </button>
              </div>
            </div>

            {/* FEED POSTS */}
            <div className="space-y-8 pb-20">
              {feed.map((p) => {
                const isLiked = p.likes?.includes(user.uid);
                return (
                  <div key={p.id} className="bg-white/80 backdrop-blur-xl border border-slate-100 rounded-[24px] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-shadow duration-300">
                    {/* Header */}
                    <div className="px-5 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400 border border-slate-200 overflow-hidden">
                          {p.authorPhoto ? <img src={p.authorPhoto} className="w-full h-full object-cover" /> : (p.authorName?.[0] || "?").toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <p className="text-sm font-bold text-slate-800 leading-tight flex items-center gap-1.5">
                            {p.authorName}
                            {p.type === 'announcement' && <CheckCircle2 size={14} className="text-blue-500 fill-blue-50" />}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] font-medium text-slate-500">{circles.find((c) => c.id === p.circleId)?.name || "Circle"}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${p.type === 'announcement' ? 'text-red-500' : 'text-slate-400'}`}>
                              {p.type}
                            </span>
                          </div>
                        </div>
                      </div>
                      {p.authorId === user.uid && (
                        <button onClick={() => handleDeletePost(p)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    {/* Media */}
                    {p.mediaUrl && (
                      <div className="w-full bg-slate-50 flex items-center justify-center border-y border-slate-100">
                        {p.mediaType === "image" ? (
                          <img src={p.mediaUrl} className="max-h-[600px] w-full object-cover" alt="Post" />
                        ) : (
                          <video controls className="max-h-[600px] w-full outline-none"><source src={p.mediaUrl} /></video>
                        )}
                      </div>
                    )}

                    {/* Content & Actions */}
                    <div className="px-5 py-4">
                      {/* Action Bar */}
                      <div className="flex gap-4 mb-3">
                        <button onClick={() => handleLike(p.id, p.likes)} className="group active:scale-75 transition-transform duration-200">
                          <Heart size={26} className={`transition-colors ${isLiked ? "fill-red-500 text-red-500" : "text-slate-700 group-hover:text-slate-400"}`} />
                        </button>
                        <button className="group">
                          <MessageCircle size={26} className="text-slate-700 group-hover:text-slate-400 transition-colors" />
                        </button>
                        <button className="group">
                          <Send size={26} className="text-slate-700 group-hover:text-slate-400 transition-colors" />
                        </button>
                      </div>
                      
                      <p className="text-sm font-bold text-slate-800 mb-2">{p.likes?.length || 0} likes</p>
                      
                      {p.text && (
                        <p className="text-sm text-slate-800 mb-2 leading-relaxed">
                          <span className="font-bold mr-2">{p.authorName}</span>
                          {p.text}
                        </p>
                      )}

                      <CommentSection postId={p.id} currentUser={user} profileData={profileData} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT SIDEBAR (Profile Preview & Announcements) */}
          <div className="hidden lg:block lg:col-span-4 sticky top-8 h-fit space-y-6">
            
            {/* Sleek Profile Card */}
            <div 
              onClick={() => navigate("/profile")} 
              className="group bg-white/80 backdrop-blur-xl border border-white rounded-[24px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.03)] cursor-pointer hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-orange-100 to-amber-50 flex items-center justify-center text-orange-600 font-bold overflow-hidden shadow-sm ring-4 ring-white">
                   {profileData?.photoURL ? <img src={profileData.photoURL} className="w-full h-full object-cover" /> : (profileData?.displayName?.[0] || user.email?.[0]).toUpperCase()}
                </div>
                <div className="min-w-0">
                   <p className="font-bold text-sm text-slate-800 truncate">{profileData?.displayName || "User"}</p>
                   <p className="text-xs text-slate-500 truncate mt-0.5">{user.email}</p>
                </div>
              </div>
              <div className="text-xs font-bold text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity">
                Edit
              </div>
            </div>

            {/* Announcements Widget */}
            <div className="bg-white/80 backdrop-blur-xl border border-white rounded-[24px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
                    <Megaphone size={16} className="text-red-500" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-800">Notice Board</h3>
                </div>
              </div>
              
              <div className="space-y-4">
                {feed.filter(p => p.type === "announcement" || p.type === "reminder").slice(0, 5).map((a) => (
                  <div key={a.id} className="group relative pl-4 border-l-2 border-red-200 hover:border-red-400 transition-colors">
                     <p className="text-[10px] font-bold text-red-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                       {a.type} 
                       <span className="text-slate-400 font-normal normal-case ml-1 flex items-center gap-1">
                         <span className="w-1 h-1 rounded-full bg-slate-300" /> {circles.find(c => c.id === a.circleId)?.name || ""}
                       </span>
                     </p>
                     <p className="text-sm text-slate-700 leading-snug font-medium line-clamp-2 group-hover:line-clamp-none transition-all">{a.text}</p>
                  </div>
                ))}
                
                {feed.filter(p => p.type !== "post").length === 0 && (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-2">
                      <CheckCircle2 size={20} className="text-slate-300" />
                    </div>
                    <p className="text-xs font-medium text-slate-400">All caught up.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Links (Classic Instagram style sidebar footer) */}
            <div className="px-2 pt-2">
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                About • Help • Privacy • Terms • Locations • Language
              </p>
              <p className="text-xs text-slate-400 mt-4">© 2024 CircleKin</p>
            </div>

          </div>

        </div>
      </div>
    </Layout>
  );
}

function CommentSection({ postId, currentUser, profileData }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");

  useEffect(() => {
    getComments(postId).then(setComments);
  }, [postId]);

  const submit = async () => {
    if (!text.trim()) return;
    await addComment(postId, { ...currentUser, displayName: profileData?.displayName || currentUser.displayName }, text);
    setText("");
    setComments(await getComments(postId));
  };

  return (
    <div className="mt-4 pt-4 border-t border-slate-100">
      {/* Comments List */}
      <div className="space-y-3 mb-4 max-h-40 overflow-y-auto no-scrollbar pr-2">
        {comments.map((c) => (
          <div key={c.id} className="flex justify-between items-start group">
            <p className="text-sm leading-snug">
              <span className="font-bold text-slate-800 mr-2">{c.userName || "User"}</span>
              <span className="text-slate-700">{c.text}</span>
            </p>
            {c.userId === currentUser.uid && (
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
        {comments.length === 0 && (
          <p className="text-xs text-slate-400 font-medium">Be the first to comment...</p>
        )}
      </div>

      {/* Input Pill */}
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
          className="text-sm font-bold text-orange-500 disabled:opacity-40 disabled:cursor-not-allowed hover:text-orange-600 transition-colors"
        >
          Post
        </button>
      </div>
    </div>
  );
}