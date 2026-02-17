import { Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LandingPage from "./components/LandingPage";
import "../style/App.css";
import GuestSetup from "./pages/GuestSetup";
import GuestDecision from "./components/GuestDecision";
import Outputpage from "./pages/Outputpage";
import UserWorkspace from "./pages/UserWorkspace";

const GOOGLE_CLIENT_ID =
  "466533293342-57tvguaj5oupvsg4bbcac7ib7jmuia3p.apps.googleusercontent.com";
  // "466533293342-mk71aaaclge179pcpcis19sdjd1303mp.apps.googleusercontent.com"; //deployment

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <div className="main-container">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route
              path="/user/workspace"
              element={
                <ProtectedRoute>
                  <UserWorkspace />
                </ProtectedRoute>
              }
            />
            <Route path="/guest/decision" element={<GuestDecision />} />
            <Route path="/guest/setup" element={<GuestSetup />} />
            <Route path="/output" element={<Outputpage />} />
          </Routes>
        </div>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
