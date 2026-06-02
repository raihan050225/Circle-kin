import React, { useState, useEffect } from "react";
import { auth, db } from "../services/firebase";
import { doc, getDoc } from "firebase/firestore";
import { uploadToCloudinary } from "../services/cloudinary";
import { updateUserProfile } from "../services/user";
import { useNavigate } from "react-router-dom";

// ✅ All icons are now defined and imported
import { ArrowLeft, Camera, Check, Loader2, User } from "lucide-react"; 

export default function ProfileSettings() {
  const navigate = useNavigate();
  const user = auth.currentUser;
  
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [message, setMessage] = useState("");

  // Load existing data from Firestore users/{uid}
  useEffect(() => {
    if (!user) return;
    const loadUserData = async () => {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const data = snap.data();
        setDisplayName(data.displayName || "");
        setPhotoURL(data.photoURL || "");
      }
    };
    loadUserData();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Updates the Firestore document
      await updateUserProfile(user.uid, {
        displayName: displayName,
        photoURL: photoURL
      });
      
      setMessage("Profile updated! Refresh to see changes.");
      setTimeout(() => navigate("/home"), 1500); // Redirect back after success
    } catch (err) {
      console.error(err);
      setMessage("Error updating profile.");
    }
    setLoading(false);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      const uploaded = await uploadToCloudinary(file);
      setPhotoURL(uploaded.url); // Show the new image immediately
    } catch (error) {
      console.error("Upload failed", error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#faf7f4] p-8 flex justify-center">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-sm border border-neutral-100 p-10 h-fit">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-neutral-100 rounded-full transition-all"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-3xl font-serif font-bold text-neutral-900">Profile Settings</h1>
        </div>

        <div className="space-y-8">
          {/* Profile Picture Section */}
          <div className="flex flex-col items-center">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-md bg-orange-50 flex items-center justify-center text-4xl font-bold text-orange-600">
                {photoURL ? (
                  <img src={photoURL} className="w-full h-full object-cover" alt="Profile" />
                ) : (
                  <User size={48} />
                )}
              </div>
              <label className="absolute bottom-0 right-0 bg-black text-white p-2 rounded-full cursor-pointer hover:scale-110 transition-transform shadow-lg">
                <Camera size={18} />
                <input type="file" hidden accept="image/*" onChange={handleImageUpload} />
              </label>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2 ml-1">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-neutral-50 border-2 border-neutral-100 rounded-2xl px-6 py-4 outline-none focus:border-black transition-all"
                placeholder="Enter your name"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-black text-white rounded-2xl py-4 font-bold flex items-center justify-center gap-2 hover:bg-neutral-800 transition-all disabled:bg-neutral-300"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
            Save Changes
          </button>
          
          {message && <p className="text-center text-sm font-bold text-emerald-600">{message}</p>}
        </div>
      </div>
    </div>
  );
}