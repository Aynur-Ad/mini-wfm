import { DetailListLayout } from "./components/detail-list-layout";
import { WorkOrdersPage } from "./pages/work-orders-page";
import { WorkOrderDetailPage } from "./pages/work-order-detail-page";
import { LoginPage } from "./pages/login-page";
import { RequireSession } from "./components/require-session";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "./components/app-layout";
import { TeamsPage } from "./pages/teams-page";
import { TeamDetailPage } from "./pages/team-detail-page";
import { WorkforceUsersPage } from "./pages/workforce-users-page";
import { WorkforceUserDetailPage } from "./pages/workforce-user-detail-page";
import { NotFoundPage } from "./pages/not-found-page";

import { DashboardPage } from "./pages/dashboard-page";
import { ProfilePage } from "./pages/profile-page";
import { ShiftsPage } from "./pages/shifts-page";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <RequireSession />,
    children: [
      {
        path: "/",
        element: <AppLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="/dashboard" replace />,
          },
          { path: "dashboard", element: <DashboardPage /> },
          { path: "profile", element: <ProfilePage /> },
          { path: "shifts", element: <ShiftsPage /> },
          {
            path: "teams",
            element: (
              <DetailListLayout title="Ekip detayı">
                <TeamsPage />
              </DetailListLayout>
            ),
            children: [{ path: ":id", element: <TeamDetailPage /> }],
          },
          {
            path: "workforce-users",
            element: (
              <DetailListLayout title="Personel detayı">
                <WorkforceUsersPage />
              </DetailListLayout>
            ),
            children: [{ path: ":id", element: <WorkforceUserDetailPage /> }],
          },
          {
            path: "work-orders",
            element: (
              <DetailListLayout title="İş emri detayı">
                <WorkOrdersPage />
              </DetailListLayout>
            ),
            children: [{ path: ":id", element: <WorkOrderDetailPage /> }],
          },
          {
            path: "*",
            element: <NotFoundPage />,
          },
        ],
      },
    ],
  },
]);
