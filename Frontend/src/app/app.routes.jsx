import { createBrowserRouter } from "react-router";
import NotFound from "./NotFound";
import Login from "../features/auth/pages/Login";
import Register from "../features/auth/pages/Register";

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
    },
    {
        path: "/login",
        element: <Login />
    },
    {
        path: "/register",
        element:<Register />
    }
]);