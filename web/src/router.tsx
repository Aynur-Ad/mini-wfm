import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "./components/app-layout";
import { TeamsPage } from "./pages/teams-page";
import { TeamDetailPage } from "./pages/team-detail-page";
import { WorkforceUsersPage } from "./pages/workforce-users-page";
import { NotFoundPage } from "./pages/not-found-page";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/teams" replace />,
      },
      {
        path: "teams",
        element: <TeamsPage />,
      },
      {
        path: "teams/:id",
        element: <TeamDetailPage />,
      },
      {
        path: "workforce-users",
        element: <WorkforceUsersPage />,
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
]);
