import { createBrowserRouter } from "react-router";
import NotFound from "./NotFound";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import DashboardPage from "../pages/DashboardPage";
import AddMonitorPage from "../pages/AddMonitorPage";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <div>Home</div>,
    },
    {
        path: "/login",
        element: <LoginPage />,
    },
    {
        path: "/register",
        element: <RegisterPage />,
    },
    {
        path: "/dashboard",
        element: <DashboardPage />,
    },
    {
        path: "/add-monitor",
        element: <AddMonitorPage />,
    },
    {
        path: "*",
        element: <NotFound />
    }
]);