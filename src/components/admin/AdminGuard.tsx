import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Loader2 } from "../../utils/icons";

export const AdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (isAuthenticated === null) {
    return (
      <div className="h-screen flex items-center justify-center surface-base text-secondary">
        <Loader2 className="animate-spin" size={20} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/auth" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};
