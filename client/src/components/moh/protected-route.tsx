import type { ReactNode } from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router";
import type { RootState } from "@/store/store";

/** Lets admin and staff through; everyone else goes to the sign-in page. */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const user = useSelector((state: RootState) => state.auth.user);
  const allowed = user?.roles.some((role) => role === "admin" || role === "staff");
  return allowed ? children : <Navigate to="/moh/login" replace />;
}
