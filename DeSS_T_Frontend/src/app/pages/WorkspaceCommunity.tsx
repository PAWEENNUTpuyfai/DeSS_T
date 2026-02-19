import { useAuth } from "../contexts/useAuth";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import UserNavBar from "../components/UserNavBar";
import Nav from "../components/NavBar";
import CustomDropdown from "../components/CustomDropdown";
import "../../style/Workspace.css";
import "../../style/community.css";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [expandedSections, setExpandedSections] = useState({
    osm: true,
    upload: true,
  });

  const sortOptions = ["Date Asc", "Date Desc"];

  // Mock data
  const [publicProjects] = useState<Project[]>([
    { id: "1", name: "CMU Work 1", author: "By Tonnam Anuwat", thumbnail: "map" },
    { id: "2", name: "CMU Work 2", author: "By Tonnam Anuwat", thumbnail: "map" },
    { id: "3", name: "CMU Work 3", author: "By Tonnam Anuwat", thumbnail: "map" },
    { id: "4", name: "CMU Work 4", author: "By Tonnam Anuwat", thumbnail: "map" },
    { id: "5", name: "Work test 1", author: "By Mindtssawora", thumbnail: "map" },
    { id: "6", name: "Demo", author: "By Fuyfai Paweennul", thumbnail: "map" },
    { id: "7", name: "My Public Work", author: "By Tonnam Anuwat", thumbnail: "map" },
    { id: "8", name: "CMU", author: "By PDF", thumbnail: "map" },
  ]);

  useEffect(() => {
    if (user) {
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

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  const displayData = publicProjects;
  const filteredData = displayData.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

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
        <aside className="workspace-sidebar">
          <div className="sidebar-extra-space">
            {/* OpenStreetMap Information */}
            <div className="sidebar-card-header-only">
              <button
                className="sidebar-card-header-button"
                onClick={() => toggleSection("osm")}
              >
                <span className={`toggle-arrow ${expandedSections.osm ? "open" : ""}`}>
                  ▼
                </span>
                🗺️ OpenStreetMap
              </button>
            </div>
            {expandedSections.osm && (
              <div className="sidebar-card-content-only">
                <label>Max Latitude</label>
                <label>Max Longitude</label>
                <label>Min Latitude</label>
                <label>Min Longitude</label>
              </div>
            )}

            {/* Upload Period */}
            <div className="sidebar-card-header-only">
              <button
                className="sidebar-card-header-button"
                onClick={() => toggleSection("upload")}
              >
                <span className={`toggle-arrow ${expandedSections.upload ? "open" : ""}`}>
                  ▼
                </span>
                📅 Upload Period
              </button>
            </div>
            {expandedSections.upload && (
              <div className="sidebar-card-content-only">
                <div className="calendar-placeholder">
                  <div className="calendar-header">JANUARY 2022</div>
                  <div className="calendar-grid">
                    <div>M</div>
                    <div>T</div>
                    <div>W</div>
                    <div>Th</div>
                    <div>F</div>
                    <div>S</div>
                    <div>Su</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="workspace-sidebar-footer">
            {user && (
              <button
                className="workspace-logout"
                onClick={() => navigate("/")}
              >
                Logout
              </button>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="workspace-main community-main">
          {/* Projects Grid with Search */}
          <div className="community-content">
            {/* Search and Filter Bar */}
            <div className="search-filter-bar">
              <div className="search-input-wrapper">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search by project name ...."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                <button className="clear-btn">✕</button>
              </div>
              <div className="filter-buttons">
                <button className="filter-btn">⚙️</button>
                <CustomDropdown
                  options={sortOptions}
                  selectedValue={sortOrder === "asc" ? "Date Asc" : "Date Desc"}
                  onChange={(value) => setSortOrder(value === "Date Asc" ? "asc" : "desc")}
                  width="min-w-[120px]"
                  height="h-[40px]"
                  fontSize="text-lg"
                />
              </div>
            </div>
 
            <div className="projects-grid">
              {filteredData.map((project) => (
                <div key={project.id} className="project-card">
                  <div className="project-thumbnail"></div>
                  <div className="project-info">
                    <h3 className="project-name">{project.name}</h3>
                    <p className="project-author">{project.author}</p>
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
