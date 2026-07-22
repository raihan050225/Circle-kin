import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Circle from "./pages/Circle";
import Events from "./pages/Events";
import Login from "./pages/Login";
import Settings from "./pages/Settings"; // The new private app settings page
import ProfileSettings from "./pages/ProfileSettings"; // Your profile edit page

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/circle/:circleId" element={<Circle />} />
        
        {/* Wire up the two distinct settings routes */}
        <Route path="/settings" element={<Settings />} /> 
        <Route path="/profile" element={<ProfileSettings />} /> 
        
        <Route path="/events/:circleId/:eventId" element={<Events />} />
      </Routes>
    </BrowserRouter>
  );
}