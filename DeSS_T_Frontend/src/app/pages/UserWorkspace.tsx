import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { userLogin as userLoginAPI } from "../../utility/api/userLogin";
import ConfigurationMap from "../components/Configuration/ConfigurationMap";
import type { User } from "../models/User";

interface GoogleUserInfo {
  email?: string;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  sub?: string;
  iat?: number;
  exp?: number;
}

export default function UserWorkspace() {
  const { user, logout, login: authLogin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Configuration creation states
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configName, setConfigName] = useState("");
  const [showConfigMap, setShowConfigMap] = useState(false);

  useEffect(() => {
    // If user is already in AuthContext, no need to verify again
    if (user) {
      setLoading(false);
      return;
    }

    // Otherwise, verify user with backend
    const loginUser = async () => {
      try {
        const storedUser = localStorage.getItem("user");
        const storedToken = localStorage.getItem("googleToken");

        if (!storedUser || !storedToken) {
          setError("No login information found");
          setLoading(false);
          return;
        }

        const googleUser: GoogleUserInfo = JSON.parse(storedUser);

        // Prepare user data to send to backend
        const userData: User = {
          google_id: googleUser.sub || "",
          name: googleUser.name || "",
          email: googleUser.email || "",
          picture_url: googleUser.picture || "",
          access_token: storedToken,
          refresh_token: "",
          token_expires_at: new Date(
            (googleUser.exp || 0) * 1000,
          ).toISOString(),
          last_login: new Date().toISOString(),
          created_at: new Date((googleUser.iat || 0) * 1000).toISOString(),
        };

        // POST to backend and get user data back
        const verifiedUser = await userLoginAPI(userData);
        console.log("User verified:", verifiedUser);

        // Save user data to auth context
        authLogin(verifiedUser);
        setLoading(false);
      } catch (err) {
        console.error("Login failed:", err);
        setError("Failed to verify login");
        setLoading(false);
      }
    };

    loginUser();
  }, [user, authLogin]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="flex h-screen justify-center items-center bg-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
          <p>Verifying your login information...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex h-screen justify-center items-center bg-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Error</h1>
          <p>{error || "Failed to load user information"}</p>
          <button
            onClick={handleLogout}
            className="mt-4 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Show ConfigurationMap if user clicked Next from modal
  if (showConfigMap && configName) {
    return <ConfigurationMap usermode="user" configurationName={configName} />;
  }

  return (
    <div className="flex h-screen justify-center items-center bg-white">
      <div className="w-full max-w-4xl p-8">
        <div className="text-center mb-8">
          <img
            src="/DeSS-T_logo.png"
            alt="DeSS-T Logo"
            className="h-16 mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-gray-800">
            Welcome, {user.name}!
          </h1>
          <p className="text-gray-600 mt-2">Your Workspace</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200 mb-6">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b">
            {user.picture_url && (
              <img
                src={user.picture_url}
                alt="Profile"
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                className="w-16 h-16 rounded-full border-2 border-blue-500"
              />
            )}
            <div>
              <h2 className="text-xl font-semibold">{user.name}</h2>
              <p className="text-gray-600">{user.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">
                Your Scenarios
              </h3>
              <p className="text-gray-600 text-sm">
                {user.user_scenarios?.length || 0} scenarios
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">
                Your Configurations
              </h3>
              <p className="text-gray-600 text-sm">
                {user.user_configurations?.length || 0} configurations
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">
                Public Scenarios
              </h3>
              <p className="text-gray-600 text-sm">
                {user.public_scenarios?.length || 0} published
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">
                Public Configurations
              </h3>
              <p className="text-gray-600 text-sm">
                {user.public_configurations?.length || 0} published
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate("/guest/setup")}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
          >
            Create New Scenario
          </button>
          <button
            onClick={() => setShowConfigModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
          >
            Create Configuration
          </button>
          <button
            onClick={handleLogout}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-6 rounded-lg transition duration-200"
          >
            Logout
          </button>
        </div>

        {/* Configuration Name Modal */}
        {showConfigModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Create New Configuration
              </h2>
              <p className="text-gray-600 mb-6">
                Please enter a name for your configuration
              </p>
              <input
                type="text"
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                placeholder="Configuration name"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-6 focus:outline-none focus:border-purple-500"
                autoFocus
              />
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowConfigModal(false);
                    setConfigName("");
                  }}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-6 rounded-lg transition duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (configName.trim()) {
                      setShowConfigModal(false);
                      setShowConfigMap(true);
                    } else {
                      alert("Please enter a configuration name");
                    }
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
