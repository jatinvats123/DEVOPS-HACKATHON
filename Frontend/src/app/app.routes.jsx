import { createBrowserRouter } from "react-router";
import NotFound from "./NotFound";
import Login from "../features/auth/pages/Login";
import Register from "../features/auth/pages/Register";
import DashboardPage from "../pages/DashboardPage";
import AddMonitorPage from "../pages/AddMonitorPage";
import ProtectedRoute from "./ProtectedRoute";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <Login />,
    },
    {
        path: "/login",
        element: <Login />,
    },
    {
        path: "/register",
        element: <Register />,
    },
    {
        path: "/dashboard",
        element: (
            <ProtectedRoute>
                <DashboardPage />
            </ProtectedRoute>
        ),
    },
    {
        path: "/add-monitor",
        element: (
            <ProtectedRoute>
                <AddMonitorPage />
            </ProtectedRoute>
        ),
    },
    {
        path: "*",
        element: <NotFound />
    },
]);