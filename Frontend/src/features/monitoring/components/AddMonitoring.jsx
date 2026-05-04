import { useForm } from 'react-hook-form';
import { RiCloseLine } from '@remixicon/react';
import { useMonitors } from '../hooks/useMonitor';
import { useSelector } from 'react-redux';
import { useState } from 'react';

const AddMonitoring = ({ isOpen, onClose }) => {
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const { handleCreateMonitor } = useMonitors();
  const { isAuthenticated } = useSelector(state => state.auth);
  const [submitError, setSubmitError] = useState(null);

  if (!isOpen) return null;

  const onSubmit = async (data) => {
    setSubmitError(null);

    // Check if user is authenticated
    if (!isAuthenticated) {
      setSubmitError('You must be logged in to create a monitor');
      return;
    }

    try {
      await handleCreateMonitor(data);
      reset();
      onClose();
    } catch (error) {
      console.error("Error creating monitor:", error);
      setSubmitError(error.response?.data?.message || error.message || 'Failed to create monitor');
    }
  };



  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">Add New Monitor</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
            <RiCloseLine className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {submitError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {submitError}
            </div>
          )}
          <form id="add-monitor-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-gray-700">Type <span className="text-red-500">*</span></label>
                <select
                  {...register("type", { required: "Type is required" })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-gray-900 bg-white"
                >
                  <option value="http">HTTP/HTTPS</option>
                  <option value="tcp">TCP</option>
                  <option value="ping">Ping</option>
                </select>
                {errors.type && <span className="text-xs font-medium text-red-500">{errors.type.message}</span>}
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-gray-700">Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Primary API"
                  {...register("title", { required: "Title is required" })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-gray-400 text-gray-900"
                />
                {errors.title && <span className="text-xs font-medium text-red-500">{errors.title.message}</span>}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-gray-700">Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="e.g. API Server"
                {...register("name", { required: "Name is required" })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-gray-400 text-gray-900"
              />
              {errors.name && <span className="text-xs font-medium text-red-500">{errors.name.message}</span>}
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-gray-700">URL <span className="text-red-500">*</span></label>
              <input
                type="url"
                placeholder="https://api.example.com"
                {...register("url", { required: "URL is required" })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-gray-400 text-gray-900"
              />
              {errors.url && <span className="text-xs font-medium text-red-500">{errors.url.message}</span>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-gray-700">Interval (seconds) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  defaultValue={60}
                  {...register("interval", { required: "Interval is required", min: 10 })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-gray-900"
                />
                {errors.interval && <span className="text-xs font-medium text-red-500">{errors.interval.message}</span>}
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-gray-700">Timeout (seconds) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  defaultValue={10}
                  {...register("timeout", { required: "Timeout is required", min: 1 })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-gray-900"
                />
                {errors.timeout && <span className="text-xs font-medium text-red-500">{errors.timeout.message}</span>}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-gray-700">Description</label>
              <textarea
                rows="3"
                placeholder="Brief description of this monitor..."
                {...register("description")}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none placeholder:text-gray-400 text-gray-900"
              ></textarea>
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50 mt-auto">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-[13px] font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-monitor-form"
            className="px-4 py-2 text-[13px] font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Save Monitor
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddMonitoring;