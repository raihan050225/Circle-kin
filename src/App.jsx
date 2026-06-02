import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Circle from "./pages/Circle";
import Events from "./pages/Events";
import Login from "./pages/Login";
import ProfileSettings from "./pages/ProfileSettings"; // Ensure this matches the filename

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/circle/:circleId" element={<Circle />} />
        <Route path="/settings" element={<ProfileSettings />} />
        <Route path="/events/:circleId/:eventId" element={<Events />} />
      </Routes>
    </BrowserRouter>
  );
}