import  { useState } from 'react';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { 
  RiSettings4Line, 
  RiUserLine, 
  RiLockLine, 
  RiEyeLine,
  RiEyeOffLine
} from '@remixicon/react';
import { useAuth } from '../../auth/hooks/useAuth';
import Notification from '../../../components/Notification';

const Settings = () => {
  const { user } = useSelector(state => state.auth);
  const [activeTab, setActiveTab] = useState('profile');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [notification, setNotification] = useState(null);
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    }
  });
  const { handleChangePassword } = useAuth();

  const tabs = [
    { id: 'profile', name: 'Profile', icon: RiUserLine },
   
    { id: 'security', name: 'Security', icon: RiLockLine },
  ];

  const onPasswordSubmit = async (data) => {
    if (data.newPassword !== data.confirmPassword) {
      setNotification({ message: 'Passwords do not match!', type: 'error' });
      return;
    }
    try {
      await handleChangePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      reset();
      setNotification({ message: 'Password updated successfully!', type: 'success' });
    } catch (error) {
      console.error('Password change error:', error);
      setNotification({ 
        message: error.response?.data?.message || 'Failed to update password',
        type: 'error'
      });
    }
  };

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
                  <div className="flex items-center gap-6 pb-6 border-b border-gray-200">
                    <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                      {user?.fullname?.[0] || user?.username?.[0] || '?'}
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-gray-900">{user?.fullname || 'N/A'}</h4>
                      <p className="text-sm text-gray-500">@{user?.username || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 shadow-sm">
                      <label className="block text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2">Full Name</label>
                      <p className="text-base font-semibold text-gray-900">{user?.fullname || 'N/A'}</p>
                    </div>
                    <div className="p-5 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 shadow-sm">
                      <label className="block text-[10px] font-bold text-purple-600 uppercase tracking-widest mb-2">Username</label>
                      <p className="text-base font-semibold text-gray-900">@{user?.username || 'N/A'}</p>
                    </div>
                    <div className="p-5 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 shadow-sm">
                      <label className="block text-[10px] font-bold text-green-600 uppercase tracking-widest mb-2">Email Address</label>
                      <p className="text-base font-semibold text-gray-900">{user?.email || 'N/A'}</p>
                    </div>
                    <div className="p-5 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl border border-indigo-200 shadow-sm">
                      <label className="block text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-2">Role</label>
                      <p className="text-base font-semibold text-gray-900 capitalize">{user?.role || 'N/A'}</p>
                    </div>
                    <div className="p-5 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200 shadow-sm">
                      <label className="block text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-2">Account Status</label>
                      <p className="text-base font-semibold">
                        {user?.isBan ? <span className="text-red-600">🔴 Banned</span> : <span className="text-green-600">🟢 Active</span>}
                      </p>
                    </div>
                  
                    <div className="p-5 bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl border border-pink-200 shadow-sm">
                      <label className="block text-[10px] font-bold text-pink-600 uppercase tracking-widest mb-2">Created Date</label>
                      <p className="text-base font-semibold text-gray-900">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</p>
                      <p className="text-xs text-gray-600 mt-1">{user?.createdAt ? new Date(user.createdAt).toLocaleTimeString() : ''}</p>
                    </div>
                  
                  
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Security Settings</h3>
                <form onSubmit={handleSubmit(onPasswordSubmit)} className="space-y-6">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Current Password</label>
                    <div className="relative">
                      <input 
                        type={showCurrentPassword ? 'text' : 'password'}
                        {...register('currentPassword', { required: 'Current password is required' })}
                        className={`w-full px-4 py-2.5 pr-12 bg-gray-50 border ${errors.currentPassword ? 'border-red-500' : 'border-gray-200'} rounded-lg text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all`}
                        placeholder="Enter your current password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showCurrentPassword ? <RiEyeOffLine className="w-5 h-5" /> : <RiEyeLine className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.currentPassword && <p className="text-xs text-red-500 mt-1">{errors.currentPassword.message}</p>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">New Password</label>
                      <div className="relative">
                        <input 
                          type={showNewPassword ? 'text' : 'password'}
                          {...register('newPassword', { 
                            required: 'New password is required',
                            minLength: { value: 6, message: 'Password must be at least 6 characters' }
                          })}
                          className={`w-full px-4 py-2.5 pr-12 bg-gray-50 border ${errors.newPassword ? 'border-red-500' : 'border-gray-200'} rounded-lg text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all`}
                          placeholder="Enter new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showNewPassword ? <RiEyeOffLine className="w-5 h-5" /> : <RiEyeLine className="w-5 h-5" />}
                        </button>
                      </div>
                      {errors.newPassword && <p className="text-xs text-red-500 mt-1">{errors.newPassword.message}</p>}
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Confirm New Password</label>
                      <div className="relative">
                        <input 
                          type={showConfirmPassword ? 'text' : 'password'}
                          {...register('confirmPassword', { required: 'Please confirm your password' })}
                          className={`w-full px-4 py-2.5 pr-12 bg-gray-50 border ${errors.confirmPassword ? 'border-red-500' : 'border-gray-200'} rounded-lg text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all`}
                          placeholder="Confirm new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showConfirmPassword ? <RiEyeOffLine className="w-5 h-5" /> : <RiEyeLine className="w-5 h-5" />}
                        </button>
                      </div>
                      {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>}
                    </div>
                  </div>
                  <div className="pt-4 flex items-center justify-between">
                    <button 
                      type="submit"
                      className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all shadow-md active:scale-95"
                    >
                      Update Password
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
};


export default Settings;