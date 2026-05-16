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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141413]/40 backdrop-blur-sm">
      <div className="bg-[#faf9f5] rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-300 border border-[#e6dfd8]">
        <div className="flex items-center justify-between px-10 py-8 border-b border-[#e6dfd8]">
          <h2 className="luxury-heading text-2xl">New Asset</h2>
          <button onClick={onClose} className="p-2 text-[#6c6a64] hover:text-[#cc785c] hover:bg-white rounded-full transition-all">
            <RiCloseLine className="w-6 h-6" />
          </button>
        </div>

        <div className="p-10 overflow-y-auto">
          {submitError && (
            <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
              {submitError}
            </div>
          )}
          <form id="add-monitor-form" onSubmit={handleSubmit(onSubmit)} className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="form-group">
                <label className="luxury-label">Asset Type</label>
                <select
                  {...register("type", { required: "Type is required" })}
                  className="luxury-input bg-transparent"
                >
                  <option value="http">HTTP / HTTPS</option>
                  <option value="tcp">TCP Protocol</option>
                  <option value="ping">ICMP Ping</option>
                </select>
                {errors.type && <span className="text-xs text-red-400 mt-2">{errors.type.message}</span>}
              </div>

              <div className="form-group">
                <label className="luxury-label">Asset Label</label>
                <input
                  type="text"
                  placeholder="e.g. Production Cluster"
                  {...register("title", { required: "Title is required" })}
                  className="luxury-input"
                />
                {errors.title && <span className="text-xs text-red-400 mt-2">{errors.title.message}</span>}
              </div>
            </div>

            <div className="form-group">
              <label className="luxury-label">Internal Name</label>
              <input
                type="text"
                placeholder="e.g. api-server-v1"
                {...register("name", { required: "Name is required" })}
                className="luxury-input"
              />
              {errors.name && <span className="text-xs text-red-400 mt-2">{errors.name.message}</span>}
            </div>

            <div className="form-group">
              <label className="luxury-label">Resource Identifier (URL)</label>
              <input
                type="url"
                placeholder="https://api.acme.com/health"
                {...register("url", { required: "URL is required" })}
                className="luxury-input"
              />
              {errors.url && <span className="text-xs text-red-400 mt-2">{errors.url.message}</span>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="form-group">
                <label className="luxury-label">Check Frequency (Seconds)</label>
                <input
                  type="number"
                  defaultValue={60}
                  {...register("interval", { required: "Interval is required", min: 10 })}
                  className="luxury-input"
                />
                {errors.interval && <span className="text-xs text-red-400 mt-2">{errors.interval.message}</span>}
              </div>

              <div className="form-group">
                <label className="luxury-label">Latency Timeout (Seconds)</label>
                <input
                  type="number"
                  defaultValue={10}
                  {...register("timeout", { required: "Timeout is required", min: 1 })}
                  className="luxury-input"
                />
                {errors.timeout && <span className="text-xs text-red-400 mt-2">{errors.timeout.message}</span>}
              </div>
            </div>

            <div className="form-group">
              <label className="luxury-label">Contextual Notes</label>
              <textarea
                rows="3"
                placeholder="Technical details or maintenance context..."
                {...register("description")}
                className="luxury-input resize-none"
              ></textarea>
            </div>
          </form>
        </div>

        <div className="px-10 py-8 border-t border-[#e6dfd8] flex items-center justify-end gap-6 bg-[#f5f0e8]/30 mt-auto">
          <button
            type="button"
            onClick={onClose}
            className="luxury-button-outline px-8"
          >
            Discard
          </button>
          <button
            type="submit"
            form="add-monitor-form"
            className="luxury-button-primary px-8"
          >
            Authorize Asset
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddMonitoring;