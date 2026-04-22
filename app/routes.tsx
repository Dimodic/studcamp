import { createBrowserRouter, Navigate } from "react-router";

import { Layout } from "./components/layout";
import { RequireAuth } from "./components/auth-guard";
import { AttendancePage } from "./pages/attendance";
import { BadgePage } from "./pages/badge";
import { CampusPage } from "./pages/campus";
import { DocumentsPage } from "./pages/documents";
import { HomePage } from "./pages/home";
import { LoginPage } from "./pages/login";
import { MaterialsPage } from "./pages/materials";
import { PeoplePage } from "./pages/people";
import { ProfilePage } from "./pages/profile";
import { ProjectsPage } from "./pages/projects";
import { SchedulePage } from "./pages/schedule";

function ProtectedLayout() {
  return (
    <RequireAuth>
      <Layout />
    </RequireAuth>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: ProtectedLayout,
    children: [
      { index: true, Component: HomePage },
      { path: "schedule", Component: SchedulePage },
      { path: "people", Component: PeoplePage },
      { path: "projects", Component: ProjectsPage },
      { path: "profile", Component: ProfilePage },
      { path: "profile/badge", Component: BadgePage },
      { path: "documents", Component: DocumentsPage },
      { path: "campus", Component: CampusPage },
      { path: "materials", Component: MaterialsPage },
      { path: "attendance", Component: AttendancePage },
    ],
  },
  { path: "/login", Component: LoginPage },
  { path: "*", Component: () => <Navigate to="/" replace /> },
]);
