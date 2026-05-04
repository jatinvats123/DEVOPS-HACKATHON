import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import {
  RiUserLine,
  RiLockLine,
  RiEyeLine,
  RiEyeOffLine,
  RiNotification3Line,
  RiMailLine
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
    { id: 'notifications', name: 'Preferences', icon: RiNotification3Line },
    { id: 'security', name: 'Security', icon: RiLockLine },
  ];

  const onPasswordSubmit = async (data) => {
    if (data.newPassword !== data.confirmPassword) {
      setNotification({ message: 'Passwords do not match!', type: 'error' });
      return;
    }
    try {
      await handleChangePassword({
        oldPassword: data.currentPassword,
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
    <div className="flex-1 overflow-y-auto p-6 lg:p-12 luxury-container">
      <div className="mb-10 lg:mb-16">
        <h1 className="luxury-heading text-3xl lg:text-4xl">
          Account Settings
        </h1>
        <p className="luxury-subtext mt-3">
          Manage your personal preferences, security settings, and notification delivery.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-16">
        {/* Sidebar Tabs */}
        <div className="w-full lg:w-64 flex-shrink-0 overflow-x-auto -mx-6 px-6 lg:mx-0 lg:px-0">
          <nav className="flex lg:flex-col gap-2 min-w-max lg:min-w-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`luxury-sidebar-item !m-0 ${activeTab === tab.id
                    ? 'active'
                    : ''
                  }`}
              >
                <tab.icon className="w-4 lg:w-5 h-4 lg:h-5" />
                <span className="font-medium tracking-tight whitespace-nowrap">{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 max-w-4xl">
          <div className="bg-white border border-[#e6dfd8] rounded-3xl shadow-sm p-6 lg:p-12 overflow-hidden">
            {activeTab === 'profile' && (
              <div className="luxury-fade-in">
                <h3 className="luxury-heading text-xl lg:text-2xl mb-8 lg:mb-12">Personal Details</h3>
                <div className="space-y-8 lg:space-y-12">
                  <div className="flex flex-col sm:flex-row items-center gap-8 lg:gap-12 pb-8 lg:pb-12 border-b border-[#e6dfd8]">
                    <div className="w-20 lg:w-24 h-20 lg:h-24 bg-[#cc785c] rounded-full flex items-center justify-center text-white text-2xl lg:text-3xl font-medium shrink-0">
                      {user?.fullname?.[0] || user?.username?.[0] || '?'}
                    </div>
                    <div className="text-center sm:text-left">
                      <button className="luxury-button-outline py-2 px-6 text-xs mb-3">
                        Upload New Avatar
                      </button>
                      <p className="text-xs text-[#6c6a64]">JPG or PNG. Max size 800KB.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                    <div className="form-group">
                      <label className="luxury-label">Full Name</label>
                      <div className="p-4 bg-[#faf9f5] border border-[#e6dfd8] rounded-xl text-[#141413] text-sm lg:text-base">
                        {user?.fullname || 'N/A'}
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="luxury-label">Email Address</label>
                      <div className="p-4 bg-[#faf9f5] border border-[#e6dfd8] rounded-xl text-[#141413] text-sm lg:text-base">
                        {user?.email || 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                    <div className="form-group">
                      <label className="luxury-label">Username</label>
                      <div className="p-4 bg-[#faf9f5] border border-[#e6dfd8] rounded-xl text-[#141413] text-sm lg:text-base">
                        @{user?.username || 'N/A'}
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="luxury-label">Role</label>
                      <div className="p-4 bg-[#faf9f5] border border-[#e6dfd8] rounded-xl text-[#141413] text-sm lg:text-base capitalize">
                        {user?.role || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="luxury-fade-in">
                <h3 className="luxury-heading text-xl lg:text-2xl mb-8 lg:mb-12">Dispatch Preferences</h3>
                <div className="space-y-4">
                  {[
                    { title: 'Incident Alerts', desc: 'Real-time service outage notifications via email.' },
                    { title: 'Weekly Digest', desc: 'A summary of your infrastructure performance.' },
                    { title: 'Security Alerts', desc: 'Notifications about login attempts and API key usage.' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 lg:p-8 bg-[#faf9f5] border border-[#e6dfd8] rounded-2xl hover:border-[#cc785c]/30 transition-all gap-4">
                      <div className="flex gap-4 lg:gap-8 items-start sm:items-center">
                        <RiMailLine className="w-6 h-6 text-[#cc785c] shrink-0" />
                        <div>
                          <p className="text-base font-semibold text-[#141413]">{item.title}</p>
                          <p className="text-sm text-[#6c6a64] mt-1">{item.desc}</p>
                        </div>
                      </div>
                      <div className="relative inline-flex items-center cursor-pointer ml-10 sm:ml-0">
                        <input type="checkbox" className="sr-only peer" defaultChecked={idx === 0} />
                        <div className="w-12 h-6 bg-[#e6dfd8] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#cc785c]"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="luxury-fade-in">
                <h3 className="luxury-heading text-xl lg:text-2xl mb-8 lg:mb-12">Security Credentials</h3>
                <form onSubmit={handleSubmit(onPasswordSubmit)} className="space-y-8 lg:space-y-12">
                  <div className="form-group">
                    <label className="luxury-label">Current Password</label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        {...register('currentPassword', { required: 'Current password is required' })}
                        className={`luxury-input ${errors.currentPassword ? 'border-red-400' : ''}`}
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-0 top-1/2 -translate-y-1/2 text-[#6c6a64] hover:text-[#cc785c] transition-colors"
                      >
                        {showCurrentPassword ? <RiEyeOffLine className="w-5 h-5" /> : <RiEyeLine className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.currentPassword && <p className="text-xs text-red-400 mt-2">{errors.currentPassword.message}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                    <div className="form-group">
                      <label className="luxury-label">New Password</label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          {...register('newPassword', {
                            required: 'New password is required',
                            minLength: { value: 6, message: 'Password must be at least 6 characters' }
                          })}
                          className={`luxury-input ${errors.newPassword ? 'border-red-400' : ''}`}
                          placeholder="Create new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-0 top-1/2 -translate-y-1/2 text-[#6c6a64] hover:text-[#cc785c] transition-colors"
                        >
                          {showNewPassword ? <RiEyeOffLine className="w-5 h-5" /> : <RiEyeLine className="w-5 h-5" />}
                        </button>
                      </div>
                      {errors.newPassword && <p className="text-xs text-red-400 mt-2">{errors.newPassword.message}</p>}
                    </div>
                    <div className="form-group">
                      <label className="luxury-label">Confirm Password</label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          {...register('confirmPassword', { required: 'Please confirm your password' })}
                          className={`luxury-input ${errors.confirmPassword ? 'border-red-400' : ''}`}
                          placeholder="Repeat new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-0 top-1/2 -translate-y-1/2 text-[#6c6a64] hover:text-[#cc785c] transition-colors"
                        >
                          {showConfirmPassword ? <RiEyeOffLine className="w-5 h-5" /> : <RiEyeLine className="w-5 h-5" />}
                        </button>
                      </div>
                      {errors.confirmPassword && <p className="text-xs text-red-400 mt-2">{errors.confirmPassword.message}</p>}
                    </div>
                  </div>

                  <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <button type="submit" className="luxury-button-primary px-12 w-full sm:w-auto">
                      Update Password
                    </button>
                    <button type="button" className="text-sm font-medium text-[#cc785c] hover:underline">
                      Enable Multi-Factor Auth
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