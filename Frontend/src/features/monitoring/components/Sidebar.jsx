import React from 'react';
import { NavLink, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useAuth } from "../../auth/hooks/useAuth";
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
  RiLogoutBoxLine,
  RiCloseLine
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
  Close: () => <RiCloseLine className="w-6 h-6" />,
};

const Sidebar = ({ isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const navigate = useNavigate();
  const { handleLogout } = useAuth();
  const { user } = useSelector(state => state.auth);

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

  const getInitials = (fullname) => {
    if (!fullname) return 'U';
    return fullname.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const closeMobileMenu = () => {
    if (setIsMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Content */}
      <aside 
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-[260px] lg:w-[240px] bg-gradient-to-b from-blue-900 to-indigo-900 text-gray-300 flex flex-col flex-shrink-0
          h-screen
          transform transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="p-6 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white p-1.5 rounded-lg shadow-sm">
              <Icons.Logo />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg tracking-tight leading-tight">
                WATCHTOWER
              </h1>
              <p className="text-[10px] text-gray-300 font-medium tracking-wide">
                Website Monitoring
              </p>
            </div>
          </div>
          
          <button 
            onClick={closeMobileMenu}
            className="lg:hidden p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Icons.Close />
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={closeMobileMenu}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all duration-300 relative overflow-hidden ${
                  isActive
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

        <div className="p-4 border-t border-white/10 bg-indigo-900/50 mt-auto">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold text-sm shadow-inner flex-shrink-0">
                {getInitials(user?.fullname)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white leading-tight truncate">
                  {user?.fullname || 'User'}
                </p>
                <p className="text-[11px] text-gray-300 truncate">
                  {user?.email || 'user@example.com'}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogoutClick}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-all duration-300 font-medium text-sm border border-red-500/20"
          >
            <RiLogoutBoxLine className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;