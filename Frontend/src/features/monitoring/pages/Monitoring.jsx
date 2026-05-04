import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useMonitors } from "../hooks/useMonitor";
import { selectMonitors, selectLoading, selectError } from "../state/monitor.slice";
import AddMonitoring from "../components/AddMonitoring";
import { RiAddLine, RiDeleteBinLine, RiRefreshLine, RiMacbookLine } from "@remixicon/react";

const ConfirmDeleteModal = ({ isOpen, monitorName, onConfirm, onCancel, isDeleting }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Delete Monitor</h2>
          <p className="text-gray-600 text-sm mb-6">
            Are you sure you want to delete <span className="font-semibold">"{monitorName}"</span>? This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SuccessNotification = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-700 shadow-lg animate-in slide-in-from-top duration-300 z-40">
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getBadgeStyle = (status) => {
    if (!status) return "bg-gray-100 text-gray-700";
    const s = status.toUpperCase();
    if (s === "UP" || s === "HEALTHY") return "bg-emerald-100 text-emerald-700";
    if (s === "DOWN" || s === "FAILING") return "bg-red-100 text-red-700";
    if (s === "DEGRADED" || s === "WARNING") return "bg-orange-100 text-orange-700";
    if (s === "PENDING" || s === "ONGOING") return "bg-blue-100 text-blue-700";
    return "bg-gray-100 text-gray-700";
  };

  const timeAgo = (dateString) => {
    if (!dateString) return "Not checked yet";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return `Just now`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hrs ago`;
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
  };

  const handleDeleteClick = (monitorId, monitorName) => {
    setDeleteConfirm({ isOpen: true, monitorId, monitorName });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm.monitorId) return;

    try {
      setIsDeleting(true);
      console.log("Attempting to delete monitor with ID:", deleteConfirm.monitorId);
      await handleDeleteMonitor(deleteConfirm.monitorId);
      setSuccessMessage(`Monitor "${deleteConfirm.monitorName}" deleted successfully`);
      setDeleteConfirm({ isOpen: false, monitorId: null, monitorName: null });
    } catch (err) {
      console.error("Delete error:", err);
      // Error is handled by Redux, just close the modal
      setDeleteConfirm({ isOpen: false, monitorId: null, monitorName: null });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirm({ isOpen: false, monitorId: null, monitorName: null });
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Monitors
          </h1>
          <p className="text-[13px] text-gray-500 mt-1">
            Manage your website and API monitors.
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <RiAddLine className="w-4 h-4" /> Add Monitor
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-gray-900 tracking-tight flex items-center gap-2">
            <RiMacbookLine className="w-5 h-5 text-indigo-500" />
            All Monitors
          </h2>
          <button
            onClick={() => handleGetMonitors()}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
            title="Refresh"
            disabled={loading}
          >
            <RiRefreshLine className={`w-5 h-5 ${loading ? "animate-spin text-indigo-500" : ""}`} />
          </button>
        </div>

        <div className="overflow-x-auto min-h-[300px] relative">
          {loading && (!monitors || monitors.length === 0) ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <p className="text-sm text-gray-500 font-medium">Loading monitors...</p>
              </div>
            </div>
          ) : !monitors || monitors.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-gray-500">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <RiMacbookLine className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-[15px] font-medium text-gray-900 mb-1">No monitors found</p>
              <p className="text-sm mb-4">Get started by creating your first monitor.</p>
              <button
                onClick={() => setIsAddOpen(true)}
                className="text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-1.5 text-sm"
              >
                <RiAddLine className="w-4 h-4" /> Create Monitor
              </button>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Monitor Name
                  </th>
                  <th className="px-6 py-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Status
                  </th>
                  <th className="px-6 py-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Type
                  </th>
                  <th className="px-6 py-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Last Checked
                  </th>
                  <th className="px-6 py-4 border-b border-gray-100 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {monitors.map((m) => (
                  <tr key={m._id || m.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="text-[14px] font-semibold text-gray-900">
                        {m.title || m.name}
                      </p>
                      <p className="text-[12px] text-gray-500 mt-0.5 max-w-[250px] truncate" title={m.url}>
                        {m.url}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase ${getBadgeStyle(
                          m.status || "PENDING"
                        )}`}
                      >
                        {m.status || "PENDING"}
                      </span>
                      {m.lastStatusCode && (
                        <span className="ml-2 text-[11px] font-mono text-gray-400">
                          {m.lastStatusCode}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-[13px] text-gray-600 font-medium uppercase tracking-wide">
                      {m.type || "HTTP"}
                    </td>
                    <td className="px-6 py-4 text-[13px] text-gray-500">
                      {timeAgo(m.lastChecked)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteClick(m._id || m.id, m.title || m.name)}
                        className="text-gray-400 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Delete Monitor"
                        disabled={isDeleting}
                      >
                        <RiDeleteBinLine className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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