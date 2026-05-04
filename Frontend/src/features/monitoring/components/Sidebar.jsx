import { NavLink, useNavigate } from "react-router";
import { useSelector } from "react-redux";
import {
  RiDashboardLine,
  RiMacbookLine,
  RiAlertLine,
  RiNotification3Line,
  RiHeartPulseLine,
  RiSettings4Line,
  RiPulseLine,
  RiLogoutBoxLine,
  RiCloseLine
} from "@remixicon/react";
import { useAuth } from "../../auth/hooks/useAuth";

const Sidebar = ({ isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { handleLogout } = useAuth();

  const menuItems = [
    { name: "Dashboard", icon: RiDashboardLine, path: "/dashboard" },
    { name: "Monitors", icon: RiMacbookLine, path: "/monitors" },
    { name: "Incidents", icon: RiAlertLine, path: "/incidents" },
    { name: "Alerts", icon: RiNotification3Line, path: "/alerts" },
    { name: "Status Pages", icon: RiHeartPulseLine, path: "/status-pages" },
    { name: "Settings", icon: RiSettings4Line, path: "/settings" },
  ];

  const handleLogoutClick = () => {
    handleLogout();
    navigate('/login', { replace: true });
    if (setIsMobileMenuOpen) setIsMobileMenuOpen(false);
  };

  const closeMobileMenu = () => {
    if (setIsMobileMenuOpen) setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-[#141413]/40 backdrop-blur-sm z-[60] lg:hidden"
          onClick={closeMobileMenu}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-[70] w-[280px] flex flex-col h-full luxury-sidebar transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:block
      `}>
        <div className="px-8 py-12 mb-4 flex items-center justify-between">
          <h2 className="luxury-heading text-2xl flex items-center gap-3">
            <RiPulseLine className="w-8 h-8 text-[#cc785c]" />
            WatchTower
          </h2>
          <button
            onClick={closeMobileMenu}
            className="p-2 text-[#6c6a64] hover:text-[#cc785c] lg:hidden"
          >
            <RiCloseLine className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 px-0 py-2 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={closeMobileMenu}
              className={({ isActive }) =>
                `group flex items-center gap-4 luxury-sidebar-item ${isActive
                  ? "active"
                  : ""
                }`
              }
            >
              <item.icon className="w-5 h-5 transition-colors group-hover:text-[#cc785c]" />
              <span className="tracking-tight">{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-8 border-t border-[#e6dfd8]">
          <div className="flex items-center gap-4 p-4 rounded-xl hover:bg-white transition-all cursor-pointer group">
            <div className="w-10 h-10 rounded-full bg-[#cc785c] flex items-center justify-center text-white font-medium">
              {user?.fullname?.[0] || user?.username?.[0] || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#141413] truncate">{user?.fullname || user?.username}</p>
              <p className="text-[11px] text-[#6c6a64] truncate">Free Plan</p>
            </div>
            <button
              onClick={handleLogoutClick}
              className="text-[#6c6a64] hover:text-[#cc785c] transition-colors"
            >
              <RiLogoutBoxLine className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;