import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../services/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { LogOut, Settings, Plus, Home, Users, Camera, Hash } from 'lucide-react'; 

import {
  createCircle,
  joinCircleByCode,
} from "../services/circle";

import {
  ensureUserExists,
  addCircleToUser,
} from "../services/user";

import { uploadToCloudinary } from "../services/cloudinary";

// Premium gradients for default circle avatars
const AVATAR_GRADIENTS = [
  "from-amber-200 to-orange-100 text-amber-700",
  "from-emerald-200 to-teal-100 text-emerald-700",
  "from-indigo-200 to-blue-100 text-indigo-700",
  "from-rose-200 to-pink-100 text-rose-700",
];

export default function Sidebar() {
  const navigate = useNavigate();
  const user = auth.currentUser;

  const [circles, setCircles] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const [circleName, setCircleName] = useState("");
  const [circleType, setCircleType] = useState("Family");
  const [inviteCode, setInviteCode] = useState("");
  const [profileData, setProfileData] = useState(null);

  // Load User Data and Circles
  useEffect(() => {
    if (!user) return;

    const load = async () => {
      await ensureUserExists(user);
      const userSnap = await getDoc(doc(db, "users", user.uid));
      const circleIds = userSnap.data()?.circles || [];
      const loaded = [];

      for (const id of circleIds) {
        const snap = await getDoc(doc(db, "circles", id));
        if (snap.exists()) {
          loaded.push({ id: snap.id, ...snap.data() });
        }
      }
      setCircles(loaded);
    };

    load();

    
  }, [user]);


  const handleCreateCircle = async () => {
    if (!circleName.trim()) return;
    const invite = Math.random().toString(36).slice(2, 8).toUpperCase();

    const circleId = await createCircle({
      name: circleName,
      type: circleType,
      inviteCode: invite,
      adminId: user.uid,
      members: [user.uid],
      createdAt: Date.now(),
    });

    await addCircleToUser(user.uid, circleId);
    setShowCreate(false);
    setCircleName("");
    navigate(`/circle/${circleId}`);
  };

  const handleJoinCircle = async () => {
    if (!inviteCode.trim()) return;
    const circle = await joinCircleByCode(inviteCode, user.uid);
    await addCircleToUser(user.uid, circle.id);
    setShowJoin(false);
    setInviteCode("");
    navigate(`/circle/${circle.id}`);
  };

  const handlePhotoChange = async (circleId, file) => {
    if (!file) return;
    const uploaded = await uploadToCloudinary(file);
    await updateDoc(doc(db, "circles", circleId), { photoUrl: uploaded.url });

    setCircles(circles.map((c) => 
      c.id === circleId ? { ...c, photoUrl: uploaded.url } : c
    ));
  };

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/");
  };

  if (!user) return null;

  return (
    <>
      <aside className="w-[300px] bg-white/40 backdrop-blur-2xl border-r border-white/60 px-6 py-8 flex flex-col h-screen sticky top-0 shadow-[4px_0_24px_rgb(0,0,0,0.02)] z-10">
        <div className="flex-1 overflow-y-auto no-scrollbar">
          
          {/* Logo Section */}
          <div className="flex justify-between items-center mb-10">
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-br from-slate-900 to-slate-600 bg-clip-text text-transparent">
              CircleKin
            </h1>
          </div>

          {/* Navigation */}
          <div
            onClick={() => navigate("/home")}
            className="group bg-white/60 border border-white hover:bg-white rounded-2xl px-4 py-3.5 mb-10 flex items-center gap-3 cursor-pointer transition-all shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_4px_15px_rgb(0,0,0,0.05)]"
          >
            <div className="p-1.5 rounded-xl bg-indigo-50 text-indigo-500 group-hover:scale-110 transition-transform duration-300">
              <Home size={18} />
            </div>
            <span className="font-semibold text-slate-700">Home Feed</span>
          </div>

          {/* Circles List Header */}
          <div className="flex justify-between items-center mb-4 px-1">
            <p className="text-xs font-bold tracking-wider text-slate-400 uppercase">
              My Circles
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="p-1.5 hover:bg-white rounded-full text-slate-400 hover:text-slate-800 transition-colors shadow-sm border border-transparent hover:border-white/50"
            >
              <Plus size={16} strokeWidth={2.5} />
            </button>
          </div>

          {/* Circles Mapping */}
          <div className="space-y-2">
            {circles.map((c, i) => (
              <div
                key={c.id}
                className="flex items-center gap-3 cursor-pointer group p-2 rounded-2xl hover:bg-white/60 hover:shadow-sm border border-transparent hover:border-white transition-all"
              >
                <label className="relative shrink-0 cursor-pointer">
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-lg overflow-hidden border-2 border-white shadow-sm bg-gradient-to-br ${AVATAR_GRADIENTS[i % 4]}`}
                  >
                    {c.photoUrl ? (
                      <img src={c.photoUrl} className="w-full h-full object-cover" alt="" />
                    ) : (
                      c.name[0].toUpperCase()
                    )}
                  </div>
                  <div className="absolute inset-0 bg-slate-900/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-full transition-opacity backdrop-blur-sm">
                    <Camera size={14} />
                  </div>
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={(e) => handlePhotoChange(c.id, e.target.files[0])}
                  />
                </label>

                <div className="min-w-0 flex-1" onClick={() => navigate(`/circle/${c.id}`)}>
                  <p className="font-bold text-sm text-slate-800 truncate">{c.name}</p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {c.members?.length || 0} members
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Join Button */}
          <button
            onClick={() => setShowJoin(true)}
            className="mt-6 w-full bg-white/50 border border-white hover:bg-white rounded-2xl py-3.5 text-sm font-semibold text-slate-600 flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm hover:shadow-md"
          >
            <Hash size={16} className="text-slate-400" /> Join with Code
          </button>
        </div>

      {/* PROFILE SECTION */}
        <div className="mt-6 pt-6 border-t border-white/50">
          <div className="bg-white/60 border border-white rounded-2xl p-2.5 flex items-center justify-between shadow-[0_4px_15px_rgb(0,0,0,0.02)] transition-all hover:shadow-[0_4px_15px_rgb(0,0,0,0.05)]">
            
            {/* Avatar Only */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-100 to-orange-50 flex items-center justify-center text-orange-600 font-bold border border-white shrink-0 shadow-sm overflow-hidden">
              {user?.photoURL ? (
                <img src={user.photoURL} className="w-full h-full object-cover" alt="Profile" />
              ) : (
                (user?.displayName?.[0] || user?.email?.[0] || "U").toUpperCase()
              )}
            </div>

            {/* Action Icons */}
            <div className="flex items-center gap-1.5 pr-1">
              <button 
                onClick={() => navigate("/settings")} 
                className="p-2 text-slate-400 hover:bg-white hover:text-slate-700 rounded-xl transition-all shadow-sm border border-transparent hover:border-slate-100"
                title="Settings"
              >
                <Settings size={18} />
              </button>
              <button 
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all shadow-sm border border-transparent hover:border-red-100"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
            
          </div>
        </div>
      </aside>

      {/* Modals */}
      {showCreate && (
        <ModernModal title="Create New Circle" onClose={() => setShowCreate(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">Circle Name</label>
              <input
                value={circleName}
                onChange={(e) => setCircleName(e.target.value)}
                placeholder="e.g. The Smiths, College Crew"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-800 placeholder-slate-400"
              />
            </div>
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">Category</label>
              <select
                value={circleType}
                onChange={(e) => setCircleType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm appearance-none outline-none font-medium text-slate-700 focus:bg-white focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
              >
                <option>Family</option>
                <option>Friends</option>
                <option>College</option>
                <option>Club</option>
                <option>Custom</option>
              </select>
              <span className="absolute right-4 top-[34px] pointer-events-none text-slate-400 text-xs">▼</span>
            </div>
            <div className="flex gap-3 mt-6 pt-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 bg-white border border-slate-200 rounded-xl py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={handleCreateCircle} className="flex-1 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl py-3 text-sm font-bold hover:shadow-lg hover:shadow-slate-900/20 transition-all active:scale-[0.98]">Create</button>
            </div>
          </div>
        </ModernModal>
      )}

      {showJoin && (
        <ModernModal title="Join a Circle" onClose={() => setShowJoin(false)}>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1 text-center">Enter Invite Code</label>
            <input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="XXXXXX"
              maxLength={6}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-center text-xl font-mono tracking-[0.5em] uppercase outline-none focus:bg-white focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-800 placeholder-slate-300 mb-6"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowJoin(false)} className="flex-1 bg-white border border-slate-200 rounded-xl py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={handleJoinCircle} disabled={!inviteCode.trim()} className="flex-1 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl py-3 text-sm font-bold hover:shadow-lg hover:shadow-slate-900/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100">Join Now</button>
            </div>
          </div>
        </ModernModal>
      )}
    </>
  );
}

// Upgraded Glassmorphic Modal
function ModernModal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Click-away backdrop */}
      <div className="absolute inset-0" onClick={onClose} />
      
      {/* Modal Card */}
      <div className="relative bg-white/90 backdrop-blur-2xl w-full max-w-sm rounded-[24px] p-8 shadow-[0_20px_60px_rgb(0,0,0,0.1)] border border-white animate-in zoom-in-95 duration-200">
        <h2 className="text-xl font-bold mb-6 text-slate-800 text-center tracking-tight">{title}</h2>
        {children}
      </div>
    </div>
  );
}