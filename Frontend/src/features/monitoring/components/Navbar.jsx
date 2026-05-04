
import { useSelector } from 'react-redux';
import { RiAddLine, RiNotification3Line, RiMenuLine } from "@remixicon/react";

const Icons = {
  Plus: () => <RiAddLine className="w-4 h-4 sm:w-5 sm:h-5" />,
  Bell: () => <RiNotification3Line className="w-5 h-5" />,
  Menu: () => <RiMenuLine className="w-6 h-6" />,
};

const Navbar = ({  onMobileMenuToggle }) => {
  const { user } = useSelector(state => state.auth);

  const getInitials = (fullname) => {
    if (!fullname) return 'U';
    return fullname.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <header className="px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between bg-white border-b border-gray-100 z-10 shadow-sm shrink-0">
      <div className="flex items-center gap-3">
        <button 
          onClick={onMobileMenuToggle}
          className="p-1.5 -ml-1.5 text-gray-500 hover:bg-gray-100 rounded-lg lg:hidden transition-colors"
        >
          <Icons.Menu />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight capitalize leading-none">
            Overview
          </h1>
          <p className="text-[11px] sm:text-[13px] text-gray-500 mt-1 hidden sm:block">
            Monitor your services and infrastructure.
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-5">

        <div className="hidden sm:flex w-9 h-9 rounded-full bg-indigo-500 border-2 border-white shadow-sm overflow-hidden items-center justify-center text-white text-sm font-bold" title={user?.fullname || 'User'}>
          {getInitials(user?.fullname)}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
