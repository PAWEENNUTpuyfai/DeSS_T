import { useMemo, useState, useEffect } from "react";
import { useAuth } from "../contexts/useAuth";
import { useNavigate } from "react-router-dom";
import ConfigurationMap from "../components/Configuration/ConfigurationMap";
import Scenario from "../components/Scenario";
import UserNavBar from "../components/UserNavBar";
import CustomDropdown from "../components/CustomDropdown";
import type { UserConfiguration } from "../models/User";
import type { ConfigurationDetail } from "../models/Configuration";
import {
  getUserConfigurations,
  getConfigurationDetail,
} from "../../utility/api/configuration";
import "../../style/Workspace.css";
import { IMG_BASE_URL } from "../../utility/config";

export default function UserWorkspace() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"project" | "config">("project");
  const [userConfigurations, setUserConfigurations] = useState<
    UserConfiguration[]
  >([]);
  const [configsError, setConfigsError] = useState<string | null>(null);

  // Configuration creation states
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configName, setConfigName] = useState("");
  const [showConfigMap, setShowConfigMap] = useState(false);

  // Project creation states
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [selectedConfigName, setSelectedConfigName] = useState(
    "Select configuration",
  );

  // Scenario states
  const [showScenario, setShowScenario] = useState(false);
  const [scenarioConfig, setScenarioConfig] =
    useState<ConfigurationDetail | null>(null);
  const [scenarioLoading, setScenarioLoading] = useState(false);

  // Filter states
  const [fileFilter, setFileFilter] = useState("All Files");
  const [sortFilter, setSortFilter] = useState("Date Asc");
  const fileFilterOptions = ["All Files", "Public", "Private"];
  const sortFilterOptions = ["Date Asc", "Date Desc", "Name"];

  const configOptions = useMemo(() => {
    if (!user) {
      return [];
    }

    return userConfigurations.map((config) => ({
      id: config.user_configuration_id,
      detail_id: config.configuration_detail_id,
      name: config.name,
      date: config.modify_date,
      imageUrl: config.cover_image?.path_file,
    }));
  }, [user, userConfigurations]);

  const configOptionNames = useMemo(
    () => configOptions.map((option) => option.name),
    [configOptions],
  );

  const cards = useMemo(() => {
    if (!user) {
      return [];
    }

    if (activeTab === "config") {
      return userConfigurations.map((config) => ({
        id: config.user_configuration_id,
        name: config.name,
        date: config.modify_date,
        imageUrl: config.cover_image?.path_file,
        detail_id: config.configuration_detail_id,
      }));
    }

    return (user.user_scenarios ?? []).map((scenario) => ({
      id: scenario.user_scenario_id,
      name: scenario.name,
      date: scenario.modify_date,
      imageUrl: scenario.cover_image?.path_file,
      detail_id: scenario.scenario_detail_id,
    }));
  }, [user, userConfigurations, activeTab]);

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
    console.log("🔵 useEffect triggered - user:", user);

    // If user is already in AuthContext, no need to verify again
    if (user) {
      console.log("✓ User already in AuthContext, skipping login");
      setLoading(false);
      return;
    }

    // If no user, redirect to login
    console.log("❌ No user in context, redirecting to home...");
    setError("User not authenticated");
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const userId = user.google_id || user.email;
    if (!userId) {
      setConfigsError("Missing user id for configurations");
      return;
    }

    let isMounted = true;
    setConfigsError(null);

    getUserConfigurations(userId)
      .then((configs) => {
        if (!isMounted) return;
        setUserConfigurations(configs ?? []);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : String(err);
        setConfigsError(msg);
        setUserConfigurations([]);
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const resetProjectModal = () => {
    setShowProjectModal(false);
    setProjectName("");
    setSelectedConfigId(null);
    setSelectedConfigName("Select configuration");
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

  // Show Scenario if user created new project
  if (showScenario && scenarioConfig && projectName) {
    return (
      <Scenario
        configuration={scenarioConfig}
        configurationName={selectedConfigName}
        projectName={projectName}
        usermode="user"
        onBack={() => {
          setShowScenario(false);
          setScenarioConfig(null);
          setProjectName("");
          resetProjectModal();
        }}
      />
    );
  }

  return (
    <div className="workspace-page">
      <UserNavBar
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
            onClick={() => {
              setActiveTab("project");
              setShowConfigModal(false);
            }}
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
              setShowProjectModal(false);
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
              <h2>
                {activeTab === "config" ? "Configuration Data" : "My Project"}
              </h2>
            </div>
            <div className="workspace-filters">
              <CustomDropdown
                options={fileFilterOptions}
                selectedValue={fileFilter}
                onChange={setFileFilter}
                width="min-w-[120px]"
                height="h-[40px]"
                fontSize="text-lg"
              />
              <CustomDropdown
                options={sortFilterOptions}
                selectedValue={sortFilter}
                onChange={setSortFilter}
                width="min-w-[120px]"
                height="h-[40px]"
                fontSize="text-lg"
              />
            </div>
          </div>

          {activeTab === "config" && configsError && (
            <div className="text-red-600 mb-3">
              Failed to load configurations: {configsError}
            </div>
          )}
          <div className="workspace-cards">
            {cards.length === 0 ? (
              <div className="workspace-empty">
                No items yet. Create a new one to get started.
              </div>
            ) : (
              cards.map((card) => (
                <div
                  key={card.id}
                  className="workspace-card cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => {
                    if (activeTab === "config") {
                      navigate(`/configuration/${card.detail_id}`);
                    } else {
                      navigate(`/scenario/${card.detail_id}`);
                    }
                  }}
                >
                  <div
                    className="workspace-card-thumb"
                    style={
                      card.imageUrl
                        ? {
                            backgroundImage: `url(${IMG_BASE_URL}/${card.imageUrl})`,
                          }
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
                : (() => {
                    setProjectName("");
                    setSelectedConfigId(null);
                    setSelectedConfigName("Select configuration");
                    setShowProjectModal(true);
                  })()
            }
          >
            + {activeTab === "config" ? "New Configuration" : "New Project"}
          </button>
        </main>
      </div>

      {/* Configuration Name Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100000]">
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
              className="w-full border border-gray-300 bg-white rounded-lg px-4 py-2 mb-6 focus:outline-none focus:border-purple-500"
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

      {/* Project Creation Modal */}
      {showProjectModal && (
        <div className="workspace-modal-overlay">
          <div className="workspace-modal">
            <h2 className="workspace-modal-title">New Project</h2>
            <div className="workspace-modal-field">
              <label className="workspace-modal-label" htmlFor="project-name">
                Name :
              </label>
              <input
                id="project-name"
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Project name"
                className="workspace-modal-input bg-white"
                autoFocus
              />
            </div>
            <div className="workspace-modal-field">
              <label className="workspace-modal-label">
                Configuration Data :
              </label>
              <div className="workspace-modal-dropdown">
                {configOptionNames.length > 0 ? (
                  <CustomDropdown
                    options={configOptionNames}
                    selectedValue={selectedConfigName}
                    onChange={(value) => {
                      const selected = configOptions.find(
                        (option) => option.name === value,
                      );
                      setSelectedConfigName(value);
                      setSelectedConfigId(selected?.detail_id ?? null);
                    }}
                    width="min-w-[160px]"
                    height="h-[45px]"
                    fontSize="text-lg"
                  />
                ) : (
                  <div className="workspace-modal-dropdown-disabled">
                    No configuration data
                  </div>
                )}
              </div>
            </div>
            <div className="workspace-modal-actions">
              <button
                onClick={resetProjectModal}
                className="workspace-modal-btn workspace-modal-cancel"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!projectName.trim()) {
                    alert("Please enter a project name");
                    return;
                  }
                  if (!selectedConfigId) {
                    alert("Please select configuration data");
                    return;
                  }

                  try {
                    setScenarioLoading(true);
                    const config =
                      await getConfigurationDetail(selectedConfigId);
                    setScenarioConfig(config);
                    setShowProjectModal(false);
                    setShowScenario(true);
                  } catch (err) {
                    const msg =
                      err instanceof Error ? err.message : String(err);
                    alert(`Failed to load configuration: ${msg}`);
                  } finally {
                    setScenarioLoading(false);
                  }
                }}
                disabled={scenarioLoading}
                className="workspace-modal-btn workspace-modal-submit"
              >
                {scenarioLoading ? "Loading..." : "Create New"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
