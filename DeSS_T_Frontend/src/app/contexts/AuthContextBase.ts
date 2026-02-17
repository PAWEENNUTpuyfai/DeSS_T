import { createContext } from "react";
import type { User } from "../models/User";

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
  isTokenValid: () => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
