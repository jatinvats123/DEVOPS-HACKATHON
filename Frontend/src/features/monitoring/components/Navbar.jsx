import React from 'react';
import { useSelector } from 'react-redux';
import { RiNotification3Line, RiMenuLine } from "@remixicon/react";

const Navbar = ({ onMobileMenuToggle }) => {
  const { user } = useSelector(state => state.auth);

  return (
    <header className="px-6 lg:px-10 py-6 lg:py-10 flex items-center justify-between bg-transparent z-10 shrink-0">
      <div className="flex items-center gap-4 lg:gap-6">
        <button 
          onClick={onMobileMenuToggle}
          className="p-2 -ml-2 text-[#141413] hover:bg-[#f5f0e8] rounded-xl lg:hidden transition-colors"
          aria-label="Toggle Menu"
        >
          <RiMenuLine className="w-6 h-6" />
        </button>
        <div>
          <h1 className="luxury-heading text-2xl lg:text-3xl leading-none">
            Overview
          </h1>
        </div>
      </div>
      
      <div className="flex items-center gap-4 lg:gap-6">
        <div className="relative group">
          <RiNotification3Line className="w-6 h-6 text-[#6c6a64] hover:text-[#cc785c] cursor-pointer transition-colors" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-[#cc785c] rounded-full"></span>
        </div>
        <div className="flex items-center gap-3 lg:gap-4 border border-[#e6dfd8] rounded-full pl-2 pr-2 lg:pr-4 py-1.5 hover:bg-white transition-all cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-[#cc785c] flex items-center justify-center text-white text-xs font-medium">
            {user?.fullname?.[0] || 'U'}
          </div>
          <span className="text-sm font-medium text-[#141413] hidden sm:block truncate max-w-[100px]">
            {user?.fullname || user?.username}
          </span>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
