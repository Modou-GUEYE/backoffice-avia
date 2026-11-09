import { ReactElement } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore, hasBackofficeAccess } from "@/core/security/authStore";

interface ProtectedRouteProps {
  children: ReactElement;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);
  const logout = useAuthStore((state) => state.logout);
  const attemptedPath = `${location.pathname}${location.search}${location.hash}`;

  if (!isAuthenticated || !hasBackofficeAccess(token)) {
    if (isAuthenticated && !hasBackofficeAccess(token)) {
      logout();
    }
    return <Navigate to="/" replace state={{ from: attemptedPath }} />;
  }

  return children;
};

export default ProtectedRoute;
