import { useState } from "react";
import { useLocation } from "react-router-dom";
import "../../style/navbar.css";

interface UserNavProps {
  configurationName?: string;
  projectName?: string;
  inpage?: "Configuration" | "Project" | "Output" | "Workspace";
  onBackClick?: () => void;
  userAvatarUrl?: string;
  userName?: string;
}

export default function UserNavBar({
  inpage,
  userAvatarUrl,
  userName,
}: UserNavProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const location = useLocation();

  const handleConfirmLeave = () => {
    window.location.href = "/user/workspace";
  };

  const handleCancelLeave = () => {
    setShowConfirm(false);
  };

  const handleUserNameClick = () => {
    window.location.href = "/user/workspace";
  };

  const isWorkspaceRoute = location.pathname === "/user/workspace";

  return (
    <>
      <nav className="nav">
        <div
          className="nav-content"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            position: "relative",
            gap: "24px",
          }}
        >
          {/* Middle-Left: Logo and User Info */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "24px",
              flex: 1,
            }}
          >
            {/* Logo */}
            <div style={{ flexShrink: 0 }}>
              <img
                src="/DeSS-T_logo.png"
                alt="DeSS-T Logo"
                style={{ height: "48px", width: "auto" }}
              />
            </div>

            {/* User Name */}
            {userName && (
              <span
                onClick={handleUserNameClick}
                style={{
                  fontSize: "16px",
                  fontWeight: "600",
                  color: "#81069e",
                  cursor: "pointer",
                  paddingBottom: "8px",
                  borderBottom: isWorkspaceRoute ? "3px solid #81069e" : "none",
                  transition: "border-bottom 0.3s ease",
                }}
              >
                {userName}
              </span>
            )}

            {/* Workspace Community */}
            <span
              style={{
                fontSize: "16px",
                color: "#9ca3af",
                fontWeight: "600",
                cursor: "not-allowed",
                paddingBottom: "8px",
                opacity: 0.6,
                transition: "border-bottom 0.3s ease",
              }}
            >
              Workspace community
            </span>
          </div>

          {/* Right: Profile Avatar */}
          <div className="nav-user" style={{ flexShrink: 0 }}>
            {userAvatarUrl && (
              <img
                src={userAvatarUrl}
                alt={userName ? `${userName} profile` : "Profile"}
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                className="nav-user-avatar"
              />
            )}
          </div>
        </div>
      </nav>

      {showConfirm && inpage !== "Output" && (
        <div className="confirm-modal-overlay">
          <div className="confirm-modal">
            <h2 className="confirm-modal-title flex items-center justify-center">
              Are you sure you want to discard all changes?
            </h2>
            <p className="confirm-modal-subtitle">
              Your changes will not be saved if you leave this page.
            </p>
            <div className="confirm-modal-actions">
              <button
                className="modal-btn modal-btn-secondary"
                onClick={handleCancelLeave}
              >
                Stay on page
              </button>
              <button
                className="modal-btn modal-btn-primary"
                onClick={handleConfirmLeave}
              >
                Discard and leave
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
