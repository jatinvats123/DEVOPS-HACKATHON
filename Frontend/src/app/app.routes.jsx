import { createBrowserRouter } from "react-router";
import NotFound from "./NotFound";
import Login from "../features/auth/pages/Login";
import Register from "../features/auth/pages/Register";
import Dashboard from "../features/monitoring/pages/Dashboard";

export const router = createBrowserRouter([
  {
    path: "/register",
    element: <Register />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/",
    element: <Dashboard />,
  },
  //   {
  //     path: "/add-monitor",
  //     element: <AddMonitorPage />,
  //   },
  {
    path: "*",
    element: <NotFound />,
  },
]);
