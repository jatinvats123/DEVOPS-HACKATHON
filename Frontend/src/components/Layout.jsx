import React, { useState } from 'react';
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
      <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden w-full relative">
        <Navbar 
          onAddMonitorClick={() => setIsAddOpen(true)} 
          onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
        />
        <div className="flex-1 overflow-y-auto relative w-full h-full">
          <Outlet />
        </div>
      </div>
      <AddMonitoring isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
      <ChatWidget />
    </div>
  );
};

export default Layout;
