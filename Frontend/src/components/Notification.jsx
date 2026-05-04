import React, { useEffect } from 'react';
import { RiCheckLine, RiCloseLine, RiAlertLine, RiInformationLine } from '@remixicon/react';

const Notification = ({ message, type = 'success', onClose, autoClose = 3000 }) => {
  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(onClose, autoClose);
      return () => clearTimeout(timer);
    }
  }, [autoClose, onClose]);

  const typeStyles = {
    success: {
      container: 'bg-emerald-50 border-emerald-200',
      text: 'text-emerald-700',
      icon: <RiCheckLine className="w-5 h-5" />,
    },
    error: {
      container: 'bg-red-50 border-red-200',
      text: 'text-red-700',
      icon: <RiAlertLine className="w-5 h-5" />,
    },
    warning: {
      container: 'bg-amber-50 border-amber-200',
      text: 'text-amber-700',
      icon: <RiAlertLine className="w-5 h-5" />,
    },
    info: {
      container: 'bg-blue-50 border-blue-200',
      text: 'text-blue-700',
      icon: <RiInformationLine className="w-5 h-5" />,
    },
  };

  const style = typeStyles[type] || typeStyles.success;

  return (
    <div
      className={`fixed top-4 right-4 ${style.container} border rounded-lg px-4 py-3 text-sm ${style.text} shadow-lg animate-in slide-in-from-top duration-300 z-50 flex items-center gap-3`}
    >
      <div>{style.icon}</div>
      <span>{message}</span>
      <button
        onClick={onClose}
        className="ml-2 hover:opacity-70 transition-opacity"
      >
        <RiCloseLine className="w-4 h-4" />
      </button>
    </div>
  );
};

export const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel', isLoading = false, type = 'info' }) => {
  if (!isOpen) return null;

  const typeStyles = {
    danger: 'bg-red-600 hover:bg-red-700',
    warning: 'bg-amber-600 hover:bg-amber-700',
    info: 'bg-indigo-600 hover:bg-indigo-700',
    success: 'bg-emerald-600 hover:bg-emerald-700',
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2">{title}</h2>
          <p className="text-gray-600 text-sm mb-6">{message}</p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`flex-1 px-4 py-2 ${typeStyles[type]} text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {confirmText}...
                </>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notification;
