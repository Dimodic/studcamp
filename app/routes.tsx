import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./components/layout";
import { HomePage } from "./components/home-page";
import { SchedulePage } from "./components/schedule-page";
import { PeoplePage } from "./components/people-page";
import { ProjectsPage } from "./components/projects";
import { ProfilePage } from "./components/profile-page";
import { BadgePage } from "./components/badge-page";
import { LoginPage } from "./components/login-page";
import { DocumentsPage } from "./components/documents-page";
import { CampusPage } from "./components/campus-page";
import { MaterialsPage } from "./components/materials-page";
import { RequireAuth } from "./components/auth-guard";

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
    ],
  },
  { path: "/login", Component: LoginPage },
  { path: "*", Component: () => <Navigate to="/" replace /> },
]);
