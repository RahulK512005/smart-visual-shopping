import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./AuthContext";
import type { Role } from "../types";

/** Redirects to /login if signed out; shows an access message if the role is not allowed. */
export default function ProtectedRoute({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { user, checking } = useAuth();
  const location = useLocation();

  if (checking) return <p className="page-note" role="status">Checking your session…</p>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="page narrow">
        <h1>You do not have access to this page</h1>
        <p className="muted">This area is for admins. Your account is signed in as a shopper.</p>
        <a className="btn" href="/">Back to Smart Visual Shopping</a>
      </div>
    );
  }
  return <>{children}</>;
}
