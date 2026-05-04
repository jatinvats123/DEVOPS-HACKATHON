import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useMonitors } from "../hooks/useMonitor";
import { selectMonitors, selectLoading, selectError } from "../state/monitor.slice";
import AddMonitoring from "../components/AddMonitoring";
import { RiAddLine, RiDeleteBinLine, RiRefreshLine } from "@remixicon/react";

const ConfirmDeleteModal = ({ isOpen, monitorName, onConfirm, onCancel, isDeleting }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#141413]/40 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
      <div className="bg-[#faf9f5] border border-[#e6dfd8] max-w-sm w-full rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-8 lg:p-10">
          <h2 className="luxury-heading text-2xl mb-4">Are you sure?</h2>
          <p className="text-[#6c6a64] text-sm mb-10 leading-relaxed">
            Removing <span className="text-[#141413] font-medium">"{monitorName}"</span> from the registry will permanently delete its history.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="luxury-button-primary w-full"
            >
              {isDeleting ? "Deleting..." : "Delete Asset"}
            </button>
            <button
              onClick={onCancel}
              disabled={isDeleting}
              className="luxury-button-outline w-full"
            >
              Keep it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SuccessNotification = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 sm:left-auto sm:right-8 sm:translate-x-0 bg-[#141413] text-white rounded-xl px-8 py-4 text-sm font-medium shadow-2xl animate-in slide-in-from-bottom duration-300 z-40 flex items-center gap-3">
      <div className="w-2 h-2 rounded-full bg-[#cc785c]"></div>
      {message}
    </div>
  );
};

const Monitoring = () => {
  const { handleGetMonitors, handleDeleteMonitor } = useMonitors();
  const monitors = useSelector(selectMonitors);
  const loading = useSelector(selectLoading);
  const error = useSelector(selectError);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, monitorId: null, monitorName: null });
  const [isDeleting, setIsDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    handleGetMonitors();
  }, []);

  const timeAgo = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return `Just now`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const handleDeleteClick = (monitorId, monitorName) => {
    setDeleteConfirm({ isOpen: true, monitorId, monitorName });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm.monitorId) return;
    try {
      setIsDeleting(true);
      await handleDeleteMonitor(deleteConfirm.monitorId);
      setSuccessMessage(`Registry entry removed successfully`);
      setDeleteConfirm({ isOpen: false, monitorId: null, monitorName: null });
    } catch (err) {
      console.error("Delete error:", err);
      setDeleteConfirm({ isOpen: false, monitorId: null, monitorName: null });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirm({ isOpen: false, monitorId: null, monitorName: null });
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-12 luxury-container">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 lg:mb-16 gap-6">
        <div>
          <h1 className="luxury-heading text-3xl lg:text-4xl">
            Registry
          </h1>
          <p className="luxury-subtext mt-3 max-w-md">
            Manage your infrastructure monitoring assets and service endpoints.
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="luxury-button-primary flex items-center gap-3 px-8 w-full sm:w-auto justify-center"
        >
          <RiAddLine className="w-5 h-5" /> Add Asset
        </button>
      </div>

      {error && (
        <div className="mb-10 p-6 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white border border-[#e6dfd8] rounded-2xl shadow-sm p-6 lg:p-10 overflow-hidden">
        <div className="flex items-center justify-between mb-8 lg:mb-12">
          <h2 className="luxury-heading text-xl lg:text-2xl">
            Current Assets
          </h2>
          <button
            onClick={() => handleGetMonitors()}
            className="text-[#6c6a64] hover:text-[#cc785c] transition-colors"
            disabled={loading}
          >
            <RiRefreshLine className={`w-6 h-6 ${loading ? "animate-spin text-[#cc785c]" : ""}`} />
          </button>
        </div>

        <div className="overflow-x-auto -mx-6 lg:mx-0 min-h-[300px] relative">
          <div className="inline-block min-w-full align-middle px-6 lg:px-0">
            {loading && (!monitors || monitors.length === 0) ? (
              <div className="absolute inset-0 flex items-center justify-center bg-[#faf9f5]/60 z-10">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#cc785c]"></div>
              </div>
            ) : !monitors || monitors.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-center">
                <p className="luxury-subtext mb-10 text-lg">Registry is currently empty</p>
                <button
                  onClick={() => setIsAddOpen(true)}
                  className="luxury-button-outline px-10"
                >
                  Create First Entry
                </button>
              </div>
            ) : (
              <table className="luxury-table">
                <thead>
                  <tr>
                    <th>Asset / Endpoint</th>
                    <th>Status</th>
                    <th className="hidden md:table-cell">Last Check</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {monitors.map((m) => (
                    <tr key={m._id || m.id} className="group hover:bg-[#faf9f5] transition-colors">
                      <td>
                        <p className="font-semibold text-[#141413] truncate max-w-[150px] sm:max-w-xs lg:max-w-md">
                          {m.title || m.name}
                        </p>
                        <p className="text-xs text-[#6c6a64] mt-1 font-mono truncate max-w-[150px] sm:max-w-xs lg:max-w-md">
                          {m.url}
                        </p>
                      </td>
                      <td>
                        <span className={`luxury-badge ${m.status === 'UP' ? 'bg-[#cc785c]/10 text-[#cc785c]' : 'bg-[#3d3d3a]/10 text-[#3d3d3a]'}`}>
                          {m.status || "PENDING"}
                        </span>
                      </td>
                      <td className="text-sm text-[#6c6a64] hidden md:table-cell">
                        {timeAgo(m.lastChecked)}
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => handleDeleteClick(m._id || m.id, m.title || m.name)}
                          className="text-[#e6dfd8] group-hover:text-[#cc785c] transition-colors p-2"
                          disabled={isDeleting}
                        >
                          <RiDeleteBinLine className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <AddMonitoring isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />

      <ConfirmDeleteModal
        isOpen={deleteConfirm.isOpen}
        monitorName={deleteConfirm.monitorName}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isDeleting={isDeleting}
      />

      {successMessage && (
        <SuccessNotification
          message={successMessage}
          onClose={() => setSuccessMessage(null)}
        />
      )}
    </div>
  );
};

export default Monitoring;