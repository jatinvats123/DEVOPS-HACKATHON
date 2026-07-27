import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import {
  RiUserLine,
  RiLockLine,
  RiEyeLine,
  RiEyeOffLine,
  RiNotification3Line,
  RiMailLine,
} from '@remixicon/react';
import { useAuth } from '../../auth/hooks/useAuth';
import { updateProfile } from '../../auth/services/auth.api';
import { setUser } from '../../auth/state/authSlice';
import Notification from '../../../components/Notification';

const Settings = () => {
  const { user } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState('profile');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [notification, setNotification] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const { handleChangePassword } = useAuth();
  const dispatch = useDispatch();
  const fileRef = useRef(null);

  // Avatar + preferences are persisted via PATCH /api/auth/profile
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [uploading, setUploading] = useState(false);
  const [prefs, setPrefs] = useState({
    incidentAlerts: true,
    weeklyDigest: false,
    securityAlerts: true,
  });
  const [savingPref, setSavingPref] = useState(null);

  useEffect(() => {
    setAvatar(user?.avatar || '');
    if (user?.preferences) {
      setPrefs((p) => ({ ...p, ...user.preferences }));
    }
  }, [user]);

  const onAvatarPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;

    if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) {
      setNotification({
        message: 'Please choose a PNG, JPG, WEBP or GIF image.',
        type: 'error',
      });
      return;
    }
    if (file.size > 800 * 1024) {
      setNotification({
        message: 'Image is too large. Max size is 800KB.',
        type: 'error',
      });
      return;
    }

    setUploading(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Could not read that file'));
        reader.readAsDataURL(file);
      });

      const res = await updateProfile({ avatar: dataUrl });
      setAvatar(res?.data?.avatar || dataUrl);
      if (res?.data) dispatch(setUser(res.data));
      setNotification({ message: 'Avatar updated', type: 'success' });
    } catch (err) {
      setNotification({
        message:
          err.response?.data?.message || err.message || 'Avatar upload failed',
        type: 'error',
      });
    } finally {
      setUploading(false);
    }
  };

  const onTogglePref = async (key) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setSavingPref(key);
    try {
      const res = await updateProfile({ preferences: { [key]: next[key] } });
      if (res?.data) dispatch(setUser(res.data));
    } catch (err) {
      setPrefs(prefs); // revert
      setNotification({
        message: err.response?.data?.message || 'Failed to save preference',
        type: 'error',
      });
    } finally {
      setSavingPref(null);
    }
  };

  const tabs = [
    { id: 'profile', name: 'Profile Account', icon: RiUserLine },
    { id: 'notifications', name: 'Preferences', icon: RiNotification3Line },
    { id: 'security', name: 'Security & Keys', icon: RiLockLine },
  ];

  const onPasswordSubmit = async (data) => {
    if (data.newPassword !== data.confirmPassword) {
      setNotification({ message: 'Passwords do not match!', type: 'error' });
      return;
    }
    try {
      // the API expects `oldPassword` — sending `currentPassword` made the
      // backend see an empty old password and reject with "Invalid password"
      await handleChangePassword({
        oldPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      reset();
      setNotification({
        message: 'Password updated successfully!',
        type: 'success',
      });
    } catch (error) {
      console.error('Password change error:', error);
      setNotification({
        message: error.response?.data?.message || 'Failed to update password',
        type: 'error',
      });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-12 luxury-container">
      <div className="mb-16">
        <h1 className="luxury-heading text-4xl">Account Settings</h1>
        <p className="luxury-subtext mt-3">
          Manage your personal preferences, security settings, and notification
          delivery.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-16">
        {/* Sidebar Tabs */}
        <div className="w-full lg:w-72 flex-shrink-0">
          <nav className="flex flex-col gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`luxury-sidebar-item ${
                  activeTab === tab.id ? 'active' : ''
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium tracking-tight">{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 max-w-4xl">
          <div className="bg-white border border-[#e6dfd8] rounded-2xl shadow-sm p-12 overflow-hidden">
            {activeTab === 'profile' && (
              <div className="luxury-fade-in">
                <h3 className="luxury-heading text-2xl mb-12">
                  Personal Details
                </h3>
                <div className="space-y-12">
                  <div className="flex items-center gap-12 pb-12 border-b border-[#e6dfd8]">
                    <div className="w-24 h-24 bg-[#cc785c] rounded-full flex items-center justify-center text-white text-3xl font-medium overflow-hidden">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        user?.fullname?.[0] || user?.username?.[0] || '?'
                      )}
                    </div>
                    <div>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                        onChange={onAvatarPick}
                      />
                      <div className="flex items-center gap-3 mb-3">
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          disabled={uploading}
                          className="luxury-button-outline py-2 px-6 text-xs disabled:opacity-60"
                        >
                          {uploading ? 'Uploading…' : 'Upload New Avatar'}
                        </button>
                        {avatar && !uploading && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const res = await updateProfile({ avatar: '' });
                                setAvatar('');
                                if (res?.data) dispatch(setUser(res.data));
                                setNotification({
                                  message: 'Avatar removed',
                                  type: 'success',
                                });
                              } catch {
                                setNotification({
                                  message: 'Failed to remove avatar',
                                  type: 'error',
                                });
                              }
                            }}
                            className="text-xs font-semibold text-[#6c6a64] hover:text-red-600"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-[#6c6a64]">
                        JPG or PNG. Max size 800KB.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="form-group">
                      <label className="luxury-label">Full Name</label>
                      <div className="p-4 bg-[#faf9f5] border border-[#e6dfd8] rounded-xl text-[#141413]">
                        {user?.fullname || 'N/A'}
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="luxury-label">Email Address</label>
                      <div className="p-4 bg-[#faf9f5] border border-[#e6dfd8] rounded-xl text-[#141413]">
                        {user?.email || 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="form-group">
                      <label className="luxury-label">Username</label>
                      <div className="p-4 bg-[#faf9f5] border border-[#e6dfd8] rounded-xl text-[#141413]">
                        @{user?.username || 'N/A'}
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="luxury-label">Role</label>
                      <div className="p-4 bg-[#faf9f5] border border-[#e6dfd8] rounded-xl text-[#141413] capitalize">
                        {user?.role || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="luxury-fade-in">
                <h3 className="luxury-heading text-2xl mb-12">
                  Dispatch Preferences
                </h3>
                <div className="space-y-4">
                  {[
                    {
                      key: 'incidentAlerts',
                      title: 'Incident Alerts',
                      desc: 'Real-time service outage notifications via email.',
                    },
                    {
                      key: 'weeklyDigest',
                      title: 'Weekly Digest',
                      desc: 'A summary of your infrastructure performance.',
                    },
                    {
                      key: 'securityAlerts',
                      title: 'Security Alerts',
                      desc: 'Notifications about login attempts and API key usage.',
                    },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between p-8 bg-[#faf9f5] border border-[#e6dfd8] rounded-2xl hover:border-[#cc785c]/30 transition-all"
                    >
                      <div className="flex gap-8 items-center">
                        <RiMailLine className="w-6 h-6 text-[#cc785c]" />
                        <div>
                          <p className="text-base font-semibold text-[#141413]">
                            {item.title}
                          </p>
                          <p className="text-sm text-[#6c6a64] mt-1">
                            {item.desc}
                          </p>
                        </div>
                      </div>
                      <label
                        className={`relative inline-flex items-center cursor-pointer ${savingPref === item.key ? 'opacity-60' : ''}`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={!!prefs[item.key]}
                          disabled={savingPref === item.key}
                          onChange={() => onTogglePref(item.key)}
                        />
                        <div className="w-12 h-6 bg-[#e6dfd8] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#cc785c]"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="luxury-fade-in">
                <h3 className="luxury-heading text-2xl mb-12">
                  Security Credentials
                </h3>
                <form
                  onSubmit={handleSubmit(onPasswordSubmit)}
                  className="space-y-12"
                >
                  <div className="form-group">
                    <label className="luxury-label">Current Password</label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        {...register('currentPassword', {
                          required: 'Current password is required',
                        })}
                        className={`luxury-input ${errors.currentPassword ? 'border-red-400' : ''}`}
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowCurrentPassword(!showCurrentPassword)
                        }
                        className="absolute right-0 top-1/2 -translate-y-1/2 text-[#6c6a64] hover:text-[#cc785c] transition-colors"
                      >
                        {showCurrentPassword ? (
                          <RiEyeOffLine className="w-5 h-5" />
                        ) : (
                          <RiEyeLine className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    {errors.currentPassword && (
                      <p className="text-xs text-red-400 mt-2">
                        {errors.currentPassword.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="form-group">
                      <label className="luxury-label">New Password</label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          {...register('newPassword', {
                            required: 'New password is required',
                            minLength: {
                              value: 6,
                              message: 'Password must be at least 6 characters',
                            },
                          })}
                          className={`luxury-input ${errors.newPassword ? 'border-red-400' : ''}`}
                          placeholder="Create new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-0 top-1/2 -translate-y-1/2 text-[#6c6a64] hover:text-[#cc785c] transition-colors"
                        >
                          {showNewPassword ? (
                            <RiEyeOffLine className="w-5 h-5" />
                          ) : (
                            <RiEyeLine className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                      {errors.newPassword && (
                        <p className="text-xs text-red-400 mt-2">
                          {errors.newPassword.message}
                        </p>
                      )}
                    </div>
                    <div className="form-group">
                      <label className="luxury-label">Confirm Password</label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          {...register('confirmPassword', {
                            required: 'Please confirm your password',
                          })}
                          className={`luxury-input ${errors.confirmPassword ? 'border-red-400' : ''}`}
                          placeholder="Repeat new password"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute right-0 top-1/2 -translate-y-1/2 text-[#6c6a64] hover:text-[#cc785c] transition-colors"
                        >
                          {showConfirmPassword ? (
                            <RiEyeOffLine className="w-5 h-5" />
                          ) : (
                            <RiEyeLine className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                      {errors.confirmPassword && (
                        <p className="text-xs text-red-400 mt-2">
                          {errors.confirmPassword.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-8 flex items-center justify-between">
                    <button
                      type="submit"
                      className="luxury-button-primary px-12"
                    >
                      Update Password
                    </button>
                    <button
                      type="button"
                      className="text-sm font-medium text-[#cc785c] hover:underline"
                    >
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
