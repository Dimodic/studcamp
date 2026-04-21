import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAppData } from "../lib/app-data";
import { AppLoading } from "./app-loading";

export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { status, data } = useAppData();

  if (status === "loading" && !data) {
    return <AppLoading />;
  }

  if (status !== "authenticated" || !data) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  return <>{children}</>;
}
