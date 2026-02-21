import { useMemo, useState, useEffect } from "react";
import { useAuth } from "../contexts/useAuth";
import { useSearchParams } from "react-router-dom";
import ConfigurationMap from "../components/Configuration/ConfigurationMap";
import Scenario from "../components/Scenario";
import UserNavBar from "../components/UserNavBar";
import CustomDropdown from "../components/CustomDropdown";
import type { UserConfiguration, UserScenario } from "../models/User";
import type { ConfigurationDetail } from "../models/Configuration";
import {
  getUserConfigurations,
  getConfigurationDetail,
  deleteUserConfiguration,
} from "../../utility/api/configuration";
import { getScenarioDetails, getUserScenarios } from "../../utility/api/scenario";
import "../../style/Workspace.css";
import { IMG_BASE_URL } from "../../utility/config";

interface UserWorkspaceProps {
  initialActiveTab?: "project" | "config";
}

export default function UserWorkspace({
  initialActiveTab,
}: UserWorkspaceProps = {}) {
  const { user, logout } = useAuth();
  const [searchParams] = useSearchParams();

  // Read tab from query parameter, fallback to initialActiveTab prop, then default to "project"
  const tabFromUrl = searchParams.get("tab");
  const defaultTab =
    tabFromUrl === "config" || tabFromUrl === "project"
      ? tabFromUrl
      : initialActiveTab || "project";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"project" | "config">(defaultTab);
  const [userConfigurations, setUserConfigurations] = useState<
    UserConfiguration[]
  >([]);
  const [configsError, setConfigsError] = useState<string | null>(null);
  const [userScenarios, setUserScenarios] = useState<UserScenario[]>([]);
  const [scenariosError, setScenariosError] = useState<string | null>(null);

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

  // Delete confirmation states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfigId, setDeleteConfigId] = useState<string | null>(null);
  const [deleteConfigDetailId, setDeleteConfigDetailId] = useState<
    string | null
  >(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [linkedScenarios, setLinkedScenarios] = useState<UserScenario[]>([]);
  const [linkedScenariosLoading, setLinkedScenariosLoading] = useState(false);
  const [linkedScenariosError, setLinkedScenariosError] = useState<string | null>(
    null,
  );

  // Filter states
  const [fileFilter, setFileFilter] = useState("All Files");
  const [sortBy, setSortBy] = useState("Date modify");
  const [sortOrder, setSortOrder] = useState("Ascending");
  const fileFilterOptions = ["All Files", "Public", "Private"];
  const sortGroups = [
    {
      label: "Sort By",
      options: ["Name", "Date modify", "Date Upload"],
    },
    {
      label: "Order",
      options: ["Ascending", "Descending"],
    },
  ];
  const currentSortDisplay = `${sortBy} - ${sortOrder}`;

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

    return userScenarios.map((scenario) => ({
      id: scenario.user_scenario_id,
      name: scenario.name,
      date: scenario.modify_date,
      imageUrl: scenario.cover_image?.path_file,
      detail_id: scenario.scenario_detail_id,
    }));
  }, [user, userConfigurations, userScenarios, activeTab]);

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

  useEffect(() => {
    if (!showDeleteModal || !deleteConfigDetailId) {
      return;
    }

    let isMounted = true;
    setLinkedScenariosLoading(true);
    setLinkedScenariosError(null);

    const loadLinkedScenarios = async () => {
      const scenariosWithDetails = await Promise.allSettled(
        userScenarios.map(async (scenario) => {
          if (scenario.scenario_detail?.configuration_detail_id) {
            return scenario;
          }

          const detail = await getScenarioDetails(scenario.scenario_detail_id);
          return { ...scenario, scenario_detail: detail.scenario_detail };
        }),
      );

      if (!isMounted) {
        return;
      }

      const resolved: UserScenario[] = [];
      let hadError = false;

      scenariosWithDetails.forEach((result) => {
        if (result.status === "fulfilled") {
          resolved.push(result.value);
        } else {
          hadError = true;
        }
      });

      const linked = resolved.filter(
        (scenario) =>
          scenario.scenario_detail?.configuration_detail_id ===
          deleteConfigDetailId,
      );

      setLinkedScenarios(linked);
      setLinkedScenariosLoading(false);
      if (hadError) {
        setLinkedScenariosError(
          "Some scenarios could not be checked for configuration links.",
        );
      }
    };

    loadLinkedScenarios().catch((err: unknown) => {
      if (!isMounted) return;
      const msg = err instanceof Error ? err.message : String(err);
      setLinkedScenariosError(msg);
      setLinkedScenarios([]);
      setLinkedScenariosLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [showDeleteModal, deleteConfigDetailId, userScenarios]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const userId = user.google_id || user.email;
    if (!userId) {
      setScenariosError("Missing user id for scenarios");
      return;
    }

    let isMounted = true;
    setScenariosError(null);

    getUserScenarios(userId)
      .then((scenarios) => {
        if (!isMounted) return;
        setUserScenarios(scenarios ?? []);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : String(err);
        setScenariosError(msg);
        setUserScenarios([]);
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  const handleDeleteConfiguration = async (
    configurationId: string,
    configurationDetailId: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    setDeleteConfigId(configurationId);
    setDeleteConfigDetailId(configurationDetailId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteConfigId) return;

    try {
      setIsDeleting(true);
      console.log(`Attempting to delete configuration with ID: ${deleteConfigId}`);
      await deleteUserConfiguration(deleteConfigId);
      setUserConfigurations((prev) =>
        prev.filter(
          (config) => config.user_configuration_id !== deleteConfigId,
        ),
      );
      setShowDeleteModal(false);
      setDeleteConfigId(null);
      setDeleteConfigDetailId(null);
      setLinkedScenarios([]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setConfigsError(`Failed to delete configuration: ${msg}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteConfigId(null);
    setDeleteConfigDetailId(null);
    setLinkedScenarios([]);
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
            className="mt-4 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded-lg"
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
              <svg
                width="20"
                height="20"
                viewBox="0 0 30 31"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M24.7067 26.5589C24.2388 26.5589 23.79 26.7587 23.4591 27.1145C23.1282 27.4703 22.9423 27.9528 22.9423 28.4559C22.9423 28.9591 23.1282 29.4416 23.4591 29.7974C23.79 30.1532 24.2388 30.353 24.7067 30.353H28.2356C28.7035 30.353 29.1523 30.1532 29.4832 29.7974C29.8141 29.4416 30 28.9591 30 28.4559L30 1.89685C30 1.39371 29.8141 0.911179 29.4832 0.555407C29.1523 0.199636 28.7035 -0.000232697 28.2356 -0.000232697H24.7067C24.2388 -0.000232697 23.79 0.199636 23.4591 0.555407C23.1282 0.911179 22.9423 1.39371 22.9423 1.89685C22.9423 2.39998 23.1282 2.88251 23.4591 3.23829C23.79 3.59406 24.2388 3.79392 24.7067 3.79392H26.4712L26.4712 26.5589H24.7067ZM0.322489 16.2767L5.29815 23.865C5.56799 24.274 5.97746 24.5515 6.43704 24.6368C6.89661 24.7221 7.36892 24.6083 7.75069 24.3203C7.94151 24.1765 8.10396 23.9936 8.22866 23.7819C8.35336 23.5703 8.43783 23.3342 8.4772 23.0872C8.51657 22.8403 8.51006 22.5874 8.45805 22.3432C8.40603 22.099 8.30954 21.8683 8.17415 21.6644L5.13935 17.0735L19.4135 17.0735C19.8814 17.0735 20.3302 16.8736 20.6611 16.5178C20.992 16.1621 21.1779 15.6795 21.1779 15.1764C21.1779 14.6733 20.992 14.1907 20.6611 13.835C20.3302 13.4792 19.8814 13.2793 19.4135 13.2793L5.29815 13.2793L8.4741 8.72633C8.61312 8.52703 8.71428 8.30024 8.77178 8.0589C8.82929 7.81757 8.84202 7.56642 8.80925 7.31979C8.77648 7.07317 8.69885 6.8359 8.5808 6.62153C8.46275 6.40717 8.30658 6.2199 8.12122 6.07042C7.8158 5.82414 7.44433 5.691 7.06257 5.691C6.78865 5.691 6.51849 5.75957 6.27349 5.89128C6.02849 6.02299 5.81538 6.21422 5.65103 6.44983L0.357779 14.0381C0.131805 14.359 0.00659752 14.7488 0.000253677 15.1512C-0.00609016 15.5536 0.10676 15.9478 0.322489 16.2767Z"
                  fill="#81069E"
                />
              </svg>
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
                width="w-[200px]"
                height="h-[50px]"
                fontSize="text-base"
              />
              <CustomDropdown
                groups={sortGroups}
                selectedValue={currentSortDisplay}
                selectedGroupValues={[sortBy, sortOrder]}
                onChange={(value) => {
                  // Check if value is from first group (Sort By)
                  if (["Name", "Date modify", "Date Upload"].includes(value)) {
                    setSortBy(value);
                  }
                  // Check if value is from second group (Order)
                  else if (["Ascending", "Descending"].includes(value)) {
                    setSortOrder(value);
                  }
                }}
                isGrouped={true}
                width="w-[200px]"
                height="h-[50px]"
                fontSize="text-base"
              />
            </div>
          </div>

          {activeTab === "config" && configsError && (
            <div className="text-red-600 mb-3">
              Failed to load configurations: {configsError}
            </div>
          )}
          {activeTab === "project" && scenariosError && (
            <div className="text-red-600 mb-3">
              Failed to load projects: {scenariosError}
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
                  className="workspace-card cursor-pointer hover:shadow-lg transition-shadow relative group"
                  onClick={() => {
                    if (activeTab === "config") {
                      window.location.href = `/configuration/${card.detail_id}`;
                    } else {
                      window.location.href = `/scenario/${card.detail_id}`;
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
                  {activeTab === "config" && (
                    <button
                      onClick={(e) =>
                        handleDeleteConfiguration(card.id, card.detail_id, e)
                      }
                      className="absolute top-2 right-2 p-2 bg-white rounded-full hover:border-white transition-all shadow-md opacity-0 group-hover:opacity-100"
                      aria-label="Delete configuration"
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M7 16C7.26522 16 7.51957 15.8946 7.70711 15.7071C7.89464 15.5196 8 15.2652 8 15V9C8 8.73478 7.89464 8.48043 7.70711 8.29289C7.51957 8.10536 7.26522 8 7 8C6.73478 8 6.48043 8.10536 6.29289 8.29289C6.10536 8.48043 6 8.73478 6 9V15C6 15.2652 6.10536 15.5196 6.29289 15.7071C6.48043 15.8946 6.73478 16 7 16ZM17 4H13V3C13 2.20435 12.6839 1.44129 12.1213 0.87868C11.5587 0.316071 10.7956 0 10 0H8C7.20435 0 6.44129 0.316071 5.87868 0.87868C5.31607 1.44129 5 2.20435 5 3V4H1C0.734784 4 0.48043 4.10536 0.292893 4.29289C0.105357 4.48043 0 4.73478 0 5C0 5.26522 0.105357 5.51957 0.292893 5.70711C0.48043 5.89464 0.734784 6 1 6H2V17C2 17.7956 2.31607 18.5587 2.87868 19.1213C3.44129 19.6839 4.20435 20 5 20H13C13.7956 20 14.5587 19.6839 15.1213 19.1213C15.6839 18.5587 16 17.7956 16 17V6H17C17.2652 6 17.5196 5.89464 17.7071 5.70711C17.8946 5.51957 18 5.26522 18 5C18 4.73478 17.8946 4.48043 17.7071 4.29289C17.5196 4.10536 17.2652 4 17 4ZM7 3C7 2.73478 7.10536 2.48043 7.29289 2.29289C7.48043 2.10536 7.73478 2 8 2H10C10.2652 2 10.5196 2.10536 10.7071 2.29289C10.8946 2.48043 11 2.73478 11 3V4H7V3ZM14 17C14 17.2652 13.8946 17.5196 13.7071 17.7071C13.5196 17.8946 13.2652 18 13 18H5C4.73478 18 4.48043 17.8946 4.29289 17.7071C4.10536 17.5196 4 17.2652 4 17V6H14V17ZM11 16C11.2652 16 11.5196 15.8946 11.7071 15.7071C11.8946 15.5196 12 15.2652 12 15V9C12 8.73478 11.8946 8.48043 11.7071 8.29289C11.5196 8.10536 11.2652 8 11 8C10.7348 8 10.4804 8.10536 10.2929 8.29289C10.1054 8.48043 10 8.73478 10 9V15C10 15.2652 10.1054 15.5196 10.2929 15.7071C10.4804 15.8946 10.7348 16 11 16Z"
                          fill="red"
                        />
                      </svg>
                    </button>
                  )}
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
        <div className="workspace-modal-overlay">
          <div className="workspace-modal">
            <div className="flex items-center mb-4">
              <span className="w-1 h-8 bg-[#81069e] mr-3" />
              <h2 className="workspace-modal-title" style={{ margin: 0 }}>
                New Configuration Data
              </h2>
            </div>
            <p className="text-gray-600 mb-6">
              Please enter a name for your configuration
            </p>
            <input
              type="text"
              value={configName}
              onChange={(e) => setConfigName(e.target.value)}
              placeholder="Configuration name"
              className="workspace-modal-input workspace-modal-input-dropdown"
              autoFocus
            />
            <div className="workspace-modal-actions workspace-modal-actions-spaced">
              <button
                onClick={() => {
                  setShowConfigModal(false);
                  setConfigName("");
                }}
                className="workspace-modal-btn workspace-modal-cancel"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!configName.trim()) {
                    alert("Please enter a configuration name");
                    return;
                  }

                  // Check for duplicate name
                  const isDuplicate = userConfigurations.some(
                    (config) =>
                      config.name.toLowerCase() ===
                      configName.trim().toLowerCase(),
                  );

                  if (isDuplicate) {
                    alert(
                      "A configuration with this name already exists. Please choose a different name.",
                    );
                    return;
                  }

                  setShowConfigModal(false);
                  setShowConfigMap(true);
                }}
                className="workspace-modal-btn workspace-modal-submit"
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
            <div className="flex items-center mb-4">
              <span className="w-1 h-8 bg-[#81069e] mr-3" />
              <h2 className="workspace-modal-title" style={{ margin: 0 }}>
                New Project
              </h2>
            </div>
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
                className="workspace-modal-input workspace-modal-input-dropdown"
                autoFocus
              />
            </div>
            <div className="workspace-modal-field">
              <label className="workspace-modal-label">
                Configuration Data :
              </label>
              <div className="workspace-modal-dropdown" style={{ width: "285px", flex: "0 0 285px" }}>
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
                    width="w-full"
                    height="h-[50px]"
                    fontSize="text-base"
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

                  // Check for duplicate project name
                  const isDuplicateProject = userScenarios.some(
                    (scenario) =>
                      scenario.name.toLowerCase() ===
                      projectName.trim().toLowerCase(),
                  );

                  if (isDuplicateProject) {
                    alert(
                      "A project with this name already exists. Please choose a different name.",
                    );
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100000]">
          <div className="bg-white rounded-[40px] p-8 max-w-md w-full mx-4 border-2">
            <div className="flex items-center mb-4">
              <span className="w-2 h-8 bg-red-600 mr-3" />
              <h2 className="text-2xl text-gray-800">Delete Configuration</h2>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this configuration? This action
              cannot be undone.
            </p>
            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-800 mb-2">
                Linked scenarios
              </p>
              {linkedScenariosLoading ? (
                <p className="text-sm text-gray-500">Loading scenarios...</p>
              ) : linkedScenarios.length > 0 ? (
                <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
                  {linkedScenarios.map((scenario) => (
                    <li key={scenario.user_scenario_id}>{scenario.name}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No linked scenarios.</p>
              )}
              {linkedScenariosError && (
                <p className="text-sm text-red-600 mt-2">
                  {linkedScenariosError}
                </p>
              )}
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelDelete}
                disabled={isDeleting}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-6 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white py-2 px-6 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
