import "../../style/LandingPage.css";
import { useNavigate } from "react-router-dom";
import { useRef, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../contexts/useAuth";
import { userLogin as userLoginAPI } from "../../utility/api/userLogin";

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, login } = useAuth();
  const googleButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // If user is already logged in, redirect to workspace page
    if (!isLoading && isAuthenticated) {
      navigate("/user/workspace", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

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
          // User is still logged in locally even if backend sync fails
        });

      // Navigate to the workspace page
      navigate("/user/workspace");
    } catch (error) {
      console.error("Error decoding token:", error);
    }
  };

  const handleGoogleLoginError = () => {
    console.log("Login Failed");
  };

  const handleGuestClick = () => {
    navigate("/guest/decision");
  };

  return (
    <div className="flex h-screen justify-center items-center bg-white">
      <div className="landing_container">
        <div className="landing_logobar">
          <img src="/DeSS-T_logo.png" alt="DeSS-T Logo" className="logo" />
        </div>
        <div className="landing_content mb-10">
          <p>Let’s get started on</p>
          <img
            src="/DeSS-T_logo_word.png"
            alt="DeSS-T"
            className="h-[50px] my-2"
          />
          {/* Google Login with Custom Button Overlay */}
          <div className="relative my-4">
            {/* Custom Pretty Button (Visual Layer) */}
            <div className="google-login flex items-center justify-center gap-8 pointer-events-none">
              <svg
                width="36"
                height="36"
                viewBox="0 0 60 60"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M40.4262 37.9199H30.491C29.2485 37.9199 28.2401 36.9119 28.2401 35.669V25.466C28.2401 24.2231 29.2485 23.2151 30.491 23.2151H54.2108C55.358 23.2151 56.3209 24.0776 56.4472 25.2187C57.671 36.2509 54.8196 44.1864 49.9245 49.397C44.9776 54.6616 37.8689 57.1931 30.3854 57.1931C30.3791 57.1931 30.375 57.1931 30.3688 57.1931C15.5053 57.1931 3.26953 44.9201 3.26953 30.0011C3.26953 15.0822 15.5053 2.80908 30.3688 2.80908C37.1669 2.80908 43.7227 5.37594 48.7235 9.99835C49.1811 10.4203 49.442 11.0105 49.4482 11.632C49.4524 12.2514 49.2018 12.8479 48.7525 13.276L41.3663 20.3427C40.5359 21.1387 39.2397 21.1782 38.3596 20.4383C36.1212 18.549 33.2905 17.5139 30.3646 17.5139C23.5417 17.5139 17.9322 23.1527 17.9322 30.0011C17.9322 36.8495 23.5417 42.4883 30.3646 42.4883C30.3709 42.4883 30.375 42.4883 30.3833 42.4883C34.4812 42.4883 38.1919 41.3265 40.4262 37.9199ZM43.8201 11.7692C39.9458 8.8864 35.2329 7.31095 30.3688 7.31095C17.9694 7.31095 7.77123 17.5555 7.77123 30.0011C7.77123 42.4467 17.9694 52.6913 30.3688 52.6913C30.3729 52.6913 30.3771 52.6913 30.3833 52.6913C36.5995 52.6913 42.5362 50.6877 46.6445 46.3147C50.5022 42.2098 52.6826 36.0639 52.1505 27.7169H32.7418V33.418H43.9339C44.6504 33.418 45.3255 33.761 45.7479 34.3388C46.1724 34.9166 46.2945 35.6627 46.0792 36.3465C43.5819 44.257 37.4734 46.9902 30.3854 46.9902C30.3791 46.9902 30.3729 46.9902 30.3646 46.9902C21.0776 46.9902 13.4325 39.3229 13.4325 30.0011C13.4325 20.6794 21.0776 13.0121 30.3646 13.0121C33.6674 13.0121 36.8853 13.9827 39.6269 15.7805L43.8201 11.7692Z"
                  fill="white"
                />
              </svg>
              <span>Log in with Google</span>
            </div>

            {/* Real Google Login Button (Hidden but Clickable) - Scaled Up */}
            <div
              ref={googleButtonRef}
              className="absolute inset-0 opacity-0 flex items-center justify-center"
              style={{ transform: "scale(3)", transformOrigin: "center" }}
            >
              <GoogleLogin
                onSuccess={handleCredentialResponse}
                onError={handleGoogleLoginError}
                width="400"
              />
            </div>
          </div>
          <div className="use-as-guest" onClick={handleGuestClick}>
            <svg
              width="40"
              height="40"
              viewBox="0 0 50 50"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="ml-10"
            >
              <path
                d="M35.0857 23.4857L26.5143 14.9143C25.6857 14.0857 24.3143 14.0857 23.4857 14.9143C22.6571 15.7428 22.6571 17.1143 23.4857 17.9428L28.4 22.8571H2.14286C0.971429 22.8571 0 23.8286 0 25C0 26.1714 0.971429 27.1428 2.14286 27.1428H28.4L23.4857 32.0571C22.6571 32.8857 22.6571 34.2571 23.4857 35.0857C23.9143 35.5143 24.4571 35.7143 25 35.7143C25.5429 35.7143 26.0857 35.5143 26.5143 35.0857L35.0857 26.5143C35.9143 25.6857 35.9143 24.3143 35.0857 23.4857Z"
                fill="#DFA7E4"
              />
              <path
                d="M42.1429 0H33.5714C32.4 0 31.4286 0.971429 31.4286 2.14286C31.4286 3.31429 32.4 4.28571 33.5714 4.28571H42.1429C44.1143 4.28571 45.7143 5.88571 45.7143 7.85714V42.1429C45.7143 44.1143 44.1143 45.7143 42.1429 45.7143H33.5714C32.4 45.7143 31.4286 46.6857 31.4286 47.8571C31.4286 49.0286 32.4 50 33.5714 50H42.1429C46.4857 50 50 46.4857 50 42.1429V7.85714C50 3.51429 46.4857 0 42.1429 0Z"
                fill="#DFA7E4"
              />
            </svg>
            <span className="w-full mr-8">Use as Guest</span>
          </div>
        </div>
      </div>
    </div>
  );
}
