import { useState } from 'react';
import { Outlet } from 'react-router';
import Sidebar from '../features/monitoring/components/Sidebar';
import AddMonitoring from '../features/monitoring/components/AddMonitoring';
import Navbar from '../features/monitoring/components/Navbar';
import ChatWidget from '../features/chat/ChatWidget';

import '../styles/luxury.css';

const Layout = () => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen luxury-container font-sans overflow-hidden relative">
      <Sidebar
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />
      <div className="flex-1 flex flex-col min-w-0 max-w-full h-screen overflow-hidden w-full relative">
        <Navbar
          onAddMonitorClick={() => setIsAddOpen(true)}
          onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          isMobileMenuOpen={isMobileMenuOpen}
        />
        {/* overflow-x-hidden as a backstop: one over-wide child should scroll
            inside its own container, never push the whole page sideways.
            Safe-area insets are applied once here rather than per page — env()
            is 0 on hardware without a notch, so desktop is unaffected. */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative w-full h-full pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
          <Outlet />
        </div>
      </div>
      <AddMonitoring isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
      <ChatWidget />
    </div>
  );
};

export default Layout;
