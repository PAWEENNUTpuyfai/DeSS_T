import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface UserInfo {
  email?: string;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  iss?: string;
  sub?: string;
  aud?: string;
  iat?: number;
  exp?: number;
}

export default function UserLogin() {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Get user information from localStorage
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("googleToken");

    if (storedUser) {
      setUserInfo(JSON.parse(storedUser));
    }
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem("user");
    localStorage.removeItem("googleToken");
    navigate("/");
  };

  const handleContinue = () => {
    navigate("/guest/setup");
  };

  if (!userInfo) {
    return (
      <div className="flex h-screen justify-center items-center bg-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
          <p>Please wait while we load your information.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen justify-center items-center bg-white">
      <div className="w-full max-w-md p-8 bg-gray-50 rounded-lg shadow-lg">
        <div className="text-center mb-8">
          <img
            src="/DeSS-T_logo.png"
            alt="DeSS-T Logo"
            className="h-16 mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-800">Welcome!</h1>
          <p className="text-gray-600 mt-2">Google Login Information</p>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
          {userInfo.picture && (
            <div className="text-center mb-4">
              <img
                src={userInfo.picture}
                alt="Profile"
                className="w-20 h-20 rounded-full mx-auto border-2 border-blue-500"
              />
            </div>
          )}

          <div className="space-y-4">
            {userInfo.email && (
              <div className="border-b pb-3">
                <label className="text-sm font-semibold text-gray-600">
                  Email
                </label>
                <p className="text-gray-800 text-lg break-all">
                  {userInfo.email}
                </p>
              </div>
            )}

            {userInfo.name && (
              <div className="border-b pb-3">
                <label className="text-sm font-semibold text-gray-600">
                  Name
                </label>
                <p className="text-gray-800 text-lg">{userInfo.name}</p>
              </div>
            )}

            {userInfo.given_name && (
              <div className="border-b pb-3">
                <label className="text-sm font-semibold text-gray-600">
                  First Name
                </label>
                <p className="text-gray-800 text-lg">{userInfo.given_name}</p>
              </div>
            )}

            {userInfo.family_name && (
              <div className="border-b pb-3">
                <label className="text-sm font-semibold text-gray-600">
                  Last Name
                </label>
                <p className="text-gray-800 text-lg">{userInfo.family_name}</p>
              </div>
            )}

            {userInfo.sub && (
              <div className="border-b pb-3">
                <label className="text-sm font-semibold text-gray-600">
                  User ID
                </label>
                <p className="text-gray-600 text-sm break-all font-mono">
                  {userInfo.sub}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Token stored:</span> Yes
          </p>
          <p className="text-xs text-gray-500 mt-2 break-all font-mono">
            {token ? token.substring(0, 50) + "..." : "No token"}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleContinue}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
          >
            Continue
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg transition duration-200"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
