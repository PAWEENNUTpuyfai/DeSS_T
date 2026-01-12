import { useState } from "react";
// import { useEffect, useRef } from "react";
import "../../style/navbar.css";

interface NavProps {
  usermode: "guest" | "user";
  configurationName?: string;
  projectName?: string;
  inpage?: "Configuration" | "Project" | "Output";
  onBackClick?: () => void;
}

export default function Nav({
  usermode,
  configurationName,
  projectName,
  inpage,
  onBackClick,
}: NavProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleConfirmLeave = () => {
    onBackClick?.();
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
              if (inpage === "Output") {
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
              transform: "translateX(-50%)",
            }}
          >
            {inpage === "Configuration" ? (
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
            ) : (
              <>
                Simulation results-{" "}
                <span style={{ color: "#81069e" }}>{projectName || ""}</span>
              </>
            )}
          </h1>
          {usermode === "guest" && (
            <button
              className="login-btn mr-8"
              onClick={() => alert("Login action")}
            >
              Login
            </button>
          )}
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
