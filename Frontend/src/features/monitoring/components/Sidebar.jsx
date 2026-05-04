
import { NavLink, useNavigate } from "react-router";
import { useSelector } from "react-redux";
import { useState } from "react";
import {
  RiDashboardLine,
  RiMacbookLine,
  RiAlertLine,
  RiNotification3Line,
  RiHeartPulseLine,
  RiTeamLine,
  RiSettings4Line,
  RiBankCardLine,
  RiPulseLine,
  RiArrowDownSLine,
  RiLogoutBoxLine
} from "@remixicon/react";
import Notification, { ConfirmDialog } from "../../../components/Notification";

const Icons = {
  Logo: () => <RiPulseLine className="w-5 h-5 text-indigo-600" />,
  Dashboard: () => <RiDashboardLine className="w-5 h-5" />,
  Monitors: () => <RiMacbookLine className="w-5 h-5" />,
  Incidents: () => <RiAlertLine className="w-5 h-5" />,
  Alerts: () => <RiNotification3Line className="w-5 h-5" />,
  Status: () => <RiHeartPulseLine className="w-5 h-5" />,
  Team: () => <RiTeamLine className="w-5 h-5" />,
  Settings: () => <RiSettings4Line className="w-5 h-5" />,
  Billing: () => <RiBankCardLine className="w-5 h-5" />,
  ChevronDown: () => <RiArrowDownSLine className="w-4 h-4" />,
  Logout: () => <RiLogoutBoxLine className="w-4 h-4" />,
};

import { useAuth } from "../../auth/hooks/useAuth";

const Sidebar = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { handleLogout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notification, setNotification] = useState(null);

  const getInitials = (name) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const menuItems = [
    { name: "Dashboard", icon: Icons.Dashboard, path: "/dashboard" },
    { name: "Monitors", icon: Icons.Monitors, path: "/monitors" },
    { name: "Incidents", icon: Icons.Incidents, path: "/incidents" },
    { name: "Alerts", icon: Icons.Alerts, path: "/alerts" },
    { name: "Status Pages", icon: Icons.Status, path: "/status-pages" },
    { name: "Settings", icon: Icons.Settings, path: "/settings" },
  ];

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = async () => {
    try {
      setIsLoggingOut(true);
      await handleLogout();
      setNotification({ message: 'Logged out successfully!', type: 'success' });
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1000);
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Logout failed. Please try again.';
      setNotification({ message: errorMessage, type: 'error' });
      setShowLogoutConfirm(false);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <aside className="flex flex-col h-full bg-linear-to-b from-gray-900 to-gray-800">
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all duration-300 relative overflow-hidden ${isActive
                ? "bg-white/10 text-white shadow-sm"
                : "text-gray-300 hover:bg-white/5 hover:text-white hover:translate-x-1"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-400 rounded-r-md"></div>
                )}
                <div className="relative z-10 flex items-center gap-3">
                  <item.icon />
                  {item.name}
                </div>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="flex flex-col gap-2 p-4 border-t border-white/10">
        <div
          className="p-3 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          title="View profile"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold text-sm shadow-inner">
              {getInitials(user?.fullname || user?.username)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white leading-tight truncate">
                {user?.fullname || user?.username || "Guest User"}
              </p>
              <p className="text-xs text-gray-300 truncate font-normal">
                {user?.email || "No email available"}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogoutClick}
          className="w-full px-4 py-2.5 bg-red-600/10 hover:bg-red-600/20 text-red-400 hover:text-red-300 border border-red-600/30 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2"
          title="Logout from your account"
          disabled={isLoggingOut}
        >
          <Icons.Logout />
          {isLoggingOut ? 'Logging out...' : 'Logout'}
        </button>
      </div>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Confirm Logout"
        message="Are you sure you want to log out? You will need to log in again to access your account."
        confirmText="Logout"
        cancelText="Cancel"
        type="warning"
        isLoading={isLoggingOut}
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </aside>
  );
};

export default Sidebar;