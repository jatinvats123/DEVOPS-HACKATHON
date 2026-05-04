import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { useStatus } from "../hooks/useStatus";
import { selectMonitors } from "../state/monitor.slice";
import { useDashboardInit } from "../hooks/useDashboardInit";
import { RiHeartPulseLine, RiCheckboxCircleLine, RiCloseCircleLine, RiTimeLine } from "@remixicon/react";

const StatusPages = () => {
  // Ensure monitors are loaded if we navigated directly here
  useDashboardInit();
  
  const monitors = useSelector(selectMonitors) || [];
  const { statusData, loading, error, handleGetMonitorStatus } = useStatus();

  // Fetch status for all monitors
  useEffect(() => {
    if (monitors.length > 0) {
      monitors.forEach((monitor) => {
        handleGetMonitorStatus(monitor._id || monitor.id);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monitors]);

  const formatDate = (dateString) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-gray-50">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <RiHeartPulseLine className="w-6 h-6 text-indigo-600" />
          System Status
        </h1>
        <p className="text-[13px] text-gray-500 mt-1">
          Real-time health overview derived from active monitor logs.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 shadow-sm">
          {error}
        </div>
      )}

      {loading && Object.keys(statusData).length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-sm text-gray-500 font-medium">Fetching health data...</p>
        </div>
      ) : monitors.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl shadow-sm border border-gray-100 text-gray-500">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <RiHeartPulseLine className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-[15px] font-medium text-gray-900 mb-1">No monitors configured</p>
          <p className="text-sm">Create a monitor to view its real-time status.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {monitors.map((monitor) => {
            const monitorId = monitor._id || monitor.id;
            const data = statusData[monitorId];
            
            // Default to PENDING while data is being fetched
            const currentStatus = data ? data.status : "PENDING";
            const lastChecked = data ? data.lastChecked : null;
            
            let statusColor = "bg-gray-100 border-gray-200 text-gray-600";
            let StatusIcon = RiTimeLine;
            let statusLabel = "Pending";

            if (currentStatus === "UP") {
              statusColor = "bg-emerald-50 border-emerald-100 text-emerald-700";
              StatusIcon = RiCheckboxCircleLine;
              statusLabel = "Operational";
            } else if (currentStatus === "DOWN") {
              statusColor = "bg-red-50 border-red-100 text-red-700";
              StatusIcon = RiCloseCircleLine;
              statusLabel = "Outage";
            }

            return (
              <div 
                key={monitorId} 
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col"
              >
                <div className={`px-5 py-3 border-b flex items-center gap-2 ${statusColor}`}>
                  <StatusIcon className="w-5 h-5 shrink-0" />
                  <span className="font-semibold text-sm uppercase tracking-wide">
                    {statusLabel}
                  </span>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="text-lg font-bold text-gray-900 truncate mb-1" title={monitor.title || monitor.name}>
                    {monitor.title || monitor.name}
                  </h3>
                  <p className="text-sm text-gray-500 truncate mb-6" title={monitor.url}>
                    {monitor.url}
                  </p>
                  
                  <div className="mt-auto">
                    <div className="flex justify-between items-end border-t border-gray-100 pt-4 mt-4">
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Last Checked</p>
                        <p className="text-xs text-gray-600 font-medium">
                          {formatDate(lastChecked)}
                        </p>
                      </div>
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        {monitor.type || "HTTP"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StatusPages;