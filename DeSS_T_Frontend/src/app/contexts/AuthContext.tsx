import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { User } from "../models/User";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
  isTokenValid: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = () => {
      const storedUserData = localStorage.getItem("userData");

      if (storedUserData) {
        try {
          const userData: User = JSON.parse(storedUserData);

          // Check if token is still valid
          const tokenExpiry = new Date(userData.token_expires_at);
          const now = new Date();

          if (tokenExpiry > now) {
            setUser(userData);
          } else {
            // Token expired, clear storage
            localStorage.removeItem("userData");
            localStorage.removeItem("user");
            localStorage.removeItem("googleToken");
          }
        } catch (error) {
          console.error("Error parsing stored user data:", error);
          localStorage.removeItem("userData");
        }
      }

      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem("userData", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("userData");
    localStorage.removeItem("user");
    localStorage.removeItem("googleToken");
  };

  const isTokenValid = (): boolean => {
    if (!user) return false;

    const tokenExpiry = new Date(user.token_expires_at);
    const now = new Date();

    return tokenExpiry > now;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user && isTokenValid(),
        isLoading,
        login,
        logout,
        isTokenValid,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
