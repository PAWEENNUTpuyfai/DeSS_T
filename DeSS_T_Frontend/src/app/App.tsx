import { Routes, Route, Link } from "react-router-dom";
// import PowerPage from "./components/PowerPage";
import LandingPage from "./components/LandingPage";
import "../style/App.css";
import GuestSetup from "./pages/GuestSetup";
import GuestDecision from "./components/GuestDecision";
import Outputpage from "./pages/Outputpage";

export default function App() {
  return (
    <div className="main-container">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/guest/decision" element={<GuestDecision />} />
        <Route path="/guest/setup" element={<GuestSetup />} />
        <Route path="/guest/setup" element={<GuestSetup />} />
        <Route path="/output" element={<Outputpage />} />
      </Routes>
    </div>
  );
}
