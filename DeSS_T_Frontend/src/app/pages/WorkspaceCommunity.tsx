import { useAuth } from "../contexts/useAuth";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import UserNavBar from "../components/UserNavBar";
import Nav from "../components/NavBar";
import "../../style/Workspace.css";
import "../../style/community.css";

type TabType = "public" | "configuration";

interface Project {
  id: string;
  name: string;
  author: string;
  thumbnail: string;
  date?: string;
}

export default function WorkspaceCommunity() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("public");

  // Mock data
  const [publicProjects] = useState<Project[]>([
    {
      id: "1",
      name: "CMU Work 1",
      author: "By Tonnam Anuwat",
      thumbnail: "map-thumbnail",
      date: "Jan 24, 2024",
    },
    {
      id: "2",
      name: "CMU Work 2",
      author: "By Tonnam Anuwat",
      thumbnail: "map-thumbnail",
      date: "Jan 24, 2024",
    },
    {
      id: "3",
      name: "CMU Work 3",
      author: "By Tonnam Anuwat",
      thumbnail: "map-thumbnail",
      date: "Jan 24, 2024",
    },
    {
      id: "4",
      name: "CMU Work 4",
      author: "By Tonnam Anuwat",
      thumbnail: "map-thumbnail",
      date: "Jan 24, 2024",
    },
  ]);

  const [configurationData] = useState<Project[]>([
    {
      id: "c1",
      name: "Configuration 1",
      author: "By User",
      thumbnail: "config-thumbnail",
    },
    {
      id: "c2",
      name: "Configuration 2",
      author: "By User",
      thumbnail: "config-thumbnail",
    },
    {
      id: "c3",
      name: "Configuration 3",
      author: "By User",
      thumbnail: "config-thumbnail",
    },
  ]);

  useEffect(() => {
    if (user || !loading) {
      setLoading(false);
      return;
    }
    setLoading(false);
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-screen justify-center items-center bg-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
        </div>
      </div>
    );
  }

  const handleBackClick = () => {
    navigate(-1);
  };

  const displayData = activeTab === "public" ? publicProjects : configurationData;

  return (
    <div className="workspace-page">
      {user ? (
        <UserNavBar
          inpage="Workspace"
          onBackClick={handleBackClick}
          userAvatarUrl={user.picture_url}
          userName={user.name}
        />
      ) : (
        <Nav usermode="guest" onBackClick={handleBackClick} />
      )}

      <div className="community-container">
        {/* Left Sidebar */}
        <aside className="community-sidebar">
          <div className="community-sidebar-section">
            <h3 className="sidebar-title">
              🗺️ OpenStreetMap Information
            </h3>
            <div className="sidebar-filters">
              <label>Max Latitude</label>
              <label>Max Longitude</label>
              <label>Min Latitude</label>
              <label>Min Longitude</label>
            </div>
          </div>

          <div className="community-sidebar-section">
            <h3 className="sidebar-title">📅 Upload Period</h3>
            <div className="calendar-placeholder">
              {/* Calendar widget would go here */}
              <p>Select date range</p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="community-main">
          {/* Tab Navigation */}
          <div className="tab-navigation">
            <button
              className={`tab-button ${activeTab === "public" ? "active" : ""}`}
              onClick={() => setActiveTab("public")}
            >
              Public Project
            </button>
            <button
              className={`tab-button ${activeTab === "configuration" ? "active" : ""}`}
              onClick={() => setActiveTab("configuration")}
            >
              Configuration Data
            </button>
          </div>

          {/* Content Area */}
          <div className="community-content">
            <div className="projects-grid">
              {displayData.map((project) => (
                <div key={project.id} className="project-card">
                  <div className="project-thumbnail">
                    {/* Placeholder for thumbnail */}
                  </div>
                  <div className="project-info">
                    <h3 className="project-name">{project.name}</h3>
                    <p className="project-author">{project.author}</p>
                    {project.date && (
                      <p className="project-date">{project.date}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
