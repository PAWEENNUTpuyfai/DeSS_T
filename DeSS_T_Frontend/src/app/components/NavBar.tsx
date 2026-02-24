import { useState, useRef } from "react";
import { jwtDecode } from "jwt-decode";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../contexts/useAuth";
import { userLogin as userLoginAPI } from "../../utility/api/userLogin";
import "../../style/navbar.css";

interface NavProps {
  usermode: "guest" | "user";
  configurationName?: string;
  projectName?: string;
  inpage?:
    | "Configuration"
    | "Project"
    | "Output"
    | "Workspace"
    | "configuration-detail";
  onBackClick?: () => void;
  userAvatarUrl?: string;
  userName?: string;
  hasProjectChanged?: boolean;
}

export default function Nav({
  usermode,
  configurationName,
  projectName,
  inpage,
  onBackClick,
  userAvatarUrl,
  userName,
  hasProjectChanged,
}: NavProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const { login } = useAuth();
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const handleConfirmLeave = () => {
    if (inpage === "configuration-detail") {
      window.location.href = "/user/workspace?tab=config";
    } else {
      onBackClick?.();
    }
  };

  const handleCredentialResponse = (credentialResponse: any) => {
    try {
      const decoded = jwtDecode<any>(credentialResponse.credential);
      console.log("User logged in:", decoded);

      // Create User object with token expiration (Google tokens typically expire in 1 hour)
      const tokenExpiresAt = new Date();
      tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 1);

      const userData = {
        google_id: decoded.sub,
        name: decoded.name,
        email: decoded.email,
        picture_url: decoded.picture || "",
        access_token: credentialResponse.credential,
        refresh_token: "",
        token_expires_at: tokenExpiresAt.toISOString(),
        last_login: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      // Use AuthContext login function
      login(userData);

      // Sync with backend database
      userLoginAPI(userData)
        .then((verifiedUser) => {
          console.log("✓ Backend sync successful:", verifiedUser);
        })
        .catch((error) => {
          console.error(
            "⚠ Backend sync failed, but user logged in locally:",
            error,
          );
        });

      // Close modal and navigate to workspace
      window.location.href = "/user/workspace";
    } catch (error) {
      console.error("Error decoding token:", error);
    }
  };

  const handleGoogleLoginError = () => {
    console.log("Login Failed");
  };
  const handleCancelLeave = () => {
    setShowConfirm(false);
  };

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
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 22 38"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="nav-icon"
            style={{ cursor: usermode === "guest" ? "pointer" : "default" }}
            onClick={() => {
              if (inpage === "configuration-detail") {
                handleConfirmLeave();
              } else if (!onBackClick) {
                return;
              } else if (inpage === "Output" || !hasProjectChanged) {
                handleConfirmLeave();
              } else {
                setShowConfirm(true);
              }
            }}
          >
            <path
              d="M0.920679 21.0956L17.1074 37.159C17.3733 37.4255 17.6896 37.637 18.0381 37.7813C18.3866 37.9257 18.7604 38 19.1379 38C19.5154 38 19.8892 37.9257 20.2377 37.7813C20.5862 37.637 20.9025 37.4255 21.1684 37.159C21.701 36.6263 22 35.9058 22 35.1547C22 34.4036 21.701 33.683 21.1684 33.1503L7.01215 18.9349L21.1684 4.86166C21.701 4.32898 22 3.60839 22 2.85729C22 2.10619 21.701 1.38561 21.1684 0.852921C20.9035 0.584286 20.5877 0.370571 20.2391 0.224159C19.8906 0.0777512 19.5163 0.00156403 19.1379 0C18.7595 0.00156403 18.3852 0.0777512 18.0367 0.224159C17.6881 0.370571 17.3723 0.584286 17.1074 0.852921L0.920679 16.9163C0.63039 17.1825 0.398718 17.5057 0.240263 17.8653C0.0818064 18.225 2.12605e-07 18.6133 2.08299e-07 19.006C2.03993e-07 19.3986 0.0818064 19.787 0.240263 20.1466C0.398718 20.5063 0.63039 20.8294 0.920679 21.0956Z"
              fill="#323232"
            />
          </svg>
          <h1
            className="nav-title"
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            {inpage === "Workspace" ? (
              "User Workspace"
            ) : inpage === "Configuration" ? (
              usermode === "guest" ? (
                "Set up Configuration Data"
              ) : (
                <>
                  Set up Configuration Data -{" "}
                  <span style={{ color: "#81069e" }}>
                    {configurationName || ""}
                  </span>
                </>
              )
            ) : inpage === "Project" ? (
              usermode === "guest" ? (
                "Set up Scenario"
              ) : (
                <>
                  Set up Scenario -{" "}
                  <span style={{ color: "#81069e" }}>{projectName || ""}</span>
                </>
              )
            ) : inpage === "Output" ? (
              "Simulation results"
            ) : inpage === "configuration-detail" ? (
              "Configuration Details"
            ) : (
              <>
                Simulation results-{" "}
                <span style={{ color: "#81069e" }}>{projectName || ""}</span>
              </>
            )}
          </h1>
          {usermode === "guest" ? (
            <div style={{ position: "relative", display: "inline-block" }}>
              <button
                className="login-btn mr-8"
                style={{ position: "relative", zIndex: 1 }}
              >
                Login
              </button>
              <div
                ref={googleButtonRef}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  opacity: 0,
                  pointerEvents: "auto",
                  zIndex: 2,
                }}
              >
                <GoogleLogin
                  onSuccess={handleCredentialResponse}
                  onError={handleGoogleLoginError}
                  width="100"
                />
              </div>
            </div>
          ) : (
            <div className="nav-user">
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
          )}
        </div>
      </nav> 

      {showConfirm && inpage !== "Output" && (
        <div className="confirm-modal-overlay">
          <div className="confirm-modal">
            <h2 className="confirm-modal-title flex items-center justify-center">
              {inpage === "Project" && usermode === "user" && hasProjectChanged
                ? "Are you sure you want to return to User Workspace without saving?"
                : "Are you sure you want to discard all changes?"}
            </h2>
            <p className="confirm-modal-subtitle">
              {inpage === "Project" && usermode === "user" && hasProjectChanged
                ? "Your project changes will not be saved."
                : "Your changes will not be saved if you leave this page."}
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
