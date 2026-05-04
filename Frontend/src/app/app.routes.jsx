import { createBrowserRouter } from "react-router";
import NotFound from "./NotFound";
import Login from "../features/auth/pages/Login";
import Register from "../features/auth/pages/Register";
import AddMonitorPage from "../pages/AddMonitorPage";
import ProtectedRoute from "./ProtectedRoute";
import Dashboard from "../features/monitoring/pages/Dashboard";

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
                <Dashboard />
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
