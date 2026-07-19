import { createBrowserRouter, Outlet } from "react-router";
import NotFound from "./NotFound";
import Navbar from "../components/common/Navbar";
import ProtectedRoute from "../components/common/ProtectedRoute";
import ChatWidget from "../features/chat/ChatWidget";
import Home from "../pages/Home";
import Login from "../pages/Login";
import Register from "../pages/Register";
import ForgotPassword from "../pages/ForgotPassword";
import ResetPassword from "../pages/ResetPassword";
import Dashboard from "../pages/Dashboard";
import MonitorDetail from "../pages/MonitorDetail";
import Settings from "../pages/Settings";

const Layout = () => (
  <div className="flex min-h-screen flex-col bg-surface">
    <Navbar />
    <main className="flex-1">
      <Outlet />
    </main>
    <ChatWidget />
  </div>
);

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/login", element: <Login /> },
      { path: "/register", element: <Register /> },
      { path: "/forgot-password", element: <ForgotPassword /> },
      { path: "/reset-password/:token", element: <ResetPassword /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: "/dashboard", element: <Dashboard /> },
          { path: "/monitors/:monitorId", element: <MonitorDetail /> },
          { path: "/settings", element: <Settings /> },
        ],
      },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
