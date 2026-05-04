import { createBrowserRouter } from "react-router";
import NotFound from "./NotFound";
import Login from "../features/auth/pages/Login";
import Register from "../features/auth/pages/Register";
import ProtectedRoute from "./ProtectedRoute";
import Dashboard from "../features/monitoring/pages/Dashboard";
import Layout from "../components/Layout";
import Monitoring from "../features/monitoring/pages/Monitoring";
import Incidents from "../features/monitoring/pages/Incidents";
import Alerts from "../features/monitoring/pages/Alerts";
import StatusPages from "../features/monitoring/pages/StatusPages";
import Settings from "../features/monitoring/pages/Settings";

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
        element: (
            <ProtectedRoute>
                <Layout />
            </ProtectedRoute>
        ),
        children: [
            {
                path: "/dashboard",
                element: <Dashboard />,
            },
            {
                path: "/monitors",
                element: <Monitoring />,
            },
            {
                path: "/incidents",
                element: <Incidents />,
            },
            {
                path: "/alerts",
                element: <Alerts />,
            },
            {
                path: "/status-pages",
                element: <StatusPages />,
            },
            {
                path: "settings",
                element: <Settings />,
            },
        ],
    },
    
    {
        path: "*",
        element: <NotFound />
    },
]);
