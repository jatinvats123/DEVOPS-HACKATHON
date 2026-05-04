import React from 'react';
import { RiAddLine, RiNotification3Line } from "@remixicon/react";

const Icons = {
  Plus: () => <RiAddLine className="w-4 h-4" />,
  Bell: () => <RiNotification3Line className="w-5 h-5" />,
};

const Navbar = ({ onAddMonitorClick }) => {
  return (
    <header className="px-8 py-5 flex items-center justify-between bg-white border-b border-gray-100 z-10 shadow-sm shrink-0">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight capitalize">
          Overview
        </h1>
        <p className="text-[13px] text-gray-500 mt-1">
          Monitor your services and infrastructure.
        </p>
      </div>
      <div className="flex items-center gap-5">
        <button onClick={onAddMonitorClick} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm">
          <Icons.Plus /> Add Monitor
        </button>
        <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors border border-gray-200">
          <Icons.Bell />
          <span className="absolute top-0 right-0 -mt-1 -mr-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
            3
          </span>
        </button>
        <div className="w-9 h-9 rounded-full bg-gray-200 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center text-gray-600 text-sm font-bold">
          AD
        </div>
      </div>
    </header>
  );
};

export default Navbar;
