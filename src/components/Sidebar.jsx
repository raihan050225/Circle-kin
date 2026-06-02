import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../services/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { LogOut, Settings, Plus, Home, Users } from 'lucide-react'; 

import {
  createCircle,
  joinCircleByCode,
} from "../services/circle";

import {
  ensureUserExists,
  addCircleToUser,
} from "../services/user";

import { uploadToCloudinary } from "../services/cloudinary";

export default function Sidebar() {
  const navigate = useNavigate();
  const user = auth.currentUser;

  const [circles, setCircles] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const [circleName, setCircleName] = useState("");
  const [circleType, setCircleType] = useState("Family");
  const [inviteCode, setInviteCode] = useState("");

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
      <aside className="w-72 bg-[#faf7f4] border-r px-6 py-6 flex flex-col h-screen sticky top-0">
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {/* Logo Section */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-serif font-bold tracking-tight text-neutral-900">
              CircleKin
            </h1>
          </div>

          {/* Navigation */}
          <div
            onClick={() => navigate("/home")}
            className="group bg-[#e7f1ec] hover:bg-[#d9e8e1] rounded-2xl px-4 py-3 mb-8 flex items-center gap-3 cursor-pointer transition-all"
          >
            <Home size={20} className="text-emerald-700" />
            <span className="font-semibold text-emerald-900">Home Feed</span>
          </div>

          {/* Circles List */}
          <div className="flex justify-between items-center mb-4">
            <p className="text-[11px] font-bold tracking-widest text-neutral-400 uppercase">
              My Circles
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="p-1 hover:bg-neutral-200 rounded-full transition-colors"
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="space-y-3">
            {circles.map((c, i) => (
              <div
                key={c.id}
                className="flex items-center gap-3 cursor-pointer group p-1 rounded-xl hover:bg-white/50 transition-all"
              >
                <label className="relative shrink-0 cursor-pointer">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-neutral-700 overflow-hidden border-2 border-white shadow-sm"
                    style={{
                      backgroundColor: ["#fde68a", "#bbf7d0", "#ddd6fe", "#bae6fd"][i % 4],
                    }}
                  >
                    {c.photoUrl ? (
                      <img src={c.photoUrl} className="w-full h-full object-cover" alt="" />
                    ) : (
                      c.name[0].toUpperCase()
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/40 text-white text-[10px] opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-full transition-opacity">
                    Edit
                  </div>
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={(e) => handlePhotoChange(c.id, e.target.files[0])}
                  />
                </label>

                <div className="min-w-0 flex-1" onClick={() => navigate(`/circle/${c.id}`)}>
                  <p className="font-semibold text-sm text-neutral-800 truncate">{c.name}</p>
                  <p className="text-[11px] text-neutral-500 font-medium">
                    {c.members?.length || 0} members
                  </p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setShowJoin(true)}
            className="mt-8 w-full border-2 border-neutral-200 hover:border-black rounded-2xl py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Users size={18} /> Join a Circle
          </button>
        </div>

        {/* ✅ ENHANCED PROFILE SECTION WITH NAVIGATION */}
        <div className="mt-6 pt-6 border-t border-neutral-200">
          <div className="flex items-center gap-3 p-2 rounded-2xl hover:bg-white hover:shadow-sm transition-all cursor-pointer group">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold border border-orange-200 shrink-0 shadow-inner">
              {user?.photoURL ? (
                <img src={user.photoURL} className="w-full h-full rounded-full object-cover" alt="" />
              ) : (
                user?.displayName?.[0] || user?.email?.[0].toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-neutral-800 truncate">
                {user?.displayName || "User"}
              </p>
              <p className="text-[11px] text-neutral-500 truncate font-medium">
                {user?.email}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 px-2">
            {/* Added onClick for Settings navigation */}
            <button 
              onClick={() => navigate("/settings")} 
              className="flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-black transition-colors"
            >
              <Settings size={14} /> Settings
            </button>
            <button 
              onClick={handleLogout}
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-red-50 hover:text-red-600 text-neutral-400 transition-all"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Modals */}
      {showCreate && (
        <ModernModal title="Create New Circle">
          <input
            value={circleName}
            onChange={(e) => setCircleName(e.target.value)}
            placeholder="What's the name of your group?"
            className="w-full border-2 border-black rounded-xl px-4 py-3 text-sm mb-4 outline-none focus:ring-2 ring-emerald-100"
          />
          <div className="relative mb-6">
            <select
              value={circleType}
              onChange={(e) => setCircleType(e.target.value)}
              className="w-full border-2 border-black rounded-xl px-4 py-3 text-sm appearance-none outline-none font-medium bg-white"
            >
              <option>Family</option>
              <option>Friends</option>
              <option>College</option>
              <option>Club</option>
            </select>
            <span className="absolute right-4 top-4 pointer-events-none text-neutral-400 text-xs">▼</span>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowCreate(false)} className="flex-1 border-2 border-black rounded-xl py-3 text-sm font-bold hover:bg-neutral-50">Cancel</button>
            <button onClick={handleCreateCircle} className="flex-1 bg-black text-white rounded-xl py-3 text-sm font-bold hover:bg-neutral-800 shadow-lg shadow-black/20">Confirm</button>
          </div>
        </ModernModal>
      )}

      {showJoin && (
        <ModernModal title="Join with Code">
          <input
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="Enter the 6-digit code"
            className="w-full border-2 border-black rounded-xl px-4 py-3 text-sm mb-6 outline-none text-center text-lg font-mono tracking-widest uppercase"
          />
          <div className="flex gap-3">
            <button onClick={() => setShowJoin(false)} className="flex-1 border-2 border-black rounded-xl py-3 text-sm font-bold hover:bg-neutral-50">Cancel</button>
            <button onClick={handleJoinCircle} className="flex-1 bg-black text-white rounded-xl py-3 text-sm font-bold hover:bg-neutral-800 shadow-lg shadow-black/20">Join Circle</button>
          </div>
        </ModernModal>
      )}
    </>
  );
}

function ModernModal({ title, children }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
        <h2 className="text-xl font-serif font-bold mb-6 text-neutral-900">{title}</h2>
        {children}
      </div>
    </div>
  );
}