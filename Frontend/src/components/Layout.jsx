import React, { useState } from 'react';
import { Outlet } from 'react-router';
import Sidebar from '../features/monitoring/components/Sidebar';

import AddMonitoring from '../features/monitoring/components/AddMonitoring';
import Navbar from '../features/monitoring/components/Navbar';

const Layout = () => {
  const [isAddOpen, setIsAddOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onAddMonitorClick={() => setIsAddOpen(true)} />
        <Outlet />
      </div>
      <AddMonitoring isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
    </div>
  );
};

export default Layout;
