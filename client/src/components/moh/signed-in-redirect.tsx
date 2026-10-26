import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router";
import type { RootState } from "@/store/store";

/** Admin and staff who are signed in stay in the editor: the public pages send them back until they sign out. */
export function SignedInRedirect() {
  const user = useSelector((state: RootState) => state.auth.user);
  const inEditor = user?.roles.some((role) => role === "admin" || role === "staff");
  return inEditor ? <Navigate to="/moh/editor" replace /> : <Outlet />;
}
