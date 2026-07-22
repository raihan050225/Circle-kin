import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { User, Shield, Bell, Key, ChevronRight, Camera, Loader2, Check } from "lucide-react";

import { auth, db } from "../services/firebase";
import { updateProfile } from "firebase/auth";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { uploadToCloudinary } from "../services/cloudinary";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("account");
  const user = auth.currentUser;

  // --- Profile State ---
  const [displayName, setDisplayName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // --- Preferences State ---
  const [privacy, setPrivacy] = useState({
    requireInvite: true,
    hideOnline: false,
    disableDownloads: true,
  });
  
  const [notifications, setNotifications] = useState({
    newPosts: true,
    comments: true,
    newMembers: false,
    emailDigest: false,
  });

  // 1. REAL-TIME LISTENER: Instantly loads and watches your Firestore data
  useEffect(() => {
    if (!user) return;
    
    const unsub = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setDisplayName(data.displayName || "");
        setPhotoURL(data.photoURL || "");
        
        // Load preferences if they exist in DB
        if (data.privacy) setPrivacy(data.privacy);
        if (data.notifications) setNotifications(data.notifications);
      }
    });
    
    return () => unsub();
  }, [user]);

  // 2. HANDLE IMAGE UPLOAD (Saves immediately to DB)
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    setSaving(true);
    try {
      const uploaded = await uploadToCloudinary(file);
      
      // Update Auth Profile
      await updateProfile(user, { photoURL: uploaded.url });
      
      // Update Firestore (This instantly updates the Sidebar and Home)
      await updateDoc(doc(db, "users", user.uid), { photoURL: uploaded.url });
      
      setMessage("Profile photo updated!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Upload failed", error);
      setMessage("Failed to upload image.");
    } finally {
      setSaving(false);
    }
  };

  // 3. HANDLE NAME SAVE
  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user, { displayName });
      await updateDoc(doc(db, "users", user.uid), { displayName });
      
      setMessage("Profile name updated!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error(err);
      setMessage("Error updating profile.");
    } finally {
      setSaving(false);
    }
  };

  // 4. HANDLE TOGGLES (Saves immediately to DB)
  const handleToggle = async (category, key, currentValue) => {
    if (!user) return;
    const newValue = !currentValue;
    
    try {
      if (category === 'privacy') {
        const updated = { ...privacy, [key]: newValue };
        setPrivacy(updated);
        await updateDoc(doc(db, "users", user.uid), { privacy: updated });
      } else {
        const updated = { ...notifications, [key]: newValue };
        setNotifications(updated);
        await updateDoc(doc(db, "users", user.uid), { notifications: updated });
      }
    } catch (error) {
      console.error("Error saving preference", error);
    }
  };

  const tabs = [
    { id: "account", label: "Account Overview", icon: User },
    { id: "privacy", label: "Privacy & Security", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50/50 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-50/40 via-slate-50/50 to-white flex justify-center py-8 px-4 font-sans">
        <div className="max-w-[900px] w-full grid grid-cols-1 md:grid-cols-12 gap-8">
          
          <div className="md:col-span-12 mb-2">
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Settings</h1>
            <p className="text-slate-500 mt-1">Manage your identity and private circle preferences.</p>
          </div>

          {/* Sidebar Tabs */}
          <div className="md:col-span-4 space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between p-4 rounded-[20px] transition-all duration-200 ${
                    isActive ? "bg-white border-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] text-indigo-600" : "bg-transparent border-transparent hover:bg-white/50 text-slate-600 hover:text-slate-800"
                  } border`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={20} className={isActive ? "text-indigo-500" : "text-slate-400"} />
                    <span className="font-semibold text-sm">{tab.label}</span>
                  </div>
                  {isActive && <ChevronRight size={16} className="text-indigo-400" />}
                </button>
              );
            })}
          </div>

          {/* Settings Content */}
          <div className="md:col-span-8">
            <div className="bg-white/80 backdrop-blur-xl border border-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] min-h-[500px]">
              
              {/* ACCOUNT TAB */}
              {activeTab === "account" && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <h2 className="text-xl font-bold text-slate-800 mb-6">Account Overview</h2>
                  
                  <div className="flex items-center gap-6 pb-8 border-b border-slate-100">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-orange-100 to-orange-50 flex items-center justify-center text-orange-600 text-3xl font-bold border-4 border-white shadow-sm overflow-hidden">
                        {photoURL ? (
                           <img src={photoURL} className="w-full h-full object-cover" alt="Profile" />
                        ) : (
                           (displayName?.[0] || user?.email?.[0] || "U").toUpperCase()
                        )}
                      </div>
                      <label className="absolute bottom-0 right-0 bg-slate-900 text-white p-2 rounded-full cursor-pointer hover:scale-110 transition-transform shadow-lg">
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                        <input type="file" hidden accept="image/*" onChange={handleImageUpload} disabled={saving} />
                      </label>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">{displayName || "User"}</h3>
                      <p className="text-sm text-slate-500">{user?.email}</p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">Display Name</label>
                      <input 
                        type="text" 
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Your Display Name" 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-indigo-500/50 transition-all text-slate-800" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">Email Address (Read Only)</label>
                      <input 
                        type="email" 
                        disabled 
                        value={user?.email || ""} 
                        className="w-full bg-slate-100/50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none text-slate-500 cursor-not-allowed" 
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex items-center gap-4">
                    <button 
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="bg-gradient-to-r from-slate-900 to-slate-800 text-white font-semibold px-6 py-2.5 rounded-xl text-sm hover:shadow-lg hover:shadow-slate-900/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
                    >
                      {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                      Save Changes
                    </button>
                    {message && <span className="text-sm font-semibold text-emerald-500 animate-in fade-in">{message}</span>}
                  </div>
                </div>
              )}

              {/* PRIVACY TAB */}
              {activeTab === "privacy" && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <h2 className="text-xl font-bold text-slate-800 mb-6">Privacy & Security</h2>
                  
                  <div className="space-y-6">
                    <SettingToggle 
                      title="Require Invite Approval" 
                      description="Users must be approved before joining circles you administer." 
                      checked={privacy.requireInvite}
                      onChange={() => handleToggle('privacy', 'requireInvite', privacy.requireInvite)}
                    />
                    <SettingToggle 
                      title="Hide Online Status" 
                      description="Don't show when you are currently active in the app." 
                      checked={privacy.hideOnline}
                      onChange={() => handleToggle('privacy', 'hideOnline', privacy.hideOnline)}
                    />
                    <SettingToggle 
                      title="Disable Media Downloads" 
                      description="Prevent circle members from downloading your photos and videos." 
                      checked={privacy.disableDownloads}
                      onChange={() => handleToggle('privacy', 'disableDownloads', privacy.disableDownloads)}
                    />
                  </div>

                  <div className="pt-8 mt-8 border-t border-slate-100">
                    <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Account Security</h3>
                    <button className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-left">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg text-slate-600"><Key size={18} /></div>
                        <div>
                          <p className="font-semibold text-sm text-slate-800">Change Password</p>
                          <p className="text-xs text-slate-500">Update your login credentials</p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-slate-400" />
                    </button>
                  </div>
                </div>
              )}

              {/* NOTIFICATIONS TAB */}
              {activeTab === "notifications" && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <h2 className="text-xl font-bold text-slate-800 mb-6">Notification Preferences</h2>
                  
                  <div className="space-y-6">
                    <SettingToggle 
                      title="New Circle Posts" 
                      description="Get notified when someone posts in your circles." 
                      checked={notifications.newPosts}
                      onChange={() => handleToggle('notifications', 'newPosts', notifications.newPosts)}
                    />
                    <SettingToggle 
                      title="Comments on my posts" 
                      description="Get notified when someone replies to your content." 
                      checked={notifications.comments}
                      onChange={() => handleToggle('notifications', 'comments', notifications.comments)}
                    />
                    <SettingToggle 
                      title="New Member Alerts" 
                      description="Receive an alert when a new member joins your circle." 
                      checked={notifications.newMembers}
                      onChange={() => handleToggle('notifications', 'newMembers', notifications.newMembers)}
                    />
                    <SettingToggle 
                      title="Email Digest" 
                      description="Receive a weekly summary of missed moments." 
                      checked={notifications.emailDigest}
                      onChange={() => handleToggle('notifications', 'emailDigest', notifications.emailDigest)}
                    />
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

// Reusable Controlled Toggle Component
function SettingToggle({ title, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="font-semibold text-sm text-slate-800">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <button 
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${checked ? 'bg-indigo-500' : 'bg-slate-200'}`}
      >
        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}