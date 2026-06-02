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

// Icons for the Instagram aesthetic
import { 
  Heart, MessageCircle, Send, MoreHorizontal, 
  Image as ImageIcon, Trash2, Bell, Megaphone 
} from "lucide-react";

export default function Home() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [profileData, setProfileData] = useState(null); // Real-time profile state
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
        // Syncs profile changes (name/photo) throughout the app instantly
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
      type: postType, // 'post', 'announcement', or 'reminder'
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
      <div className="h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="animate-pulse font-serif text-xl">CircleKin...</div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-[#fafafa] flex justify-center overflow-y-auto">
        <div className="max-w-[935px] w-full grid grid-cols-1 lg:grid-cols-3 gap-8 px-4 py-8">
          
          <div className="lg:col-span-2 space-y-6">
            {/* STORIES BAR */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex gap-4 overflow-x-auto no-scrollbar shadow-sm">
              {circles.map((c) => (
                <div key={c.id} className="flex flex-col items-center gap-1 shrink-0 cursor-pointer" onClick={() => navigate(`/circle/${c.id}`)}>
                  <div className="w-16 h-16 rounded-full p-[2px] border-2 border-orange-400">
                    <div className="w-full h-full rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-400 border-2 border-white overflow-hidden">
                      {c.photoUrl ? <img src={c.photoUrl} className="w-full h-full object-cover" /> : c.name?.[0]}
                    </div>
                  </div>
                  <span className="text-[11px] font-medium truncate w-16 text-center">{c.name}</span>
                </div>
              ))}
            </div>

            {/* CREATE POST BOX */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 shrink-0 flex items-center justify-center font-bold text-orange-600 border border-orange-200 overflow-hidden shadow-inner">
                   {profileData?.photoURL ? (
                     <img src={profileData.photoURL} className="w-full h-full object-cover" />
                   ) : (
                     (profileData?.displayName?.[0] || user.email?.[0] || "U").toUpperCase()
                   )}
                </div>
                <textarea
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                  placeholder={postType === 'announcement' ? "📢 Make an announcement..." : "Share with your circles..."}
                  className={`w-full mt-2 outline-none resize-none text-sm placeholder-gray-400 ${postType === 'announcement' ? 'font-bold' : ''}`}
                  rows="2"
                />
              </div>
              <div className="mt-4 pt-4 border-t flex items-center justify-between">
                <div className="flex gap-3">
                  <label className="cursor-pointer hover:text-orange-500 transition-colors">
                    <ImageIcon size={20} />
                    <input type="file" hidden accept="image/*,video/*" onChange={(e) => setMediaFile(e.target.files[0])} />
                  </label>
                  
                  <select 
                    value={postCircle} 
                    onChange={(e) => setPostCircle(e.target.value)}
                    className="text-xs font-bold bg-transparent outline-none text-neutral-500"
                  >
                    <option value="">Select Circle</option>
                    {circles.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>

                  <select 
                    value={postType} 
                    onChange={(e) => setPostType(e.target.value)}
                    className={`text-xs font-bold rounded px-1 outline-none ${postType === 'announcement' ? 'text-red-600 bg-red-50' : 'text-blue-600 bg-blue-50'}`}
                  >
                    <option value="post">Standard</option>
                    <option value="announcement">Announcement</option>
                    <option value="reminder">Reminder</option>
                  </select>
                </div>

                <button
                  onClick={handleCreatePost}
                  disabled={posting}
                  className={`px-6 py-1.5 rounded-full text-xs font-bold transition-all disabled:opacity-50 ${postType === 'announcement' ? 'bg-red-600 text-white' : 'bg-black text-white'}`}
                >
                  {posting ? "..." : postType === 'announcement' ? "Announce" : "Post"}
                </button>
              </div>
            </div>

            {/* FEED POSTS */}
            {feed.map((p) => {
              const isLiked = p.likes?.includes(user.uid);
              return (
                <div key={p.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-[10px] border overflow-hidden">
                        {p.authorPhoto ? <img src={p.authorPhoto} className="w-full h-full object-cover" /> : (p.authorName?.[0] || "?").toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold leading-none mb-1 truncate">
                          {p.authorName} <span className="font-normal text-gray-400 mx-1">•</span> 
                          <span className="text-orange-600">{circles.find((c) => c.id === p.circleId)?.name || "Circle"}</span>
                        </p>
                        <p className={`text-[9px] font-bold uppercase tracking-tight ${p.type === 'announcement' ? 'text-red-500' : 'text-gray-400'}`}>{p.type}</p>
                      </div>
                    </div>
                    {p.authorId === user.uid && (
                      <button onClick={() => handleDeletePost(p)} className="text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>

                  {p.mediaUrl && (
                    <div className="w-full bg-black flex items-center justify-center">
                      {p.mediaType === "image" ? (
                        <img src={p.mediaUrl} className="max-h-[500px] w-full object-contain" alt="" />
                      ) : (
                        <video controls className="max-h-[500px] w-full"><source src={p.mediaUrl} /></video>
                      )}
                    </div>
                  )}

                  <div className="px-4 py-3">
                    <div className="flex gap-4 mb-2">
                      <button onClick={() => handleLike(p.id, p.likes)}>
                        <Heart size={24} className={`transition-colors ${isLiked ? "fill-red-500 text-red-500" : "hover:text-gray-400"}`} />
                      </button>
                      <MessageCircle size={24} className="hover:text-gray-400 cursor-pointer" />
                      <Send size={24} className="hover:text-blue-500 cursor-pointer" />
                    </div>
                    
                    <p className="text-xs font-bold mb-2">{p.likes?.length || 0} likes</p>
                    
                    {p.text && (
                      <p className="text-sm text-gray-800 mb-2">
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

          {/* RIGHT SIDEBAR (Profile Preview & Announcements) */}
          <div className="hidden lg:block sticky top-8 h-fit">
            <div 
              onClick={() => navigate("/settings")} 
              className="flex items-center gap-3 mb-8 p-3 rounded-2xl hover:bg-white cursor-pointer transition-all border border-transparent hover:border-gray-200"
            >
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold border border-orange-200 overflow-hidden shrink-0 shadow-sm">
                 {profileData?.photoURL ? <img src={profileData.photoURL} className="w-full h-full object-cover" /> : (profileData?.displayName?.[0] || user.email?.[0]).toUpperCase()}
              </div>
              <div className="min-w-0">
                 <p className="font-bold text-sm text-neutral-800 truncate">{profileData?.displayName || "User"}</p>
                 <p className="text-[11px] text-neutral-500 truncate">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-6">
              <Megaphone size={18} className="text-red-500" />
              <h3 className="font-bold text-sm text-gray-800 uppercase tracking-tight">Announcements</h3>
            </div>
            
            <div className="space-y-3">
              {feed.filter(p => p.type === "announcement" || p.type === "reminder").slice(0, 5).map((a) => (
                <div key={a.id} className="bg-white p-4 rounded-xl border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-shadow">
                   <p className="text-[9px] font-bold text-red-500 uppercase mb-1">{a.type}</p>
                   <p className="text-xs text-gray-700 leading-snug font-medium">{a.text}</p>
                </div>
              ))}
              {feed.filter(p => p.type !== "post").length === 0 && (
                <p className="text-xs text-gray-400 italic">No recent announcements.</p>
              )}
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
    // Uses the live displayName from Firestore profile for the comment
    await addComment(postId, { ...currentUser, displayName: profileData?.displayName || currentUser.displayName }, text);
    setText("");
    setComments(await getComments(postId));
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-50">
      <div className="space-y-2 mb-4 max-h-32 overflow-y-auto no-scrollbar">
        {comments.map((c) => (
          <div key={c.id} className="flex justify-between items-center group">
            <p className="text-xs">
              <span className="font-bold mr-2">{c.userName || "User"}</span>
              <span className="text-gray-600">{c.text}</span>
            </p>
            {c.userId === currentUser.uid && (
              <button 
                onClick={async () => {
                  await deleteComment(c.id);
                  setComments(comments.filter((x) => x.id !== c.id));
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={12} className="text-red-400" />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a comment…"
          className="flex-1 text-xs bg-transparent outline-none placeholder-gray-300"
        />
        <button onClick={submit} className="text-xs font-bold text-orange-500 disabled:opacity-30">Post</button>
      </div>
    </div>
  );
}