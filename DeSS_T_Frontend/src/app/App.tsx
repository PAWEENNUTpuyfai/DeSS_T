import { Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import LandingPage from "./components/LandingPage";
import "../style/App.css";
import GuestSetup from "./pages/GuestSetup";
import GuestDecision from "./components/GuestDecision";
import Outputpage from "./pages/Outputpage";
import UserLogin from "./pages/UserLogin";

const GOOGLE_CLIENT_ID =
  "466533293342-57tvguaj5oupvsg4bbcac7ib7jmuia3p.apps.googleusercontent.com";

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="main-container">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/user/login" element={<UserLogin />} />
          <Route path="/guest/decision" element={<GuestDecision />} />
          <Route path="/guest/setup" element={<GuestSetup />} />
          <Route path="/output" element={<Outputpage />} />
        </Routes>
      </div>
    </GoogleOAuthProvider>
  );
}
