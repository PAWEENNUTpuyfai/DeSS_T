import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";

interface GuestRouteProps {
  children: React.ReactNode;
}

export default function GuestRoute({ children }: GuestRouteProps) {
  const { user } = useAuth();

  // If user is logged in, redirect to workspace
  if (user) {
    return <Navigate to="/user/workspace" replace />;
  }

  // If not logged in, allow access to guest routes
  return <>{children}</>;
}
