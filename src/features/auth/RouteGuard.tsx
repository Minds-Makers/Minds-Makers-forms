import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./useAuth";

export function RouteGuard() {
  const { isAuthed, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-bg" />;
  if (!isAuthed) return <Navigate to="/admin/login" replace />;
  return <Outlet />;
}
