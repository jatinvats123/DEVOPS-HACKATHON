import React, { useEffect } from "react";
import { useIncident } from "../hooks/useIncident";
import { RiAlertLine, RiRobot2Line, RiTimeLine, RiRefreshLine } from "@remixicon/react";

const Incidents = () => {
  const { incidents, loading, error, handleGetAllIncidents } = useIncident();

  // On mount: call handleGetAllIncidents
  useEffect(() => {
    handleGetAllIncidents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <RiAlertLine className="w-6 h-6 text-indigo-600" />
            All Incidents
          </h1>
          <p className="text-[13px] text-gray-500 mt-1">
            Global view of past and ongoing incidents across all monitors.
          </p>
        </div>
        
        <button
          onClick={() => handleGetAllIncidents(true)}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RiRefreshLine className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 shadow-sm">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && incidents.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-sm text-gray-500 font-medium">Fetching global incidents...</p>
        </div>
      ) : incidents.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl shadow-sm border border-gray-100 text-gray-500">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
            <RiAlertLine className="w-8 h-8 text-emerald-500" />
          </div>
          <p className="text-[15px] font-medium text-gray-900 mb-1">No incidents found</p>
          <p className="text-sm">Your infrastructure has a clean record.</p>
        </div>
      ) : (
        /* Incidents List */
        <div className="space-y-4">
          {incidents.map((incident) => (
            <div key={incident._id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:border-gray-200 transition-all duration-200">
              
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between bg-gray-50/30 gap-3">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase ${incident.status === 'ONGOING' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                    {incident.status || 'UNKNOWN'}
                  </span>
                  <h3 className="text-[15px] font-semibold text-gray-900">
                    {incident.reason || "Outage detected"}
                  </h3>
                </div>
                
                <div className="flex items-center gap-4 text-[12px] font-medium text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <RiTimeLine className="w-4 h-4 text-gray-400" />
                    <span>Duration: {incident.duration ? `${incident.duration}s` : 'Ongoing'}</span>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Start Time</p>
                    <p className="text-[13px] text-gray-900 font-medium">{formatDate(incident.startTime)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">End Time</p>
                    <p className="text-[13px] text-gray-900 font-medium">{incident.endTime ? formatDate(incident.endTime) : 'N/A'}</p>
                  </div>
                </div>

                {/* AI Summary */}
                {incident.aiSummary && (
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-4 flex gap-3">
                    <RiRobot2Line className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[12px] font-semibold text-indigo-900 mb-1">AI Root Cause Analysis</p>
                      <p className="text-[13px] text-indigo-800/80 leading-relaxed whitespace-pre-wrap">
                        {incident.aiSummary}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Incidents;