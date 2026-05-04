import React from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth.js';
import { RiUser3Line, RiShieldCheckLine, RiCloseCircleLine, RiLogoutBoxLine, RiMailLine, RiProfileLine, RiCalendarLine } from '@remixicon/react';

const Settings = () => {
  const { user } = useSelector(state => state.auth);
  const { handleLogout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    handleLogout();
    navigate('/login', { replace: true });
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.charAt(0).toUpperCase();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!user) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <p className="text-gray-500 font-medium">Loading user data...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto bg-gray-50 flex-1 overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Account Settings</h1>
        <p className="text-[13px] text-gray-500 mt-1">
          Manage your profile and account preferences.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        {/* Profile Header */}
        <div className="px-6 py-8 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-3xl font-bold shrink-0">
            {getInitials(user.fullname)}
          </div>
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">{user.fullname}</h2>
                <p className="text-sm text-gray-500 font-medium mt-0.5">@{user.username}</p>
              </div>
              <div>
                {user.isVerified ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold tracking-wide uppercase">
                    <RiShieldCheckLine className="w-3.5 h-3.5" />
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-100 text-orange-700 text-xs font-semibold tracking-wide uppercase">
                    <RiCloseCircleLine className="w-3.5 h-3.5" />
                    Not Verified
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Profile Details Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Email */}
          <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50/50 border border-gray-50">
            <div className="p-2 bg-white rounded-md shadow-sm text-gray-400">
              <RiMailLine className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Email Address</p>
              <p className="text-sm font-medium text-gray-900">{user.email}</p>
            </div>
          </div>

          {/* Role */}
          <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50/50 border border-gray-50">
            <div className="p-2 bg-white rounded-md shadow-sm text-gray-400">
              <RiProfileLine className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Account Role</p>
              <p className="text-sm font-medium text-gray-900 capitalize">{user.role || 'User'}</p>
            </div>
          </div>

          {/* Member Since */}
          <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50/50 border border-gray-50">
            <div className="p-2 bg-white rounded-md shadow-sm text-gray-400">
              <RiCalendarLine className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Member Since</p>
              <p className="text-sm font-medium text-gray-900">{formatDate(user.createdAt)}</p>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50/50 border border-gray-50">
            <div className="p-2 bg-white rounded-md shadow-sm text-gray-400">
              <RiUser3Line className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Account Status</p>
              <p className="text-sm font-medium text-gray-900">
                {user.isBan ? (
                  <span className="text-red-600 font-semibold">Banned</span>
                ) : (
                  <span className="text-emerald-600 font-semibold">Active</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 border border-red-100 rounded-xl p-6">
        <h3 className="text-lg font-bold text-red-900 tracking-tight mb-2">Danger Zone</h3>
        <p className="text-sm text-red-700 mb-4">
          Logging out will require you to enter your credentials again to access your dashboard.
        </p>
        <button 
          onClick={onLogout}
          className="bg-white border-2 border-red-200 text-red-700 hover:bg-red-600 hover:border-red-600 hover:text-white font-semibold py-2 px-6 rounded-lg transition-colors flex items-center gap-2 shadow-sm text-sm"
        >
          <RiLogoutBoxLine className="w-4 h-4" />
          Secure Logout
        </button>
      </div>
    </div>
  );
};

export default Settings;