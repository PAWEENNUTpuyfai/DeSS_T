import { useMemo, useState, useEffect } from "react";
import { useAuth } from "../contexts/useAuth";
import { useNavigate } from "react-router-dom";
import { userLogin as userLoginAPI } from "../../utility/api/userLogin";
import ConfigurationMap from "../components/Configuration/ConfigurationMap";
import Nav from "../components/NavBar";
import type { User } from "../models/User";
import "../../style/Workspace.css";

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
  const [activeTab, setActiveTab] = useState<"project" | "config">(
    "project",
  );

  // Configuration creation states
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configName, setConfigName] = useState("");
  const [showConfigMap, setShowConfigMap] = useState(false);

  const cards = useMemo(() => {
    if (!user) {
      return [];
    }

    if (activeTab === "config") {
      const configs = user.user_configurations ?? [];
      const mockConfigs = [
        {
          id: "mock-config-1",
          name: "Chiang Mai AM Peak",
          date: new Date().toISOString(),
          imageUrl: "",
        },
        {
          id: "mock-config-2",
          name: "Old Town Midday",
          date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
          imageUrl: "",
        },
        {
          id: "mock-config-3",
          name: "Airport Corridor",
          date: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
          imageUrl: "",
        },
      ];

      if (configs.length === 0) {
        return mockConfigs;
      }

      return configs.map((config) => ({
        id: config.user_configuration_id,
        name: config.name,
        date: config.modify_date,
        imageUrl: config.cover_image?.path_file,
      }));
    }

    return (user.user_scenarios ?? []).map((scenario) => ({
      id: scenario.user_scenario_id,
      name: scenario.name,
      date: scenario.modify_date,
      imageUrl: scenario.cover_image?.path_file,
    }));
  }, [user, activeTab]);

  const formatDate = (date?: string) => {
    if (!date) {
      return "";
    }

    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) {
      return "";
    }

    return `${parsed.toLocaleDateString("en-GB")} ${parsed.toLocaleTimeString(
      "en-GB",
      {
        hour: "2-digit",
        minute: "2-digit",
      },
    )}`;
  };

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
    <div className="workspace-page">
      <Nav
        usermode="user"
        inpage="Workspace"
        userAvatarUrl={user.picture_url}
        userName={user.name}
      />
      <div className="workspace-body">
        <aside className="workspace-sidebar">
          <button
            className={`workspace-tab ${
              activeTab === "project" ? "workspace-tab-active" : ""
            }`}
            onClick={() => setActiveTab("project")}
          >
            My Project
          </button>
          <button
            className={`workspace-tab ${
              activeTab === "config" ? "workspace-tab-active" : ""
            }`}
            onClick={() => {
              setActiveTab("config");
              setShowConfigModal(false);
            }}
          >
            Configuration Data
          </button>
          <div className="workspace-sidebar-footer">
            <button className="workspace-logout" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </aside>

        <main className="workspace-main">
          <div className="workspace-header">
            <div className="workspace-title">
              <span className="workspace-title-bar" />
              <h2>{activeTab === "config" ? "Configuration Data" : "My Project"}</h2>
            </div>
            <div className="workspace-filters">
              <button className="workspace-filter">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M3 5H21M6 12H18M10 19H14"
                    stroke="#81069E"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                All Files
                <span className="workspace-filter-caret" />
              </button>
              <button className="workspace-filter">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M8 6L4 10L8 14"
                    stroke="#81069E"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M4 10H16"
                    stroke="#81069E"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M16 18H20"
                    stroke="#81069E"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                Date Asc
                <span className="workspace-filter-caret" />
              </button>
            </div>
          </div>

          <div className="workspace-cards">
            {cards.length === 0 ? (
              <div className="workspace-empty">
                No items yet. Create a new one to get started.
              </div>
            ) : (
              cards.map((card) => (
                <div key={card.id} className="workspace-card">
                  <div
                    className="workspace-card-thumb"
                    style={
                      card.imageUrl
                        ? { backgroundImage: `url(${card.imageUrl})` }
                        : undefined
                    }
                  />
                  <div className="workspace-card-body">
                    <h3>{card.name}</h3>
                    {card.date && (
                      <p className="workspace-card-date">
                        {formatDate(card.date)}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <button
            className="workspace-new-btn"
            onClick={() =>
              activeTab === "config"
                ? setShowConfigModal(true)
                : navigate("/guest/setup")
            }
          >
            + {activeTab === "config" ? "New Configuration" : "New Project"}
          </button>
        </main>
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
  );
}
