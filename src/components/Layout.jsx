import Sidebar from "./Sidebar";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-[#f8f5f2] flex">
      {/* SIDEBAR ALWAYS HERE */}
      <Sidebar />

      {/* PAGE CONTENT CHANGES */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
