import { useState } from "react";
// import { useEffect, useRef } from "react";
import "../../style/configuration.css";

interface ConfigurationNavProps {
  mode: "guest" | "user";
  configurationName?: string;
}

export default function ConfigurationNav({
  mode,
  configurationName,
}: ConfigurationNavProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  // const [showMenu, setShowMenu] = useState(false);
  // const menuRef = useRef<HTMLDivElement>(null);

  const handleBackClick = () => {
    if (mode === "guest") {
      setShowConfirm(true);
    }
  };

  const handleConfirmLeave = () => {
    window.location.href = "/guest/decision";
  };

  const handleCancelLeave = () => {
    setShowConfirm(false);
  };

  // const handleRename = () => {
  //   alert("Rename action");
  //   setShowMenu(false);
  // };

  // useEffect(() => {
  //   const handleClickOutside = (event: MouseEvent) => {
  //     if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
  //       setShowMenu(false);
  //     }
  //   };

  //   if (showMenu) {
  //     document.addEventListener("mousedown", handleClickOutside);
  //     return () => {
  //       document.removeEventListener("mousedown", handleClickOutside);
  //     };
  //   }
  // }, [showMenu]);

  return (
    <>
      <nav className="configuration-nav">
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
            style={{ cursor: mode === "guest" ? "pointer" : "default" }}
            onClick={handleBackClick}
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
            {mode === "guest" ? (
              "Set up Configuration Data"
            ) : (
              <>
                Set up Configuration Data -{" "}
                <span style={{ color: "#81069e" }}>
                  {configurationName || ""}
                </span>
              </>
            )}
          </h1>
          {mode === "guest" && (
            <button
              className="login-btn mr-8"
              onClick={() => alert("Login action")}
            >
              Login
            </button>
          )}
          {/* {mode === "user" && (
            <div ref={menuRef} style={{ position: "relative" }}>
              <svg
                width="28"
                height="28"
                viewBox="0 0 50 50"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="mr-6"
                onClick={() => setShowMenu(!showMenu)}
                style={{ cursor: "pointer" }}
              >
                <path
                  d="M25.0002 29.1663C27.3013 29.1663 29.1668 27.3009 29.1668 24.9997C29.1668 22.6985 27.3013 20.833 25.0002 20.833C22.699 20.833 20.8335 22.6985 20.8335 24.9997C20.8335 27.3009 22.699 29.1663 25.0002 29.1663Z"
                  fill="#323232"
                />
                <path
                  d="M25.0002 14.5833C27.3013 14.5833 29.1668 12.7179 29.1668 10.4167C29.1668 8.11548 27.3013 6.25 25.0002 6.25C22.699 6.25 20.8335 8.11548 20.8335 10.4167C20.8335 12.7179 22.699 14.5833 25.0002 14.5833Z"
                  fill="#323232"
                />
                <path
                  d="M25.0002 43.7503C27.3013 43.7503 29.1668 41.8848 29.1668 39.5837C29.1668 37.2825 27.3013 35.417 25.0002 35.417C22.699 35.417 20.8335 37.2825 20.8335 39.5837C20.8335 41.8848 22.699 43.7503 25.0002 43.7503Z"
                  fill="#323232"
                />
              </svg>
              {showMenu && (
                <div className="menu-dropdown flex flex-col">
                  <div className="menu-item flex  items-center">
                    <span onClick={handleRename}>Rename</span>
                  </div>
                </div>
              )}
            </div>
          )} */}
        </div>
      </nav>

      {showConfirm && (
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
