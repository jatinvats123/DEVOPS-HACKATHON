import React, { useEffect, useState } from "react";
import { useLogs } from "../hooks/useLogs";
import { useMonitors } from "../hooks/useMonitor";
import { useSelector } from "react-redux";
import { selectMonitors } from "../state/monitor.slice";
import { RiNotification3Line, RiRefreshLine, RiFileList3Line } from "@remixicon/react";

const Alerts = () => {
  const { logs, selectedLogs, loading, error, handleGetAllLogs, handleGetLogsByMonitorId } = useLogs();
  const { handleGetMonitors } = useMonitors();
  const monitors = useSelector(selectMonitors) || [];
  
  const [selectedMonitorId, setSelectedMonitorId] = useState("ALL");

  useEffect(() => {
    if (monitors.length === 0) {
      handleGetMonitors();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedMonitorId === "ALL") {
      handleGetAllLogs();
    } else {
      handleGetLogsByMonitorId(selectedMonitorId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonitorId]);

  const handleRefresh = () => {
    if (selectedMonitorId === "ALL") {
      handleGetAllLogs(true);
    } else {
      handleGetLogsByMonitorId(selectedMonitorId);
    }
  };

  const getMonitorName = (monitorId) => {
    // If monitorId is already an object (nested monitor), extract the title
    if (typeof monitorId === 'object' && monitorId !== null) {
      return monitorId.title || monitorId.name || 'Unknown Monitor';
    }
    
    // Otherwise, it's an ID string - find the monitor
    const monitor = monitors.find(m => (m._id || m.id) === monitorId);
    return monitor ? (monitor.title || monitor.name) : monitorId;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  const activeLogs = selectedMonitorId === "ALL" ? logs : selectedLogs;

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <RiNotification3Line className="w-6 h-6 text-indigo-600" />
            Alerts & Logs
          </h1>
          <p className="text-[13px] text-gray-500 mt-1">
            System logs, alerts, and monitor execution history.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Monitor Filter */}
          <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200 shadow-sm w-full sm:w-auto">
            <span className="text-[13px] font-semibold text-gray-700 pl-2 whitespace-nowrap">Filter:</span>
            <select 
              value={selectedMonitorId} 
              onChange={(e) => setSelectedMonitorId(e.target.value)}
              className="w-full sm:w-48 px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-gray-900 bg-gray-50/50"
            >
              <option value="ALL">All Monitors</option>
              {monitors.map(m => (
                <option key={m._id || m.id} value={m._id || m.id}>{m.title || m.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50 w-full sm:w-auto justify-center"
          >
            <RiRefreshLine className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 shadow-sm">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && activeLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-sm text-gray-500 font-medium">Fetching logs...</p>
        </div>
      ) : activeLogs.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl shadow-sm border border-gray-100 text-gray-500">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <RiFileList3Line className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-[15px] font-medium text-gray-900 mb-1">No logs found</p>
          <p className="text-sm">There is no history recorded yet.</p>
        </div>
      ) : (
        /* Logs List */
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">Timestamp</th>
                  <th className="px-6 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">Status</th>
                  <th className="px-6 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">Monitor</th>
                  <th className="px-6 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">Message / Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {activeLogs.map((log) => {
                  const status = (log.status || "").toUpperCase();
                  let statusBadge = "bg-gray-100 text-gray-700";
                  if (status === "UP" || status === "OK" || status === "RESOLVED") {
                    statusBadge = "bg-emerald-100 text-emerald-700";
                  } else if (status === "DOWN" || status === "ERROR" || status === "FAILING") {
                    statusBadge = "bg-red-100 text-red-700";
                  } else if (status === "ONGOING") {
                    statusBadge = "bg-orange-100 text-orange-700";
                  }

                  return (
                    <tr key={log._id || Math.random()} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-[13px] text-gray-500 whitespace-nowrap">
                        {formatDate(log.createdAt || log.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${statusBadge}`}>
                          {status || "LOG"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[13px] font-medium text-gray-900 whitespace-nowrap">
                        {getMonitorName(log.monitorId)}
                      </td>
                      <td className="px-6 py-4 text-[13px] text-gray-600 max-w-md truncate">
                        {typeof log.message === 'object' ? JSON.stringify(log.message) : (log.message || log.reason || "Execution recorded")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Alerts;