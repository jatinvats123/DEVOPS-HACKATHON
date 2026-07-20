import { useEffect } from 'react';

const Notification = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const isError = type === 'error';

  return (
    <div className="fixed bottom-8 right-8 z-[100] animate-in slide-in-from-bottom duration-300">
      <div className={`
        flex items-center gap-4 px-8 py-4 rounded-2xl shadow-2xl border
        ${isError 
          ? 'bg-red-50 border-red-100 text-red-800' 
          : 'bg-[#141413] border-[#141413] text-white'}
      `}>
        <div className={`w-2 h-2 rounded-full ${isError ? 'bg-red-500' : 'bg-[#cc785c]'}`}></div>
        <p className="text-sm font-medium tracking-tight">{message}</p>
        <button 
          onClick={onClose}
          className={`ml-4 text-xs font-bold uppercase tracking-widest ${isError ? 'text-red-400' : 'text-[#6c6a64]'} hover:text-[#cc785c] transition-colors`}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};

export default Notification;
