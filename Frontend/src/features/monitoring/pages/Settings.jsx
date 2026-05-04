import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { 
  RiSettings4Line, 
  RiUserLine, 
  RiNotification3Line, 
  RiLockLine, 
  RiShieldCheckLine,
  RiMailLine
} from '@remixicon/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth.js';
import { RiUser3Line, RiShieldCheckLine, RiCloseCircleLine, RiLogoutBoxLine, RiMailLine, RiProfileLine, RiCalendarLine } from '@remixicon/react';

const Settings = () => {
  const { user } = useSelector(state => state.auth);
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', name: 'Profile', icon: RiUserLine },
    { id: 'notifications', name: 'Notifications', icon: RiNotification3Line },
    { id: 'security', name: 'Security', icon: RiLockLine },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <RiSettings4Line className="w-7 h-7 text-gray-600" />
          Settings
        </h1>
        <p className="text-[13px] text-gray-500 mt-1">
          Manage your account preferences and notification settings.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Tabs */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                    : 'text-gray-500 hover:bg-white hover:text-gray-900'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 max-w-3xl">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {activeTab === 'profile' && (
              <div className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Profile Settings</h3>
                <div className="space-y-6">
                  <div className="flex items-center gap-6 pb-6 border-b border-gray-50">
                    <div className="w-20 h-20 bg-indigo-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                      {user?.fullname?.[0] || user?.username?.[0] || '?'}
                    </div>
                    <div>
                      <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-sm mb-2">
                        Change Photo
                      </button>
                      <p className="text-[11px] text-gray-400">JPG, GIF or PNG. Max size of 800K</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Full Name</label>
                      <input 
                        type="text" 
                        defaultValue={user?.fullname}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Email Address</label>
                      <input 
                        type="email" 
                        defaultValue={user?.email}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Bio</label>
                    <textarea 
                      rows="3"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none resize-none"
                      placeholder="Tell us a bit about yourself..."
                    ></textarea>
                  </div>

                  <div className="pt-4">
                    <button className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all shadow-md active:scale-95">
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Notification Preferences</h3>
                <div className="space-y-4">
                  {[
                    { title: 'Incident Alerts', desc: 'Get notified when a monitor goes down or up.', icon: RiAlertLine },
                    { title: 'Weekly Reports', desc: 'Summary of your systems uptime and performance.', icon: RiHistoryLine },
                    { title: 'Security Notifications', desc: 'Alerts for login attempts from new devices.', icon: RiShieldCheckLine },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start justify-between p-4 rounded-xl border border-gray-50 hover:bg-gray-50 transition-colors">
                      <div className="flex gap-3">
                        <div className="mt-1">
                          <RiMailLine className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                          <p className="text-xs text-gray-500">{item.desc}</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked={idx === 0} />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {activeTab === 'security' && (
              <div className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Security Settings</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Current Password</label>
                    <input 
                      type="password" 
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:bg-white outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">New Password</label>
                      <input 
                        type="password" 
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:bg-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Confirm New Password</label>
                      <input 
                        type="password" 
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:bg-white outline-none"
                      />
                    </div>
                  </div>
                  <div className="pt-4 flex items-center justify-between">
                    <button className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all shadow-md active:scale-95">
                      Update Password
                    </button>
                    <button className="text-sm font-medium text-red-600 hover:text-red-700">
                      Enable Two-Factor Auth
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Internal icon mappings for convenience
const RiAlertLine = ({ className }) => <RiNotification3Line className={className} />;
const RiHistoryLine = ({ className }) => <RiSettings4Line className={className} />;

export default Settings;