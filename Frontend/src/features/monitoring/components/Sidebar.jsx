
import { NavLink, useNavigate } from "react-router";
import { useSelector } from "react-redux";
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
    handleLogout();
    navigate('/login', { replace: true });
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

      <div
        onClick={handleLogoutClick}
        className="p-4 border-t border-white/10 hover:bg-white/5 transition-colors cursor-pointer group"
        title="Logout"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold text-sm shadow-inner group-hover:bg-indigo-400 transition-colors">
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
          <Icons.Logout />
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;