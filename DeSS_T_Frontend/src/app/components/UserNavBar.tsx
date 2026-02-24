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
                className="nav-user-name"
                data-active={isWorkspaceRoute}
                style={{
                  fontSize: "18px",
                  fontWeight: "400",
                  color: "#000000",
                  cursor: "pointer",
                  paddingTop: "12px",
                  paddingBottom: "8px",
                }}
              >
                {userName}
              </span>
            )}

            {/* Workspace Community */}
            <span
              style={{
                fontSize: "18px",
                color: "#9ca3af",
                fontWeight: "400",
                cursor: "not-allowed",
                paddingTop: "12px",
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100000]">
          <div className="bg-white rounded-[40px] p-8 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <span className="w-2 h-8 bg-[#81069e] mr-3" />
              <h2 className="text-2xl text-gray-800">
                Are you sure you want to discard all changes?
              </h2>
            </div>
            <p className="text-gray-600 mb-6">
              Your changes will not be saved if you leave this page.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelLeave}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-6 rounded-full transition duration-200 outline-none focus:outline-none hover:outline-none active:outline-none focus:ring-0 hover:ring-0 active:ring-0 border-0"
              >
                Stay on page
              </button>
              <button
                onClick={handleConfirmLeave}
                className="bg-[#81069e] hover:bg-[#6a0585] text-white py-2 px-6 rounded-full transition duration-200 outline-none focus:outline-none hover:outline-none active:outline-none focus:ring-0 hover:ring-0 active:ring-0 border-0"
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
