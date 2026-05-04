
import { NavLink } from "react-router";
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
  RiArrowDownSLine
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
};

const Sidebar = () => {
  const menuItems = [
    { name: "Dashboard", icon: Icons.Dashboard, path: "/" },
    { name: "Monitors", icon: Icons.Monitors, path: "/monitors" },
    { name: "Incidents", icon: Icons.Incidents, path: "/incidents" },
    { name: "Alerts", icon: Icons.Alerts, path: "/alerts" },
    { name: "Status Pages", icon: Icons.Status, path: "/status-pages" },
    { name: "Team", icon: Icons.Team, path: "/team" },
    { name: "Settings", icon: Icons.Settings, path: "/settings" },
    { name: "Billing", icon: Icons.Billing, path: "/billing" },
  ];

  return (
    <aside className="w-[240px] bg-gradient-to-b from-blue-900 to-indigo-900 text-gray-300 flex-shrink-0 h-screen hidden lg:flex flex-col">
      <div className="p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-white p-1.5 rounded-lg shadow-sm">
            <Icons.Logo />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg tracking-tight leading-tight">
              UptimeAI
            </h1>
            <p className="text-[10px] text-gray-300 font-medium tracking-wide">
              Website Monitoring Platform
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                isActive
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-gray-300 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <item.icon />
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10 hover:bg-white/5 transition-colors cursor-pointer">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold text-sm shadow-inner">
              AD
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white leading-tight truncate">
                Arjun Dev
              </p>
              <p className="text-xs text-gray-300 truncate">
                arjun@example.com
              </p>
            </div>
          </div>
          <Icons.ChevronDown />
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;