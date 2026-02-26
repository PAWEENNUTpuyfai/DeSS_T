import { Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import GuestRoute from "./components/GuestRoute";
import LandingPage from "./components/LandingPage";
import MobileWarning from "./components/MobileWarning";
import "../style/App.css";
import GuestSetup from "./pages/GuestSetup";
import GuestDecision from "./components/GuestDecision";
import Outputpage from "./pages/Outputpage";
import UserWorkspace from "./pages/UserWorkspace";
import WorkspaceCommunity from "./pages/WorkspaceCommunity";
import ConfigurationDetailPage from "./pages/ConfigurationDetail";
import EditScenarioPage from "./pages/EditScenario";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <MobileWarning>
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
            <Route
              path="/configuration/:configurationId"
              element={
                <ProtectedRoute>
                  {" "}
                  <ConfigurationDetailPage />{" "}
                </ProtectedRoute>
              }
            />
            <Route
              path="/scenario/:scenarioId"
              element={
                <ProtectedRoute>
                  {" "}
                  <EditScenarioPage />{" "}
                </ProtectedRoute>
              }
            />
            <Route
              path="/user/workspace/community"
              element={
                <ProtectedRoute>
                  <WorkspaceCommunity />
                </ProtectedRoute>
              }
            />
            <Route
              path="/guest/decision"
              element={
                <GuestRoute>
                  <GuestDecision />
                </GuestRoute>
              }
            />
            <Route
              path="/guest/setup"
              element={
                <GuestRoute>
                  <GuestSetup />
                </GuestRoute>
              }
            />
            <Route path="/output" element={<Outputpage />} />
          </Routes>
          </div>
        </MobileWarning>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
