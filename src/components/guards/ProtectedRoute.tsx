import { Navigate } from "react-router-dom";
import { useStore } from "../../hooks/useStore";

export function ProtectedRoute({
  children,
  adminOnly = false,
}: {
  children: JSX.Element;
  adminOnly?: boolean;
}) {
  const { currentUser } = useStore();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (adminOnly && currentUser.role !== "admin") return <Navigate to="/" replace />;
  return children;
}
